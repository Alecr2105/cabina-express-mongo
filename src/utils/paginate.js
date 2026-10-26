const HttpError = require('./HttpError');

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\]/g, '\$&');
}

/**
 * Listado con page, limit, sort y search.
 * options: { sortFields, defaultSort, searchFields, filter, populate }
 * El filtro y la búsqueda se aplican antes de paginar, así total solo cuenta lo que entra.
 */
async function paginate(Model, query, options) {
  const { sortFields, defaultSort, searchFields = [], filter = {}, populate } = options;

  const page = query.page === undefined ? 1 : Number(query.page);
  const limit = query.limit === undefined ? 10 : Number(query.limit);
  if (!Number.isInteger(page) || page < 1) throw new HttpError(400, 'page debe ser un entero mayor o igual a 1');
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw new HttpError(400, 'limit debe ser un entero entre 1 y 50');
  }

  let sort = defaultSort;
  if (query.sort !== undefined) {
    const desc = String(query.sort).startsWith('-');
    const field = String(query.sort).replace(/^-/, '');
    if (!sortFields.includes(field)) {
      throw new HttpError(400, `sort inválido. Campos permitidos: ${sortFields.join(', ')}`);
    }
    sort = { [field]: desc ? -1 : 1 };
  }

  const finalFilter = { ...filter };
  if (query.search && searchFields.length) {
    const regex = new RegExp(escapeRegex(String(query.search)), 'i');
    finalFilter.$or = searchFields.map((f) => ({ [f]: regex }));
  }

  const total = await Model.countDocuments(finalFilter);
  let find = Model.find(finalFilter).sort(sort).skip((page - 1) * limit).limit(limit);
  if (populate) find = find.populate(populate);
  const data = await find;

  return { data, page, limit, total, pages: Math.ceil(total / limit) };
}

module.exports = paginate;
