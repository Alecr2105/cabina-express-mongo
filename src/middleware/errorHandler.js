const HttpError = require('../utils/HttpError');

function notFound(req, res, next) {
  next(new HttpError(404, 'Ruta no encontrada'));
}

// Todos los errores responden { "error": "mensaje" }
function errorHandler(err, req, res, next) {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON mal formado' });
  }
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map((e) => e.message).join('; ');
    return res.status(400).json({ error: message });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ error: `Valor inválido para ${err.path}` });
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'campo';
    return res.status(409).json({ error: `Ya existe un registro con ese ${field}` });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
}

module.exports = { notFound, errorHandler };
