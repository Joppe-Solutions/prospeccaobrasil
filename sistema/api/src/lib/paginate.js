// Paginação server-side: com ?pagina/&porPagina retorna { items, total, pagina, paginas };
// sem parâmetros retorna a lista completa (compatível com clientes atuais).
module.exports = async function paginate(req, res, model, query) {
  const { pagina, porPagina } = req.query;
  if (!pagina && !porPagina) return res.json(await model.findMany(query));
  const page = Math.max(1, +pagina || 1);
  const per = Math.min(200, Math.max(1, +porPagina || 25));
  const [total, items] = await Promise.all([
    model.count({ where: query.where }),
    model.findMany({ ...query, skip: (page - 1) * per, take: per }),
  ]);
  return res.json({ items, total, pagina: page, paginas: Math.ceil(total / per) });
};
