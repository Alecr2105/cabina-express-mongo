const Equipment = require('../models/Equipment');
const HttpError = require('../utils/HttpError');
const paginate = require('../utils/paginate');
const pick = require('../utils/pick');
const { findOrFail } = require('../utils/validateId');

exports.create = async (req, res) => {
  // availableUnits no se recibe: empieza igual a totalUnits
  const equipment = await Equipment.create(pick(req.body, ['name', 'category', 'totalUnits']));
  res.status(201).json(equipment);
};

// Filtra por category y por disponibles (available=true => availableUnits > 0)
exports.list = async (req, res) => {
  const filter = {};
  if (req.query.category !== undefined) filter.category = req.query.category;
  if (req.query.available === 'true') filter.availableUnits = { $gt: 0 };
  const result = await paginate(Equipment, req.query, {
    sortFields: ['name', 'availableUnits', 'createdAt'],
    defaultSort: { name: 1 },
    searchFields: ['name'],
    filter,
  });
  res.json(result);
};

exports.get = async (req, res) => {
  res.json(await findOrFail(Equipment, req.params.id, 'Equipo'));
};

// availableUnits no se toca aquí: solo cambia dentro de las transacciones de reservas
exports.update = async (req, res) => {
  const equipment = await findOrFail(Equipment, req.params.id, 'Equipo');
  const data = pick(req.body, ['name', 'category', 'totalUnits']);
  if (data.totalUnits !== undefined) {
    const lent = equipment.totalUnits - equipment.availableUnits;
    if (Number.isInteger(data.totalUnits) && data.totalUnits < lent) {
      throw new HttpError(409, `totalUnits no puede ser menor que las unidades prestadas (${lent})`);
    }
    if (Number.isInteger(data.totalUnits)) equipment.availableUnits = data.totalUnits - lent;
  }
  equipment.set(data);
  await equipment.save();
  res.json(equipment);
};

exports.remove = async (req, res) => {
  const equipment = await findOrFail(Equipment, req.params.id, 'Equipo');
  if (equipment.availableUnits < equipment.totalUnits) {
    throw new HttpError(409, 'El equipo tiene unidades prestadas');
  }
  await equipment.deleteOne();
  res.json({ message: 'Equipo eliminado' });
};

// Por categoría, unidades totales y disponibles
exports.stats = async (req, res) => {
  const stats = await Equipment.aggregate([
    {
      $group: {
        _id: '$category',
        totalUnits: { $sum: '$totalUnits' },
        availableUnits: { $sum: '$availableUnits' },
      },
    },
    { $project: { _id: 0, category: '$_id', totalUnits: 1, availableUnits: 1 } },
    { $sort: { category: 1 } },
  ]);
  res.json(stats);
};
