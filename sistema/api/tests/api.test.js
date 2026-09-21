const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { start, stop, req, login, getBase } = require('./helpers');

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
  // Despesa não é apagada — estorno preserva o lançamento
  assert.equal((await req('DELETE', `/api/imoveis/${id}/despesas/${desp.body.id}`, { token })).status, 409);
  const est = await req('POST', `/api/imoveis/${id}/despesas/${desp.body.id}/estornar`, { token, body: { motivo: 'Lançamento errado' } });
  assert.equal(est.status, 200);
  assert.equal(est.body.estornada, true);
  // Estornado continua contando como histórico — imóvel segue bloqueado
  assert.equal((await req('DELETE', `/api/imoveis/${id}`, { token })).status, 409);
});

test('despesa negativa ou inválida é rejeitada', async () => {
  const im = await req('POST', '/api/imoveis', { token, body: { endereco: 'Rua X', cidade: 'RJ' } });
  const id = im.body.id;
  assert.equal((await req('POST', `/api/imoveis/${id}/despesas`, { token, body: { descricao: 'X', valor: -100 } })).status, 400);
  assert.equal((await req('POST', `/api/imoveis/${id}/despesas`, { token, body: { descricao: 'X' } })).status, 400);
  assert.equal((await req('POST', `/api/imoveis/${id}/despesas`, { token, body: { descricao: '  ', valor: 10 } })).status, 400);
  // Precisão monetária: 1.005 tem 3 casas → rejeita
  assert.equal((await req('POST', `/api/imoveis/${id}/despesas`, { token, body: { descricao: 'X', valor: 1.005 } })).status, 400);
  // Data civil estrita: 30 de fevereiro não normaliza para março
  assert.equal((await req('POST', `/api/imoveis/${id}/despesas`, { token, body: { descricao: 'X', valor: 10, data: '2026-02-30' } })).status, 400);
  assert.equal((await req('POST', `/api/imoveis/${id}/despesas`, { token, body: { descricao: 'X', valor: 10, data: '30/02/2026' } })).status, 400);
});

test('código de imóvel não colide após exclusão', async () => {
  const a = await req('POST', '/api/imoveis', { token, body: { endereco: 'A', cidade: 'RJ' } });
  const b = await req('POST', '/api/imoveis', { token, body: { endereco: 'B', cidade: 'RJ' } });
  await req('DELETE', `/api/imoveis/${a.body.id}`, { token });
  const c = await req('POST', '/api/imoveis', { token, body: { endereco: 'C', cidade: 'RJ' } });
  assert.equal(c.status, 200);
  assert.notEqual(c.body.codigo, b.body.codigo);
});

test('código: fronteira 999/1000, manual duplicado e não numérico', async () => {
  // Códigos manuais na fronteira textual (o bug era ordenação lexicográfica)
  const p999 = await req('POST', '/api/imoveis', { token, body: { endereco: 'Rua 999', cidade: 'RJ', codigo: 'PB-999' } });
  assert.equal(p999.status, 200);
  const p1000 = await req('POST', '/api/imoveis', { token, body: { endereco: 'Rua 1000', cidade: 'RJ', codigo: 'PB-1000' } });
  assert.equal(p1000.status, 200);
  const pOutro = await req('POST', '/api/imoveis', { token, body: { endereco: 'Rua ZZ', cidade: 'RJ', codigo: 'GALPAO-01' } });
  assert.equal(pOutro.status, 200);

  // Automático deve gerar PB-1001+ (não colide nem regredir)
  const auto = await req('POST', '/api/imoveis', { token, body: { endereco: 'Auto', cidade: 'RJ' } });
  assert.equal(auto.status, 200, JSON.stringify(auto.body));
  const n = +String(auto.body.codigo).replace('PB-', '');
  assert.ok(n >= 1001, `esperava >= PB-1001, veio ${auto.body.codigo}`);

  // Manual duplicado → 409, sem substituição silenciosa
  assert.equal((await req('POST', '/api/imoveis', { token, body: { endereco: 'Dup', cidade: 'RJ', codigo: 'PB-999' } })).status, 409);
  assert.equal((await req('POST', '/api/imoveis', { token, body: { endereco: 'Dup', cidade: 'RJ', codigo: 'GALPAO-01' } })).status, 409);
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
    body: { nome: 'Visitante Site', telefone: '21977770000', mensagem: 'Quero um ponto' },
  });
  // Retry idêntico da mesma submissão → duplicado
  assert.equal(dup.body.duplicado, true);
  assert.equal((await req('POST', '/api/public/leads', { body: { nome: 'X' } })).status, 400);
  assert.equal((await req('POST', '/api/public/leads', { body: { nome: 'A', email: 'ruim' } })).status, 400);
});

