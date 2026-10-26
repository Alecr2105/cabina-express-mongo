const Musician = require('../models/Musician');
const Band = require('../models/Band');
const paginate = require('../utils/paginate');
const pick = require('../utils/pick');
const { assertValidId, findOrFail } = require('../utils/validateId');

const FIELDS = ['name', 'instrument', 'email', 'band', 'active'];

exports.create = async (req, res) => {
  const data = pick(req.body, FIELDS);
  if (data.band !== undefined) await findOrFail(Band, data.band, 'Banda');
  const musician = await Musician.create(data);
  res.status(201).json(musician);
};

// Filtra por band y active
exports.list = async (req, res) => {
  const filter = {};
  if (req.query.band !== undefined) {
    assertValidId(req.query.band, 'band');
    filter.band = req.query.band;
  }
  if (req.query.active !== undefined) filter.active = req.query.active === 'true';
  const result = await paginate(Musician, req.query, {
    sortFields: ['name', 'instrument', 'createdAt'],
    defaultSort: { name: 1 },
    searchFields: ['name', 'email'],
    filter,
  });
  res.json(result);
};

// El detalle muestra la banda
exports.get = async (req, res) => {
  const musician = await findOrFail(Musician, req.params.id, 'Músico');
  res.json(await musician.populate('band'));
};

exports.update = async (req, res) => {
  const musician = await findOrFail(Musician, req.params.id, 'Músico');
  const data = pick(req.body, FIELDS);
  if (data.band !== undefined) await findOrFail(Band, data.band, 'Banda');
  musician.set(data);
  await musician.save();
  res.json(musician);
};

exports.remove = async (req, res) => {
  const musician = await findOrFail(Musician, req.params.id, 'Músico');
  await musician.deleteOne();
  res.json({ message: 'Músico eliminado' });
};
