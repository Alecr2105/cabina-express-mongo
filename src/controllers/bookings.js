const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const Band = require('../models/Band');
const Musician = require('../models/Musician');
const Equipment = require('../models/Equipment');
const Loan = require('../models/Loan');
const HttpError = require('../utils/HttpError');
const paginate = require('../utils/paginate');
const pick = require('../utils/pick');
const { assertValidId, findOrFail } = require('../utils/validateId');

const ACTIVE = ['apartada', 'confirmada'];

function parseDate(value, label) {
  const date = new Date(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(date.getTime())) {
    throw new HttpError(400, `${label} debe tener formato YYYY-MM-DD`);
  }
  return date;
}

// Fecha de hoy a las 00:00 UTC, igual que se guardan las fechas de las reservas
function today() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

// Reglas que se revisan al crear y al actualizar horario, sala o banda
async function checkRules({ room, band, date, startHour, endHour }, session, excludeId) {
  if (!Number.isInteger(startHour) || !Number.isInteger(endHour)) {
    throw new HttpError(400, 'startHour y endHour deben ser enteros');
  }
  if (endHour <= startHour) throw new HttpError(409, 'endHour debe ser mayor que startHour');
  if (endHour - startHour > 3) throw new HttpError(409, 'La reserva dura como máximo 3 horas');
  if (date < today()) throw new HttpError(409, 'La fecha debe ser hoy o un día posterior');

  assertValidId(room, 'room');
  assertValidId(band, 'band');

  const roomDoc = await Room.findById(room).session(session);
  if (!roomDoc) throw new HttpError(404, 'Sala no encontrada');
  if (roomDoc.status !== 'disponible') throw new HttpError(409, 'La sala está en mantenimiento');

  const bandDoc = await Band.findById(band).session(session);
  if (!bandDoc) throw new HttpError(404, 'Banda no encontrada');
  if (!bandDoc.active) throw new HttpError(409, 'La banda no está activa');

  const musicians = await Musician.countDocuments({ band, active: true }).session(session);
  if (musicians === 0) throw new HttpError(409, 'La banda no tiene músicos activos');
  if (musicians > roomDoc.capacity) {
    throw new HttpError(409, `La banda tiene ${musicians} músicos activos y la sala admite ${roomDoc.capacity}`);
  }

  // Se cruzan si el inicio pedido es menor que el fin de la otra y el fin pedido mayor que su inicio
  const overlap = {
    room,
    date,
    status: { $in: ACTIVE },
    startHour: { $lt: endHour },
    endHour: { $gt: startHour },
  };
  if (excludeId) overlap._id = { $ne: excludeId };
  if (await Booking.exists(overlap).session(session)) {
    throw new HttpError(409, 'La sala ya tiene una reserva en ese horario');
  }
}

function readEquipment(list) {
  if (list === undefined) return [];
  if (!Array.isArray(list)) throw new HttpError(400, 'equipment debe ser un arreglo');
  const seen = new Set();
  for (const line of list) {
    assertValidId(line && line.equipmentId, 'equipmentId');
    if (!Number.isInteger(line.units) || line.units < 1) {
      throw new HttpError(400, 'units debe ser un entero mayor que 0');
    }
    if (seen.has(String(line.equipmentId))) {
      throw new HttpError(409, 'No se puede pedir dos veces el mismo equipo');
    }
    seen.add(String(line.equipmentId));
  }
  return list;
}

// Cancela la reserva, devuelve los préstamos y regresa las unidades al inventario
async function cancelBooking(id) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await Booking.updateOne({ _id: id }, { status: 'cancelada' }, { session });
      const loans = await Loan.find({ booking: id, status: 'prestado' }).session(session);
      for (const loan of loans) {
        await Equipment.updateOne({ _id: loan.equipment }, { $inc: { availableUnits: loan.units } }, { session });
      }
      await Loan.updateMany({ booking: id, status: 'prestado' }, { status: 'devuelto' }, { session });
    });
  } finally {
    await session.endSession();
  }
}

// Filtra por status, room, band, date, from y to
exports.list = async (req, res) => {
  const { status, room, band, date, from, to } = req.query;
  const filter = {};
  if (status !== undefined) filter.status = status;
  if (room !== undefined) {
    assertValidId(room, 'room');
    filter.room = room;
  }
  if (band !== undefined) {
    assertValidId(band, 'band');
    filter.band = band;
  }
  if (date !== undefined) filter.date = parseDate(date, 'date');
  if (from !== undefined || to !== undefined) {
    filter.date = {};
    if (from !== undefined) filter.date.$gte = parseDate(from, 'from');
    if (to !== undefined) filter.date.$lte = parseDate(to, 'to');
  }
  const result = await paginate(Booking, req.query, {
    sortFields: ['date', 'startHour', 'createdAt'],
    defaultSort: { date: 1, startHour: 1 },
    searchFields: ['notes'],
    filter,
    populate: [
      { path: 'room', select: 'name capacity status' },
      { path: 'band', select: 'name genre' },
    ],
  });
  res.json(result);
};