test('reenvio com mensagem diferente vira nova interação, não novo lead', async () => {
  const primeiro = await req('POST', '/api/public/leads', {
    body: { nome: 'Maria Silva', email: 'maria@teste.dev', mensagem: 'Procuro loja no Centro' },
  });
  assert.equal(primeiro.status, 201);
  const segundo = await req('POST', '/api/public/leads', {
    body: { nome: 'Maria Silva', email: 'MARIA@teste.dev', mensagem: 'Agora quero galpão em Duque de Caxias' },
  });
  assert.equal(segundo.status, 201);
  assert.equal(segundo.body.novaInteracao, true);
  assert.equal(segundo.body.leadId, primeiro.body.leadId, 'mesmo contato → mesmo lead');

  const lead = await req('GET', `/api/leads/${primeiro.body.leadId}`, { token });
  const msgs = (lead.body.interacoes || []).map((i) => i.mensagem);
  assert.ok(msgs.includes('Procuro loja no Centro'));
  assert.ok(msgs.includes('Agora quero galpão em Duque de Caxias'), 'nova mensagem preservada no histórico');

  // Telefone compartilhado por pessoa diferente → lead novo, sem mesclar
  const outro = await req('POST', '/api/public/leads', {
    body: { nome: 'João Outro', telefone: '21977770000', mensagem: 'Sou outra pessoa' },
  });
  assert.equal(outro.status, 201);
  assert.notEqual(outro.body.leadId, primeiro.body.leadId, 'pessoas diferentes não são mescladas por telefone');
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
  // Telefone/e-mail do lead preservados na empresa
  const lead2 = await req('POST', '/api/leads', { token, body: { nome: 'Lead Contato', telefone: '21966660000', email: 'lead@x.dev' } });
  const conv2 = await req('POST', `/api/leads/${lead2.body.id}/converter`, { token, body: { empresaNome: 'Empresa Contato' } });
  assert.equal(conv2.body.empresa.telefone, '21966660000');
  assert.equal(conv2.body.empresa.email, 'lead@x.dev');

  // Segunda conversão → idempotente: retorna o mesmo vínculo, sem duplicar empresa
  const reconv = await req('POST', `/api/leads/${lead.body.id}/converter`, { token, body: { empresaNome: 'Outra Empresa' } });
  assert.equal(reconv.status, 200);
  assert.equal(reconv.body.jaConvertido, true);
  assert.equal(reconv.body.empresa.id, conv.body.empresa.id);

  // Reverter status p/ novo e converter de novo → ainda retorna vínculo original
  await req('PUT', `/api/leads/${lead.body.id}`, { token, body: { status: 'novo' } });
  const reconv2 = await req('POST', `/api/leads/${lead.body.id}/converter`, { token, body: {} });
  assert.equal(reconv2.body.empresa.id, conv.body.empresa.id);

  // Status "convertido" manual sem vínculo → rejeitado
  const lead3 = await req('POST', '/api/leads', { token, body: { nome: 'Lead Fake' } });
  assert.equal((await req('PUT', `/api/leads/${lead3.body.id}`, { token, body: { status: 'convertido' } })).status, 400);

  // IDs inexistentes → 4xx, não 500
  assert.equal((await req('POST', `/api/leads/${lead3.body.id}/converter`, { token, body: { empresaId: 99999 } })).status, 404);
  assert.equal((await req('POST', `/api/leads/${lead3.body.id}/converter`, { token, body: { empresaId: 'abc' } })).status, 400);
  assert.equal((await req('POST', '/api/leads/99999/converter', { token, body: {} })).status, 404);
});

