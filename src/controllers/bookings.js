const Booking = require('../models/Booking');
const Musician = require('../models/Musician');
const Loan = require('../models/Loan');
const HttpError = require('../utils/HttpError');
const paginate = require('../utils/paginate');
const { assertValidId, findOrFail } = require('../utils/validateId');

function parseDate(value, label) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new HttpError(400, `${label} debe tener formato YYYY-MM-DD`);
  return date;
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
  const musicians = await Musician.find({ band: booking.band._id, active: true });
  const loans = await Loan.find({ booking: booking._id }).populate('equipment');
  res.json({ ...booking.toJSON(), band: { ...booking.band.toJSON(), musicians }, loans });
};

// TODO (compañero): create, update y cancel con reglas de negocio y transacción

// Cuenta reservas por estado
exports.stats = async (req, res) => {
  const stats = await Booking.aggregate([
    { $group: { _id: '$status', total: { $sum: 1 } } },
    { $project: { _id: 0, status: '$_id', total: 1 } },
    { $sort: { status: 1 } },
  ]);
  res.json(stats);
};
