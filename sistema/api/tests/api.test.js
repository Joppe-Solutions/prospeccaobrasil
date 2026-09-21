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

  const desps = await req('GET', `/api/imoveis/${id}/despesas`, { token });
  assert.ok(Array.isArray(desps.body));

  assert.equal((await req('DELETE', `/api/imoveis/${id}`, { token })).status, 200);
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
