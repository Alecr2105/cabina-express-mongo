const Band = require('../models/Band');
const Musician = require('../models/Musician');
const Booking = require('../models/Booking');
const HttpError = require('../utils/HttpError');
const paginate = require('../utils/paginate');
const pick = require('../utils/pick');
const { findOrFail } = require('../utils/validateId');

const FIELDS = ['name', 'genre', 'active', 'contactName'];

exports.create = async (req, res) => {
  const band = await Band.create(pick(req.body, FIELDS));
  res.status(201).json(band);
};

exports.list = async (req, res) => {
  const result = await paginate(Band, req.query, {
    sortFields: ['name', 'createdAt'],
    defaultSort: { name: 1 },
    searchFields: ['name'],
  });
  res.json(result);
};

// El detalle incluye los músicos de la banda
exports.get = async (req, res) => {
  const band = await findOrFail(Band, req.params.id, 'Banda');
  const musicians = await Musician.find({ band: band._id });
  res.json({ ...band.toJSON(), musicians });
};

exports.update = async (req, res) => {
  const band = await findOrFail(Band, req.params.id, 'Banda');
  band.set(pick(req.body, FIELDS));
  await band.save();
  res.json(band);
};

exports.remove = async (req, res) => {
  const band = await findOrFail(Band, req.params.id, 'Banda');
  const active = await Booking.exists({ band: band._id, status: { $in: ['apartada', 'confirmada'] } });
  if (active) throw new HttpError(409, 'La banda tiene reservas apartadas o confirmadas');
  if (await Musician.exists({ band: band._id })) throw new HttpError(409, 'La banda todavía tiene músicos');
  await band.deleteOne();
  res.json({ message: 'Banda eliminada' });
};

exports.musicians = async (req, res) => {
  const band = await findOrFail(Band, req.params.id, 'Banda');
  res.json(await Musician.find({ band: band._id }).sort({ name: 1 }));
};

// Las reservas de la banda incluyen la sala
exports.bookings = async (req, res) => {
  const band = await findOrFail(Band, req.params.id, 'Banda');
  res.json(await Booking.find({ band: band._id }).sort({ date: 1, startHour: 1 }).populate('room'));
};