test('B02: comercial não acessa despesas por nenhum caminho', async () => {
  const u = await req('POST', '/api/usuarios', {
    token,
    body: { nome: 'Com B02', email: 'b02@teste.dev', senha: 'senha12345' },
  });
  const t = await login('b02@teste.dev', 'senha12345');
  const ct = t.body.token;

  const im = await req('POST', '/api/imoveis', { token, body: { endereco: 'Rua B02', cidade: 'RJ' } });
  const desp = await req('POST', `/api/imoveis/${im.body.id}/despesas`, { token, body: { descricao: 'IPTU', valor: 100 } });

  assert.equal((await req('GET', `/api/imoveis/${im.body.id}/despesas`, { token: ct })).status, 403);
  assert.equal((await req('POST', `/api/imoveis/${im.body.id}/despesas`, { token: ct, body: { descricao: 'X', valor: 1 } })).status, 403);
  assert.equal((await req('DELETE', `/api/imoveis/${im.body.id}/despesas/${desp.body.id}`, { token: ct })).status, 403);
  assert.equal((await req('POST', `/api/imoveis/${im.body.id}/despesas/${desp.body.id}/estornar`, { token: ct, body: {} })).status, 403);
  assert.equal((await req('GET', '/api/financeiro', { token: ct })).status, 403);

  // Detalhe do imóvel para comercial não inclui despesas
  const det = await req('GET', `/api/imoveis/${im.body.id}`, { token: ct });
  assert.equal(det.status, 200);
  assert.ok(!('despesas' in det.body), 'payload de comercial não deve conter despesas');
});

test('B01: documento privado exige auth; público e foto são abertos', async () => {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const uploadDir = path.join(__dirname, '..', 'uploads');
  fs.mkdirSync(uploadDir, { recursive: true });
  const arquivoPriv = `teste-priv-${process.pid}.txt`;
  const arquivoPub = `teste-pub-${process.pid}.txt`;
  fs.writeFileSync(path.join(uploadDir, arquivoPriv), 'conteudo privado');
  fs.writeFileSync(path.join(uploadDir, arquivoPub), 'conteudo publico');

  const im = await req('POST', '/api/imoveis', { token, body: { endereco: 'Rua Upload', cidade: 'RJ' } });
  const { prisma } = require('./helpers');
  await prisma.imovelDocumento.create({ data: { imovelId: im.body.id, tipo: 'doc_locatario', nome: 'Privado', arquivo: arquivoPriv } });
  await prisma.imovelDocumento.create({ data: { imovelId: im.body.id, tipo: 'planta', nome: 'Planta', arquivo: arquivoPub } });

  // Anônimo: privado negado, público liberado, inexistente 404
  assert.equal((await req('GET', `/uploads/${arquivoPriv}`)).status, 401);
  assert.equal((await req('GET', `/uploads/${arquivoPub}`)).status, 200);
  assert.equal((await req('GET', `/uploads/nao-existe-${process.pid}.txt`)).status, 404);
  // Path traversal bloqueado
  assert.equal((await req('GET', '/uploads/..%2Fprisma%2Fschema.prisma')).status !== 200, true);

  // Autorizado (header e query token) baixa o privado
  assert.equal((await req('GET', `/uploads/${arquivoPriv}`, { token })).status, 200);
  const viaQuery = await fetch(`${getBase()}/uploads/${arquivoPriv}?token=${token}`);
  assert.equal(viaQuery.status, 200);
  assert.match(viaQuery.headers.get('cache-control') || '', /no-store/);

  // Revogação: trocar tipo público → privado bloqueia acesso anônimo seguinte
  await prisma.imovelDocumento.updateMany({ where: { arquivo: arquivoPub }, data: { tipo: 'doc_locatario' } });
  assert.equal((await req('GET', `/uploads/${arquivoPub}`)).status, 401);

  fs.unlinkSync(path.join(uploadDir, arquivoPriv));
  fs.unlinkSync(path.join(uploadDir, arquivoPub));
});
