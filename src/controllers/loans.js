const Loan = require('../models/Loan');
const paginate = require('../utils/paginate');
const { assertValidId, findOrFail } = require('../utils/validateId');

// Solo lectura: los préstamos nacen dentro de la transacción de la reserva
exports.list = async (req, res) => {
  const filter = {};
  for (const f of ['status', 'booking', 'equipment']) {
    if (req.query[f] === undefined) continue;
    if (f !== 'status') assertValidId(req.query[f], f);
    filter[f] = req.query[f];
  }
  const result = await paginate(Loan, req.query, {
    sortFields: ['units', 'createdAt'],
    defaultSort: { createdAt: 1 },
    searchFields: ['status'],
    filter,
  });
  res.json(result);
};

// El detalle trae la reserva y el equipo
exports.get = async (req, res) => {
  const loan = await findOrFail(Loan, req.params.id, 'Préstamo');
  res.json(await loan.populate(['booking', 'equipment']));
};
