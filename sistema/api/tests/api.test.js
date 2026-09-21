const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { start, stop, req, login } = require('./helpers');

let token;

before(async () => {
  await start();
  const res = await login();
  assert.equal(res.status, 200);
  token = res.body.token;
});

after(stop);

test('healthz responde ok', async () => {
  const res = await req('GET', '/api/healthz');
  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
});

test('login rejeita senha errada e aceita a certa', async () => {
  const bad = await login('admin@teste.dev', 'errada');
  assert.equal(bad.status, 401);
  const good = await login();
  assert.equal(good.status, 200);
  assert.ok(good.body.token);
  assert.equal(good.body.usuario.email, 'admin@teste.dev');
});

test('rotas protegidas exigem token', async () => {
  for (const p of ['/api/dashboard', '/api/imoveis', '/api/empresas', '/api/leads',
    '/api/proprietarios', '/api/parceiros', '/api/financeiro', '/api/oportunidades', '/api/usuarios']) {
    const res = await req('GET', p);
    assert.equal(res.status, 401, `${p} deveria exigir auth`);
  }
});

test('auth/me retorna usuário logado', async () => {
  const res = await req('GET', '/api/auth/me', { token });
  assert.equal(res.status, 200);
  assert.equal(res.body.email, 'admin@teste.dev');
});

test('CRUD de empresas', async () => {
  const created = await req('POST', '/api/empresas', { token, body: { nome: 'Empresa Teste', segmento: 'Varejo' } });
  assert.equal(created.status, 200);
  const id = created.body.id;

  const semNome = await req('POST', '/api/empresas', { token, body: {} });
  assert.equal(semNome.status, 400);

  const got = await req('GET', `/api/empresas/${id}`, { token });
  assert.equal(got.body.nome, 'Empresa Teste');

  const updated = await req('PUT', `/api/empresas/${id}`, { token, body: { nome: 'Empresa Editada' } });
  assert.equal(updated.body.nome, 'Empresa Editada');

  const del = await req('DELETE', `/api/empresas/${id}`, { token });
  assert.equal(del.status, 200);
  assert.equal((await req('GET', `/api/empresas/${id}`, { token })).status, 404);
});

test('CRUD de leads', async () => {
  const created = await req('POST', '/api/leads', { token, body: { nome: 'Lead Teste', telefone: '21999990000' } });
  assert.equal(created.status, 200);
  assert.equal(created.body.status, 'novo');
  const id = created.body.id;

  const list = await req('GET', '/api/leads', { token });
  assert.ok(list.body.some((l) => l.id === id));

  assert.equal((await req('DELETE', `/api/leads/${id}`, { token })).status, 200);
});

test('CRUD de proprietários', async () => {
  const created = await req('POST', '/api/proprietarios', { token, body: { nome: 'Prop Teste', telefone: '21988880000' } });
  assert.equal(created.status, 200);
  assert.equal(created.body.tipoPessoa, 'pf');
  assert.equal((await req('DELETE', `/api/proprietarios/${created.body.id}`, { token })).status, 200);
});

test('CRUD de parceiros', async () => {
  const created = await req('POST', '/api/parceiros', { token, body: { nome: 'Parceiro Teste' } });
  assert.equal(created.status, 200);
  assert.equal((await req('DELETE', `/api/parceiros/${created.body.id}`, { token })).status, 200);
});

test('imóvel: cria, gera código, despesa e exclui', async () => {
  const created = await req('POST', '/api/imoveis', {
    token,
    body: { titulo: 'Loja Teste', tipo: 'locacao', endereco: 'Rua Teste', cidade: 'Rio de Janeiro', uf: 'RJ', aluguel: 10000 },
  });
  assert.equal(created.status, 200);
  assert.match(created.body.codigo, /^PB-\d+$/);
  const id = created.body.id;

  const desp = await req('POST', `/api/imoveis/${id}/despesas`, {
    token,
    body: { descricao: 'IPTU', valor: 500, data: '2026-09-01' },
  });
  assert.equal(desp.status, 200, JSON.stringify(desp.body));
  // Data civil não desloca de fuso
  assert.ok(String(desp.body.data).startsWith('2026-09-01'));

  const desps = await req('GET', `/api/imoveis/${id}/despesas`, { token });
  assert.ok(Array.isArray(desps.body));

  // Imóvel com despesa não pode ser excluído (preserva histórico)
  assert.equal((await req('DELETE', `/api/imoveis/${id}`, { token })).status, 409);
  await req('DELETE', `/api/imoveis/${id}/despesas/${desp.body.id}`, { token });
  assert.equal((await req('DELETE', `/api/imoveis/${id}`, { token })).status, 200);
});

