const mongoose = require('mongoose');
const HttpError = require('./HttpError');

// Un id con formato inválido es un body/parámetro inválido: 400
function assertValidId(id, label = 'id') {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(400, `${label} inválido`);
}

// Busca por id y responde 404 si no existe
async function findOrFail(Model, id, label = 'Recurso') {
  assertValidId(id);
  const doc = await Model.findById(id);
  if (!doc) throw new HttpError(404, `${label} no encontrado`);
  return doc;
}

module.exports = { assertValidId, findOrFail };