// El detalle trae sala, banda con sus músicos activos y préstamos con su equipo
exports.get = async (req, res) => {
  const booking = await findOrFail(Booking, req.params.id, 'Reserva');
  await booking.populate([
    { path: 'room', select: 'name capacity status' },
    { path: 'band', select: 'name genre' },
  ]);
  const loans = await Loan.find({ booking: booking._id }).populate('equipment');
  let band = null;
  if (booking.band) {
    const musicians = await Musician.find({ band: booking.band._id, active: true });
    band = { ...booking.band.toJSON(), musicians };
  }
  res.json({ ...booking.toJSON(), band, loans });
};

exports.create = async (req, res) => {
  const data = pick(req.body, ['room', 'band', 'date', 'startHour', 'endHour', 'notes']);
  if (data.date === undefined) throw new HttpError(400, 'date es obligatorio');
  data.date = parseDate(data.date, 'date');
  const equipment = readEquipment(req.body.equipment);

  const session = await mongoose.startSession();
  let booking;
  let loans;
  try {
    await session.withTransaction(async () => {
      await checkRules(data, session);

      for (const line of equipment) {
        const item = await Equipment.findById(line.equipmentId).session(session);
        if (!item) throw new HttpError(404, 'Equipo no encontrado');
        if (line.units > item.availableUnits) {
          throw new HttpError(409, `No hay suficientes unidades de ${item.name} (disponibles: ${item.availableUnits})`);
        }
      }

      [booking] = await Booking.create([data], { session });

      loans = [];
      for (const line of equipment) {
        const [loan] = await Loan.create(
          [{ booking: booking._id, equipment: line.equipmentId, units: line.units, status: 'prestado' }],
          { session }
        );
        await Equipment.updateOne(
          { _id: line.equipmentId },
          { $inc: { availableUnits: -line.units } },
          { session }
        );
        loans.push(loan);
      }
    });
  } finally {
    await session.endSession();
  }
  res.status(201).json({ ...booking.toJSON(), loans });
};

// Actualizar horario, sala o banda vuelve a revisar las reglas. El equipo no se cambia aquí.
exports.update = async (req, res) => {
  const booking = await findOrFail(Booking, req.params.id, 'Reserva');
  const data = pick(req.body, ['room', 'band', 'date', 'startHour', 'endHour', 'notes', 'status']);

  if (data.status !== undefined && !['apartada', 'confirmada', 'cancelada'].includes(data.status)) {
    throw new HttpError(400, 'status debe ser apartada, confirmada o cancelada');
  }
  if (booking.status === 'cancelada') {
    throw new HttpError(409, 'Una reserva cancelada no se puede modificar');
  }
  if (booking.status === 'confirmada' && data.status === 'apartada') {
    throw new HttpError(409, 'Una reserva confirmada no puede volver a apartada');
  }

  if (data.date !== undefined) data.date = parseDate(data.date, 'date');

  const cancel = data.status === 'cancelada';
  const changesSchedule = ['room', 'band', 'date', 'startHour', 'endHour'].some((f) => data[f] !== undefined);
  if (changesSchedule && !cancel) {
    await checkRules(
      {
        room: data.room ?? booking.room,
        band: data.band ?? booking.band,
        date: data.date ?? booking.date,
        startHour: data.startHour ?? booking.startHour,
        endHour: data.endHour ?? booking.endHour,
      },
      null,
      booking._id
    );
  }

  if (cancel) {
    delete data.status;
    booking.set(data);
    await booking.save();
    await cancelBooking(booking._id);
  } else {
    booking.set(data);
    await booking.save();
  }
  res.json(await Booking.findById(booking._id));
};

exports.cancel = async (req, res) => {
  const booking = await findOrFail(Booking, req.params.id, 'Reserva');
  if (booking.status === 'cancelada') throw new HttpError(409, 'La reserva ya está cancelada');
  await cancelBooking(booking._id);
  const updated = await Booking.findById(booking._id);
  const loans = await Loan.find({ booking: booking._id });
  res.json({ ...updated.toJSON(), loans });
};

// Cuenta reservas por estado
exports.stats = async (req, res) => {
  const stats = await Booking.aggregate([
    { $group: { _id: '$status', total: { $sum: 1 } } },
    { $project: { _id: 0, status: '$_id', total: 1 } },
    { $sort: { status: 1 } },
  ]);
  res.json(stats);
};