test('despesa negativa ou inválida é rejeitada', async () => {
  const im = await req('POST', '/api/imoveis', { token, body: { endereco: 'Rua X', cidade: 'RJ' } });
  const id = im.body.id;
  assert.equal((await req('POST', `/api/imoveis/${id}/despesas`, { token, body: { descricao: 'X', valor: -100 } })).status, 400);
  assert.equal((await req('POST', `/api/imoveis/${id}/despesas`, { token, body: { descricao: 'X' } })).status, 400);
  assert.equal((await req('POST', `/api/imoveis/${id}/despesas`, { token, body: { descricao: '  ', valor: 10 } })).status, 400);
});

test('código de imóvel não colide após exclusão', async () => {
  const a = await req('POST', '/api/imoveis', { token, body: { endereco: 'A', cidade: 'RJ' } });
  const b = await req('POST', '/api/imoveis', { token, body: { endereco: 'B', cidade: 'RJ' } });
  await req('DELETE', `/api/imoveis/${a.body.id}`, { token });
  const c = await req('POST', '/api/imoveis', { token, body: { endereco: 'C', cidade: 'RJ' } });
  assert.equal(c.status, 200);
  assert.notEqual(c.body.codigo, b.body.codigo);
});

test('imóvel sem endereço/cidade retorna 400', async () => {
  const res = await req('POST', '/api/imoveis', { token, body: { titulo: 'Sem endereço' } });
  assert.equal(res.status, 400);
});

test('oportunidade sem vínculos retorna 400', async () => {
  const res = await req('POST', '/api/oportunidades', { token, body: {} });
  assert.equal(res.status, 400);
});

test('oportunidade vincula imóvel e empresa', async () => {
  const im = await req('POST', '/api/imoveis', { token, body: { titulo: 'Loja Vinculo', endereco: 'Rua V', cidade: 'Rio de Janeiro' } });
  const em = await req('POST', '/api/empresas', { token, body: { nome: 'Empresa Vinculo' } });
  const op = await req('POST', '/api/oportunidades', {
    token,
    body: { imovelId: im.body.id, empresaId: em.body.id },
  });
  assert.equal(op.status, 200, JSON.stringify(op.body));
  assert.equal(op.body.etapa, 'apresentado');

  const upd = await req('PUT', `/api/oportunidades/${op.body.id}`, { token, body: { etapa: 'negociacao' } });
  assert.equal(upd.body.etapa, 'negociacao');

  assert.equal((await req('DELETE', `/api/oportunidades/${op.body.id}`, { token })).status, 200);
});

test('usuários: cria comercial e impede autoexclusão', async () => {
  const created = await req('POST', '/api/usuarios', {
    token,
    body: { nome: 'Comercial Teste', email: 'comercial@teste.dev', senha: 'senha12345' },
  });
  assert.equal(created.status, 200, JSON.stringify(created.body));

  const fraca = await req('POST', '/api/usuarios', {
    token,
    body: { nome: 'X', email: 'x@teste.dev', senha: '123' },
  });
  assert.equal(fraca.status, 400);

  const me = await req('GET', '/api/auth/me', { token });
  const selfDel = await req('DELETE', `/api/usuarios/${me.body.id}`, { token });
  assert.equal(selfDel.status, 400);

  assert.equal((await req('DELETE', `/api/usuarios/${created.body.id}`, { token })).status, 200);
});

test('dashboard e financeiro respondem', async () => {
  assert.equal((await req('GET', '/api/dashboard', { token })).status, 200);
  assert.equal((await req('GET', '/api/financeiro', { token })).status, 200);
});

test('rota de API inexistente retorna 404 json', async () => {
  const res = await req('GET', '/api/nao-existe', { token });
  assert.equal(res.status, 404);
  assert.equal(res.body.error, 'Rota não encontrada');
});

test('lead rejeita nome em branco, e-mail inválido e status inventado', async () => {
  assert.equal((await req('POST', '/api/leads', { token, body: { nome: '   ' } })).status, 400);
  assert.equal((await req('POST', '/api/leads', { token, body: { nome: 'A', email: 'naoemail' } })).status, 400);
  assert.equal((await req('POST', '/api/leads', { token, body: { nome: 'A', status: 'inventado' } })).status, 400);
});

