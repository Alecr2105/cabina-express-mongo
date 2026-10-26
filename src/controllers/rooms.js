const Room = require('../models/Room');
const Booking = require('../models/Booking');
const HttpError = require('../utils/HttpError');
const paginate = require('../utils/paginate');
const pick = require('../utils/pick');
const { findOrFail } = require('../utils/validateId');

const FIELDS = ['name', 'capacity', 'floor', 'hasDrumKit', 'status'];

exports.create = async (req, res) => {
  const room = await Room.create(pick(req.body, FIELDS));
  res.status(201).json(room);
};

exports.list = async (req, res) => {
  const result = await paginate(Room, req.query, {
    sortFields: ['name', 'capacity', 'floor', 'createdAt'],
    defaultSort: { name: 1 },
    searchFields: ['name'],
  });
  res.json(result);
};

exports.get = async (req, res) => {
  res.json(await findOrFail(Room, req.params.id, 'Sala'));
};

exports.update = async (req, res) => {
  const room = await findOrFail(Room, req.params.id, 'Sala');
  room.set(pick(req.body, FIELDS));
  await room.save();
  res.json(room);
};

exports.remove = async (req, res) => {
  const room = await findOrFail(Room, req.params.id, 'Sala');
  const active = await Booking.exists({ room: room._id, status: { $in: ['apartada', 'confirmada'] } });
  if (active) throw new HttpError(409, 'La sala tiene reservas apartadas o confirmadas');
  await room.deleteOne();
  res.json({ message: 'Sala eliminada' });
};

// GET /api/rooms/:id/schedule?date=YYYY-MM-DD
exports.schedule = async (req, res) => {
  const room = await findOrFail(Room, req.params.id, 'Sala');
  const date = new Date(req.query.date);
  if (!req.query.date || Number.isNaN(date.getTime())) {
    throw new HttpError(400, 'date es obligatorio con formato YYYY-MM-DD');
  }
  const bookings = await Booking.find({ room: room._id, date }).sort({ startHour: 1 }).populate('band');
  res.json(bookings);
};

// Por sala, cuántas reservas activas (apartada o confirmada) tiene
exports.stats = async (req, res) => {
  const stats = await Room.aggregate([
    {
      $lookup: {
        from: 'bookings',
        let: { roomId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$room', '$$roomId'] }, status: { $in: ['apartada', 'confirmada'] } } },
        ],
        as: 'active',
      },
    },
    { $project: { _id: 0, room: '$_id', name: 1, activeBookings: { $size: '$active' } } },
    { $sort: { name: 1 } },
  ]);
  res.json(stats);
};
