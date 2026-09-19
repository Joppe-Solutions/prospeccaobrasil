/** Wrapper para rotas async: rejeições vão para o error handler do Express. */
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