test('troca de senha exige 8+ caracteres', async () => {
  const res = await req('POST', '/api/auth/trocar-senha', { token, body: { atual: 'prospeccao123', nova: 'x' } });
  assert.equal(res.status, 400);
});

test('usuário desativado perde acesso imediatamente', async () => {
  const u = await req('POST', '/api/usuarios', {
    token,
    body: { nome: 'Temp', email: 'temp@teste.dev', senha: 'senha12345' },
  });
  const t = await login('temp@teste.dev', 'senha12345');
  assert.equal(t.status, 200);
  const tempToken = t.body.token;
  assert.equal((await req('GET', '/api/leads', { token: tempToken })).status, 200);

  await req('PUT', `/api/usuarios/${u.body.id}`, { token, body: { ativo: false } });
  assert.equal((await req('GET', '/api/leads', { token: tempToken })).status, 401);
});

test('financeiro é restrito a admin', async () => {
  const u = await req('POST', '/api/usuarios', {
    token,
    body: { nome: 'Comer', email: 'comer@teste.dev', senha: 'senha12345' },
  });
  const t = await login('comer@teste.dev', 'senha12345');
  assert.equal((await req('GET', '/api/financeiro', { token: t.body.token })).status, 403);
  assert.equal((await req('GET', '/api/usuarios', { token: t.body.token })).status, 403);
  assert.equal((await req('GET', '/api/leads', { token: t.body.token })).status, 200);
});

test('empresa com oportunidade não pode ser excluída', async () => {
  const im = await req('POST', '/api/imoveis', { token, body: { endereco: 'Rua Z', cidade: 'RJ' } });
  const em = await req('POST', '/api/empresas', { token, body: { nome: 'Empresa Travada' } });
  await req('POST', '/api/oportunidades', { token, body: { imovelId: im.body.id, empresaId: em.body.id } });
  assert.equal((await req('DELETE', `/api/empresas/${em.body.id}`, { token })).status, 409);
});

test('apresentação pública não expõe documentos internos nem imóvel inativo', async () => {
  const im = await req('POST', '/api/imoveis', { token, body: { endereco: 'Rua Doc', cidade: 'RJ' } });
  const id = im.body.id;
  // doc interno via URL
  await req('POST', `/api/imoveis/${id}/documentos`, {
    token,
    body: { tipo: 'doc_locatario', nome: 'Interno', url: 'https://interno.exemplo/doc' },
  });
  const html = await req('GET', `/apresentacao/${id}`);
  assert.equal(html.status, 200);
  assert.ok(!String(html.body).includes('interno.exemplo'), 'doc interno não deve aparecer');

  // inativo → 404
  await req('PUT', `/api/imoveis/${id}`, { token, body: { status: 'inativo' } });
  assert.equal((await req('GET', `/apresentacao/${id}`)).status, 404);
  assert.equal((await req('GET', `/api/public/imoveis/${id}`)).status, 404);
});

test('captação pública de lead funciona, deduplica e valida', async () => {
  const ok = await req('POST', '/api/public/leads', {
    body: { nome: 'Visitante Site', telefone: '21977770000', mensagem: 'Quero um ponto' },
  });
  assert.equal(ok.status, 201);
  const dup = await req('POST', '/api/public/leads', {
    body: { nome: 'Visitante Site', telefone: '21977770000' },
  });
  assert.equal(dup.body.duplicado, true);
  assert.equal((await req('POST', '/api/public/leads', { body: { nome: 'X' } })).status, 400);
  assert.equal((await req('POST', '/api/public/leads', { body: { nome: 'A', email: 'ruim' } })).status, 400);
});

test('conversão de lead cria empresa e é idempotente', async () => {
  const lead = await req('POST', '/api/leads', { token, body: { nome: 'Lead Conversão', interesse: 'Loja RJ' } });
  const conv = await req('POST', `/api/leads/${lead.body.id}/converter`, {
    token,
    body: { empresaNome: 'Empresa Convertida' },
  });
  assert.equal(conv.status, 200, JSON.stringify(conv.body));
  assert.equal(conv.body.lead.status, 'convertido');
  assert.equal(conv.body.empresa.nome, 'Empresa Convertida');
  // segunda conversão → conflito
  assert.equal((await req('POST', `/api/leads/${lead.body.id}/converter`, { token, body: {} })).status, 409);
});
