// Paginação server-side: com ?pagina/&porPagina retorna { items, total, pagina, paginas };
// sem parâmetros retorna a lista completa (compatível com clientes atuais).
// `map` (opcional) transforma cada item antes da resposta.
module.exports = async function paginate(req, res, model, query, map = (item) => item) {
  const { pagina, porPagina } = req.query;
  if (!pagina && !porPagina) return res.json((await model.findMany(query)).map(map));
  const page = Math.max(1, +pagina || 1);
  const per = Math.min(200, Math.max(1, +porPagina || 25));
  const [total, items] = await Promise.all([
    model.count({ where: query.where }),
    model.findMany({ ...query, skip: (page - 1) * per, take: per }),
  ]);
  return res.json({ items: items.map(map), total, pagina: page, paginas: Math.ceil(total / per) });
};
