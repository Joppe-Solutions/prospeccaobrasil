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
  // sessão na URL não vale mais; só o token curto de arquivo
  assert.equal((await fetch(`${getBase()}/uploads/${arquivoPriv}?token=${token}`)).status, 401);
  const arquivoToken = (await req('GET', '/api/auth/token-arquivo', { token })).body.token;
  assert.equal((await req('GET', '/api/auth/me', { token: arquivoToken })).status, 401);
  const viaQuery = await fetch(`${getBase()}/uploads/${arquivoPriv}?token=${arquivoToken}`);
  assert.equal(viaQuery.status, 200);
  assert.match(viaQuery.headers.get('cache-control') || '', /no-store/);

  // Revogação: trocar tipo público → privado bloqueia acesso anônimo seguinte
  await prisma.imovelDocumento.updateMany({ where: { arquivo: arquivoPub }, data: { tipo: 'doc_locatario' } });
  assert.equal((await req('GET', `/uploads/${arquivoPub}`)).status, 401);

  fs.unlinkSync(path.join(uploadDir, arquivoPriv));
  fs.unlinkSync(path.join(uploadDir, arquivoPub));
});

test('CRM operacional: responsável, próxima ação e atividades', async () => {
  const lead = await req('POST', '/api/leads', { token, body: { nome: 'Lead CRM' } });
  const id = lead.body.id;
  const me = await req('GET', '/api/auth/me', { token });

  // Responsável e próxima ação com data civil
  const upd = await req('PUT', `/api/leads/${id}`, {
    token,
    body: { responsavelId: me.body.id, proximaAcao: 'Retornar ligação', proximaAcaoEm: '2026-10-01' },
  });
  assert.equal(upd.status, 200, JSON.stringify(upd.body));
  assert.equal(upd.body.responsavelId, me.body.id);
  assert.ok(String(upd.body.proximaAcaoEm).startsWith('2026-10-01'));

  // Responsável inexistente → 400; data inválida → 400
  assert.equal((await req('PUT', `/api/leads/${id}`, { token, body: { responsavelId: 99999 } })).status, 400);
  assert.equal((await req('PUT', `/api/leads/${id}`, { token, body: { proximaAcaoEm: '2026-02-30' } })).status, 400);

  // Lista de responsáveis acessível a não-admin
  const u = await req('POST', '/api/usuarios', { token, body: { nome: 'C', email: 'c2@teste.dev', senha: 'senha12345' } });
  const t = await login('c2@teste.dev', 'senha12345');
  const resp = await req('GET', '/api/leads/responsaveis', { token: t.body.token });
  assert.equal(resp.status, 200);
  assert.ok(resp.body.every((x) => x.id && x.nome && !x.email), 'só id/nome');

  // Atividade manual + atividade automática de mudança de status
  const at = await req('POST', `/api/leads/${id}/atividades`, { token, body: { tipo: 'ligacao', texto: 'Liguei, pediu retorno' } });
  assert.equal(at.status, 201);
  assert.equal(at.body.autorId, me.body.id);
  assert.equal((await req('POST', `/api/leads/${id}/atividades`, { token, body: { texto: '' } })).status, 400);
  await req('PUT', `/api/leads/${id}`, { token, body: { status: 'em_contato' } });

  const det = await req('GET', `/api/leads/${id}`, { token });
  const tipos = det.body.atividades.map((a) => a.tipo);
  assert.ok(tipos.includes('ligacao'));
  assert.ok(tipos.includes('status'), 'mudança de status vira atividade');
  assert.equal(det.body.responsavel.id, me.body.id);
});

test('financeiro: lançamentos com baixa, estorno e resumo', async () => {
  const im = await req('POST', '/api/imoveis', { token, body: { endereco: 'Rua Fin', cidade: 'RJ' } });
  const em = await req('POST', '/api/empresas', { token, body: { nome: 'Emp Fin' } });

  // Receita de comissão + despesa de repasse
  const rec = await req('POST', '/api/financeiro/lancamentos', {
    token,
    body: { tipo: 'receita', categoria: 'comissao', descricao: 'Comissão locação', valor: 2500, vencimento: '2026-10-10', imovelId: im.body.id, empresaId: em.body.id },
  });
  assert.equal(rec.status, 201, JSON.stringify(rec.body));
  assert.equal(rec.body.status, 'previsto');

  // Validações
  assert.equal((await req('POST', '/api/financeiro/lancamentos', { token, body: { tipo: 'x', categoria: 'aluguel', descricao: 'a', valor: 1 } })).status, 400);
  assert.equal((await req('POST', '/api/financeiro/lancamentos', { token, body: { tipo: 'receita', categoria: 'aluguel', descricao: 'a', valor: 1.005 } })).status, 400);
  assert.equal((await req('POST', '/api/financeiro/lancamentos', { token, body: { tipo: 'receita', categoria: 'aluguel', descricao: 'a', valor: 10, vencimento: '2026-02-30' } })).status, 400);
  assert.equal((await req('POST', '/api/financeiro/lancamentos', { token, body: { tipo: 'receita', categoria: 'aluguel', descricao: 'a', valor: 10, imovelId: 99999 } })).status, 400);

  // Baixa com valor diferente
  const bx = await req('POST', `/api/financeiro/lancamentos/${rec.body.id}/baixar`, {
    token, body: { pagoEm: '2026-10-09', valorPago: 2400, formaPagamento: 'pix' },
  });
  assert.equal(bx.status, 200);
  assert.equal(bx.body.status, 'pago');
  assert.equal(Number(bx.body.valorPago), 2400);
  // Baixa dupla → 409; estorno de pago preserva histórico
  assert.equal((await req('POST', `/api/financeiro/lancamentos/${rec.body.id}/baixar`, { token, body: {} })).status, 409);

  const desp = await req('POST', '/api/financeiro/lancamentos', {
    token, body: { tipo: 'despesa', categoria: 'repasse', descricao: 'Repasse proprietário', valor: 2000, vencimento: '2020-01-01', imovelId: im.body.id },
  });
  const resumo = await req('GET', '/api/financeiro/resumo', { token });
  assert.equal(resumo.body.receitaRealizada, 2400);
  assert.equal(resumo.body.despesaPrevista, 2000);
  assert.equal(resumo.body.resultadoRealizado, 2400); // receita paga 2400 − despesa paga 0
  assert.equal(resumo.body.resultadoPrevisto, -2000); // receita prevista 0 − despesa prevista 2000
  assert.ok(resumo.body.vencidos.qtd >= 1, 'repasse vencido conta como em aberto');

  // Estorno preserva lançamento e sai dos totais
  await req('POST', `/api/financeiro/lancamentos/${desp.body.id}/estornar`, { token, body: { motivo: 'Erro' } });
  const resumo2 = await req('GET', '/api/financeiro/resumo', { token });
  assert.equal(resumo2.body.despesaPrevista, 0);

  // Paginação server-side
  const pag = await req('GET', '/api/financeiro/lancamentos?pagina=1&porPagina=1', { token });
  assert.equal(pag.body.items.length, 1);
  assert.equal(pag.body.total, 2);
  assert.equal(pag.body.paginas, 2);

  // Comercial continua fora
  const t = await login('b02@teste.dev', 'senha12345');
  assert.equal((await req('GET', '/api/financeiro/lancamentos', { token: t.body.token })).status, 403);
});

test('financeiro v2: edição, duplicação, pagador e resultado por imóvel', async () => {
  const { body: { token } } = await login();
  const im = await req('POST', '/api/imoveis', { token, body: { endereco: 'Rua Fin V2', cidade: 'Rio de Janeiro' } });

  const l = await req('POST', '/api/financeiro/lancamentos', {
    token, body: { tipo: 'receita', categoria: 'comissao', descricao: 'Comissão PB', valor: 50000, vencimento: '2026-12-01', imovelId: im.body.id, pagador: 'Cliente X', beneficiario: 'Prospecção Brasil' },
  });
  assert.equal(l.status, 201);
  assert.equal(l.body.pagador, 'Cliente X');

  // Edição permitida enquanto previsto
  const ed = await req('PUT', `/api/financeiro/lancamentos/${l.body.id}`, {
    token, body: { tipo: 'receita', categoria: 'comissao', descricao: 'Comissão PB v2', valor: 55000, imovelId: im.body.id },
  });
  assert.equal(ed.status, 200);
  assert.equal(Number(ed.body.valor), 55000);

  // Categoria imposto aceita; pagador inválido não quebra
  const imp = await req('POST', '/api/financeiro/lancamentos', {
    token, body: { tipo: 'despesa', categoria: 'imposto', descricao: 'Imposto', valor: 3000, imovelId: im.body.id },
  });
  assert.equal(imp.status, 201);

  // Duplicar gera cópia prevista sem baixa
  const dup = await req('POST', `/api/financeiro/lancamentos/${l.body.id}/duplicar`, { token, body: {} });
  assert.equal(dup.status, 201);
  assert.equal(dup.body.status, 'previsto');
  assert.equal(Number(dup.body.valor), 55000);

  // Resultado por imóvel: bruta 110000 − despesas 3000 − impostos 3000 − repasses 0 = 104000? não:
  // imposto é despesa E imposto (conta nas duas colunas, fórmula subtrai via categoria)
  const res = await req('GET', '/api/financeiro/resumo', { token });
  const row = res.body.porImovel.find(p => p.imovel?.id === im.body.id);
  assert.ok(row, 'imóvel presente no resultado');
  assert.equal(row.receita, 110000);
  assert.equal(row.impostos, 3000);
  assert.equal(row.comissaoLiquida, row.receita - row.despesa - row.impostos - row.repasses);
  assert.equal(row.situacao, 'pendente');

  // Após baixar tudo, situação vira concluído e edição é bloqueada
  await req('POST', `/api/financeiro/lancamentos/${l.body.id}/baixar`, { token, body: {} });
  await req('POST', `/api/financeiro/lancamentos/${dup.body.id}/baixar`, { token, body: {} });
  await req('POST', `/api/financeiro/lancamentos/${imp.body.id}/baixar`, { token, body: {} });
  const res2 = await req('GET', '/api/financeiro/resumo', { token });
  assert.equal(res2.body.porImovel.find(p => p.imovel?.id === im.body.id).situacao, 'concluido');
  assert.equal((await req('PUT', `/api/financeiro/lancamentos/${l.body.id}`, { token, body: { tipo: 'receita', categoria: 'comissao', descricao: 'x', valor: 1 } })).status, 409);
});

test('oportunidades: modalidade validada', async () => {
  const { body: { token } } = await login();
  const im = await req('POST', '/api/imoveis', { token, body: { endereco: 'Rua Mod', cidade: 'Rio de Janeiro' } });
  const em = await req('POST', '/api/empresas', { token, body: { nome: 'Empresa Modalidade' } });
  assert.equal((await req('POST', '/api/oportunidades', { token, body: { imovelId: im.body.id, empresaId: em.body.id, modalidade: 'invalida' } })).status, 400);
  const ok = await req('POST', '/api/oportunidades', { token, body: { imovelId: im.body.id, empresaId: em.body.id, modalidade: 'expansao_redes' } });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.modalidade, 'expansao_redes');
  const up = await req('PUT', `/api/oportunidades/${ok.body.id}`, { token, body: { modalidade: 'passagem_ponto' } });
  assert.equal(up.body.modalidade, 'passagem_ponto');
});

test('documentos e inteligencia: listagem e política por papel', async () => {
  const { body: { token } } = await login();
  const im = await req('POST', '/api/imoveis', { token, body: { endereco: 'Rua Docs', cidade: 'Rio de Janeiro' } });
  await req('POST', `/api/imoveis/${im.body.id}/documentos`, { token, body: { tipo: 'planta', nome: 'Planta pública', url: 'https://example.test/planta.pdf' } });
  await req('POST', `/api/imoveis/${im.body.id}/documentos`, { token, body: { tipo: 'doc_locatario', nome: 'Doc privado', url: 'https://example.test/priv.pdf' } });

  const all = await req('GET', '/api/documentos', { token });
  assert.ok(all.body.length >= 2);

  // Comercial vê apenas tipos públicos
  await req('POST', '/api/usuarios', { token, body: { nome: 'Comercial Docs', email: 'docs@teste.dev', senha: 'senha12345', role: 'comercial' } });
  const t = await login('docs@teste.dev', 'senha12345');
  const com = await req('GET', '/api/documentos', { token: t.body.token });
  assert.ok(com.body.every(d => d.tipo !== 'doc_locatario'), 'comercial não vê docs privados');

  const intel = await req('GET', '/api/inteligencia', { token });
  assert.equal(intel.status, 200);
  assert.ok(Array.isArray(intel.body));
});

test('documento de inteligência: A4 paisagem, auth e seções', async () => {
  const { body: { token } } = await login();
  const im = await req('POST', '/api/imoveis', { token, body: { endereco: 'Rua Geo', numero: '10', bairro: 'Centro', cidade: 'Rio de Janeiro', uf: 'RJ' } });
  const analise = await req('POST', `/api/imoveis/${im.body.id}/analise`, { token });
  assert.equal(analise.status, 200);

  assert.equal((await req('GET', `/inteligencia/${analise.body.id}`)).status, 401);
  const arquivoToken = (await req('GET', '/api/auth/token-arquivo', { token })).body.token;
  assert.equal((await req('GET', `/inteligencia/99999?token=${token}`)).status, 401);
  assert.equal((await req('GET', `/inteligencia/99999?token=${arquivoToken}`)).status, 404);

  const doc = await req('GET', `/inteligencia/${analise.body.id}?token=${arquivoToken}`);
  assert.equal(doc.status, 200);
  assert.match(doc.body, /size:297mm 210mm/);
  assert.match(doc.body, /INTELIGÊNCIA DE MERCADO/);
  assert.match(doc.body, /Critério de classificação social/);
  assert.match(doc.body, /Domicílios por classe social/);
  assert.match(doc.body, /Evolução populacional e faixa etária|Pirâmide etária/);
  assert.doesNotMatch(doc.body, /Censo( Demográfico)? 2010|sob levantamento/i);
  // cada folha é uma <article class="sheet"> e a barra de ferramentas informa o mesmo total
  const folhas = (doc.body.match(/<article class="sheet/g) || []).length;
  assert.equal(Number(/(\d+) folhas/.exec(doc.body)[1]), folhas);
  // sem serviço de mapas (testes não chamam a rede), a seção de entorno é omitida e a omissão é registrada
  assert.doesNotMatch(doc.body, /O que existe ao redor do ponto/);
  assert.match(doc.body, /Seção omitida:<\/strong> entorno da rua/);
  assert.match(doc.body, /Rua Geo/);
});

test('demandas: vários briefings por empresa, validação e acompanhamento de operações', async () => {
  const empresa = (await req('POST','/api/empresas',{token,body:{nome:'Rede demandas',razaoSocial:'Rede Demandas Ltda',endereco:'Rua das lojas, 10'}})).body;
  assert.equal(empresa.razaoSocial,'Rede Demandas Ltda');
  const create = body => req('POST','/api/demandas',{token,body:{empresaId:empresa.id,titulo:'Expansão RJ',tipo:'locacao',...body}});
  assert.equal((await create({areaMinima:200,areaMaxima:100})).status,400);
  assert.equal((await create({unidades:1.5})).status,400);
  assert.equal((await create({inicioEm:'2026-02-30'})).status,400);
  const a=await create({areaMinima:100,areaMaxima:300,cdu:12000,luvas:5000,vagasMinimas:4,regioesInteresse:'Méier'});
  const b=await create({titulo:'Expansão Oeste',regioesInteresse:'Campo Grande'});
  assert.equal(a.status,200);assert.equal(b.status,200);assert.notEqual(a.body.id,b.body.id);
  assert.equal((await req('GET','/api/demandas')).status,401);
  assert.equal((await req('POST','/api/imoveis',{token,body:{endereco:'Vagas inválidas',cidade:'RJ',vagas:1.5}})).status,400);
  const imovel=(await req('POST','/api/imoveis',{token,body:{endereco:'Rua demanda',cidade:'Rio de Janeiro',vagas:4,luvas:1000,acessibilidade:'Rampa'}})).body;
  const op=await req('POST','/api/oportunidades',{token,body:{imovelId:imovel.id,empresaId:empresa.id,demandaId:a.body.id,modalidade:'venda_ativo',finalidade:'expansao_redes'}});
  assert.equal(op.status,200);assert.equal(op.body.demanda.id,a.body.id);
  assert.equal((await req('PUT',`/api/oportunidades/${op.body.id}`,{token,body:{etapa:'visita'}})).status,200);
  const history=await req('GET',`/api/demandas/${a.body.id}`,{token});assert.equal(history.body.atividades.length,2);assert.equal(history.body.oportunidades[0].etapa,'visita');
  const other=(await req('POST','/api/empresas',{token,body:{nome:'Outra rede'}})).body;
  assert.equal((await req('POST','/api/oportunidades',{token,body:{imovelId:imovel.id,empresaId:other.id,demandaId:a.body.id}})).status,400);
  assert.equal((await req('PUT',`/api/demandas/${a.body.id}`,{token,body:{empresaId:other.id}})).status,400);
  assert.equal((await req('POST',`/api/demandas/${a.body.id}/documentos`,{token,body:{nome:'Contrato',url:'javascript:alert(1)'}})).status,400);
  assert.equal((await req('POST',`/api/demandas/${a.body.id}/documentos`,{token,body:{nome:'Briefing',tipo:'briefing',url:'https://example.com/briefing'}})).status,200);
  assert.equal((await req('POST','/api/propostas',{token,body:{empresaId:empresa.id,demandaId:a.body.id,honorariosProspeccao:'R$ 10.000,00'}})).status,200);
  assert.equal((await req('DELETE',`/api/empresas/${empresa.id}`,{token})).status,409);
});

test('glossário e benchmark: conteúdo dos PDFs, edição persistente e validação', async () => {
  assert.equal((await req('GET','/api/glossario')).status,401);
  const g=await req('GET','/api/glossario',{token});assert.equal(g.body.length,100);
  assert.equal(g.body.find(t=>t.termo==='Founder').aliases,'fander');
  assert.ok(g.body.find(t=>t.termo==='BTS').significado.includes('ocupante'));
  assert.equal((await req('POST','/api/glossario',{token,body:{termo:'BTS',categoria:'Duplicado',significado:'Duplicado'}})).status,409);
  assert.equal((await req('POST','/api/glossario',{token,body:{termo:'bts',categoria:'Duplicado',significado:'Duplicado'}})).status,409);
  const term=await req('POST','/api/glossario',{token,body:{termo:'Test term',categoria:'Expansão',significado:'Um conceito novo',revisadoEm:'2026-10-05'}});assert.equal(term.status,200);
  assert.equal((await req('PUT',`/api/glossario/${term.body.id}`,{token,body:{exemplo:'Um exemplo de aplicação'}})).body.exemplo,'Um exemplo de aplicação');
  const bench=await req('GET','/api/benchmarks',{token});assert.equal(bench.body.length,34);assert.equal(Number(bench.body.find(b=>b.local==='Leblon').valorM2),265.93);
  assert.equal((await req('PUT',`/api/benchmarks/${bench.body[0].id}`,{token,body:{minimoM2:1000}})).status,400);
  assert.equal((await req('PUT',`/api/benchmarks/${bench.body[0].id}`,{token,body:{fonte:'Revisão local de teste'}})).body.fonte,'Revisão local de teste');
});

test('clientes: bairros de interesse em lista e contagem de ações das operações', async () => {
  const empresa = (await req('POST', '/api/empresas', { token, body: { nome: 'Rede bairros', areaMinima: 80, areaMaxima: 200, regioesInteresse: 'Méier; Tijuca' } })).body;
  const imovel = (await req('POST', '/api/imoveis', { token, body: { endereco: 'Rua bairros', bairro: 'Méier', cidade: 'Rio de Janeiro', areaTotal: 120 } })).body;
  assert.equal((await req('POST', '/api/oportunidades', { token, body: { imovelId: imovel.id, empresaId: empresa.id, modalidade: 'locacao_direta' } })).status, 200);
  // a mesma empresa não é apresentada duas vezes ao mesmo imóvel
  assert.equal((await req('POST', '/api/oportunidades', { token, body: { imovelId: imovel.id, empresaId: empresa.id } })).status, 409);
  const lista = (await req('GET', '/api/empresas', { token })).body;
  const e = lista.find((x) => x.id === empresa.id);
  assert.equal(e.regioesInteresse, 'Méier; Tijuca');
  assert.equal(e._count.oportunidades, 1);
  // a lista de imóveis não calcula mais demandas compatíveis
  const imoveis = (await req('GET', '/api/imoveis', { token })).body;
  assert.equal(Object.hasOwn(imoveis.find((i) => i.id === imovel.id), 'demandasCompativeis'), false);
});

test('auditoria 3: permissões, validação, API pública e sessão', async () => {
  const post = (path, body, t = token) => req('POST', path, { token: t, body });
  const put = (path, body, t = token) => req('PUT', path, { token: t, body });
  const im = (await post('/api/imoveis', { endereco: 'Rua auditoria', cidade: 'Rio', tipo: 'passagem_ponto', valorPonto: 90000, luvas: 5000, proprietario: 'Fulano', observacoes: 'interno', restricoesUso: 'sigilo' })).body;
  assert.equal(im.tipo, 'passagem_ponto');

  // C08/C10: edição valida e registro inexistente é 404
  assert.equal((await put('/api/imoveis/999999', { titulo: 'a' })).status, 404);
  for (const body of [{ areaTotal: 'abc' }, { aluguel: -1 }, { status: 'qualquer' }, { tipo: 'permuta' }, { endereco: '' }, { googleMapsUrl: 'javascript:alert(1)' }]) {
    assert.equal((await put(`/api/imoveis/${im.id}`, body)).status, 400, JSON.stringify(body));
  }
  assert.equal((await put(`/api/imoveis/${im.id}`, { latitude: -22.9, longitude: -43.2, categoria: '' })).status, 200);

  // C04: link de documento só http(s)
  assert.equal((await post(`/api/imoveis/${im.id}/documentos`, { nome: 'x', url: 'javascript:alert(1)', tipo: 'planta' })).status, 400);
  assert.equal((await post(`/api/imoveis/${im.id}/documentos`, { nome: 'x', tipo: 'planta' })).status, 400);
  assert.equal((await post('/api/imoveis/999999/documentos', { nome: 'x', url: 'https://a.b' })).status, 404);
  assert.equal((await post(`/api/imoveis/${im.id}/documentos`, { nome: 'Planta', url: 'https://a.b/p', tipo: 'planta' })).status, 200);

  // C03: API pública só devolve a lista permitida
  const pub = (await req('GET', `/api/public/imoveis/${im.id}`)).body;
  for (const k of ['luvas', 'valorPonto', 'restricoesUso', 'infraestrutura', 'proprietarioId', 'parceiroId', 'proprietario', 'observacoes', 'analises', 'googleDriveUrl']) {
    assert.equal(k in pub, false, k);
  }
  assert.equal(pub.codigo, im.codigo);
  assert.equal(pub.documentos.length, 1);

  // C09: perfil validado; admin não remove o próprio acesso
  const c = (await post('/api/usuarios', { nome: 'Comercial A3', email: 'a3@teste.dev', senha: '12345678', role: 'comercial' })).body;
  assert.equal((await post('/api/usuarios', { nome: 'X', email: 'x3@teste.dev', senha: '12345678', role: 'superuser' })).status, 400);
  assert.equal((await put(`/api/usuarios/${c.id}`, { role: 'superuser' })).status, 400);
  assert.equal((await put('/api/usuarios/99999', { nome: 'x' })).status, 404);
  const me = (await req('GET', '/api/auth/me', { token })).body;
  assert.equal((await put(`/api/usuarios/${me.id}`, { role: 'comercial' })).status, 400);
  assert.equal((await put(`/api/usuarios/${me.id}`, { ativo: false })).status, 400);

  // C02: comercial não exclui cadastros nem operações
  let ct = (await login('a3@teste.dev', '12345678')).body.token;
  const emp = (await post('/api/empresas', { nome: 'Empresa A3' })).body;
  const op = await post('/api/oportunidades', { imovelId: im.id, empresaId: emp.id });
  assert.equal(op.status, 200);
  assert.equal((await req('DELETE', `/api/imoveis/${im.id}`, { token: ct })).status, 403);
  assert.equal((await req('DELETE', `/api/empresas/${emp.id}`, { token: ct })).status, 403);
  assert.equal((await req('DELETE', `/api/oportunidades/${op.body.id}`, { token: ct })).status, 403);

  // C11: mesma apresentação não duplica
  assert.equal((await post('/api/oportunidades', { imovelId: im.id, empresaId: emp.id })).status, 409);
  assert.equal((await req('DELETE', '/api/oportunidades/99999', { token })).status, 404);
  assert.equal((await req('DELETE', `/api/oportunidades/${op.body.id}`, { token })).status, 200);

  // C06: trocar a senha derruba o token antigo e devolve um novo
  await new Promise((r) => setTimeout(r, 1100));
  const troca = await post('/api/auth/trocar-senha', { atual: '12345678', nova: '87654321' }, ct);
  assert.equal(troca.status, 200);
  assert.equal((await req('GET', '/api/auth/me', { token: troca.body.token })).status, 200);
  assert.equal((await req('GET', '/api/auth/me', { token: ct })).status, 401);
});

test('imóvel: composição de áreas, link do Maps automático e galeria pública', async () => {
  const criado = await req('POST', '/api/imoveis', { token, body: {
    endereco: 'Rua das Áreas', numero: '10', bairro: 'Centro', cidade: 'Rio de Janeiro', areaTotal: 350,
    areas: [{ nome: 'Térreo', area: 200 }, { nome: '2º piso', area: '120' }, { nome: 'Jirau', area: 30 }, { nome: '', area: '' }],
  } });
  assert.equal(criado.status, 200);
  assert.deepEqual(criado.body.areas.map((a) => [a.nome, Number(a.area)]), [['Térreo', 200], ['2º piso', 120], ['Jirau', 30]]);
  assert.equal(Number(criado.body.jirau), 30);
  assert.match(criado.body.googleMapsUrl, /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=Rua%20das%20%C3%81reas%2C%2010/);
  const id = criado.body.id;

  for (const areas of [[{ nome: 'Sem metragem' }], [{ nome: '', area: 10 }], [{ nome: 'Negativa', area: -1 }], 'texto']) {
    assert.equal((await req('PUT', `/api/imoveis/${id}`, { token, body: { areas } })).status, 400, JSON.stringify(areas));
  }
  // edição troca a composição inteira e o link acompanha o endereço
  const editado = await req('PUT', `/api/imoveis/${id}`, { token, body: { numero: '99', areas: [{ nome: 'Loja', area: 90 }] } });
  assert.deepEqual(editado.body.areas.map((a) => a.nome), ['Loja']);
  assert.equal(editado.body.jirau, null);
  assert.match(editado.body.googleMapsUrl, /%2C%2099/);
  // sem "areas" no corpo a composição é preservada; link colado manualmente também
  const manual = await req('PUT', `/api/imoveis/${id}`, { token, body: { googleMapsUrl: 'https://maps.app.goo.gl/abc', numero: '5' } });
  assert.equal(manual.body.areas.length, 1);
  assert.equal(manual.body.googleMapsUrl, 'https://maps.app.goo.gl/abc');
  assert.equal((await req('GET', `/api/imoveis/${id}`, { token })).body.areas.length, 1);
  assert.deepEqual((await req('GET', `/api/public/imoveis/${id}`)).body.areas, [{ nome: 'Loja', area: '90' }]);

  const galeria = await fetch(`${getBase()}/apresentacao/${id}/fotos`);
  assert.equal(galeria.status, 200);
  assert.match(await galeria.text(), /ainda não tem fotos/);
  assert.equal((await fetch(`${getBase()}/apresentacao/999999/fotos`)).status, 404);
});

test('apresentação: mapa ao lado da foto quando há coordenadas; sem luvas', async () => {
  const im = (await req('POST', '/api/imoveis', { token, body: { endereco: 'Rua do Mapa', cidade: 'Rio de Janeiro', cdu: 30000, luvas: 9000, latitude: -22.9068, longitude: -43.1729 } })).body;
  const html = await (await fetch(`${getBase()}/apresentacao/${im.id}`)).text();
  assert.match(html, /class="hero-row has-map"/);
  assert.equal((html.match(/tile\.openstreetmap\.org\/16\//g) || []).length, 15);
  assert.match(html, /Cessão de direito de uso \(CDU\)/);
  assert.doesNotMatch(html, /Luvas/);
  const semCoord = (await req('POST', '/api/imoveis', { token, body: { endereco: 'Rua sem mapa', cidade: 'Rio de Janeiro' } })).body;
  assert.match(await (await fetch(`${getBase()}/apresentacao/${semCoord.id}`)).text(), /class="hero-row"/);
});

test('inteligência: Censo 2022 por bairro, entorno da rua e documento sem campos vazios', () => {
  const censo2022 = require('../src/services/censo2022');
  const { resumir } = require('../src/services/entorno');
  const { renderInteligencia } = require('../src/templates/inteligencia');

  const rio = censo2022.municipio(3304557);
  assert.equal(rio.populacao, 6211223);
  const centro = censo2022.bairro(3304557, 'centro');
  assert.equal(centro.populacao, 23774);
  assert.equal(centro.rendaMediana, 3000);
  assert.equal(centro.faixas.length, censo2022.FAIXAS.length);
  assert.equal(censo2022.bairro(3304557, 'Tijúca').nome, 'Tijuca');
  // "Barra" casa com mais de um bairro: sem palpite
  assert.equal(censo2022.bairro(3304557, 'Barra'), null);
  assert.equal(censo2022.bairro(3304557, 'Bairro que não existe'), null);

  const geo = { lat: -22.9036, lon: -43.1739 };
  const perto = (dLat, tags, type = 'node') => ({ type, lat: geo.lat + dLat, lon: geo.lon, tags });
  const ent = resumir([
    perto(0.0003, { amenity: 'restaurant', name: 'Bistrô', 'addr:street': 'Rua da Assembléia' }),
    perto(0.003, { shop: 'supermarket', name: 'Mercado A' }),
    perto(0.006, { shop: 'supermarket', name: 'Mercado B' }),
    perto(0.002, { highway: 'bus_stop' }),
    perto(0.001, { railway: 'station', name: 'Carioca' }),
    perto(0.001, { amenity: 'bench' }),
    { type: 'way', center: geo, tags: { highway: 'pedestrian', name: 'Rua da Assembléia' } },
  ], geo, { endereco: 'Rua da Assembleia' });
  const linha = (rotulo) => ent.linhas.find((l) => l.rotulo.startsWith(rotulo));
  assert.deepEqual([linha('Supermercados').r500, linha('Supermercados').r1000], [1, 2]);
  assert.equal(linha('Alimentação').r500, 1);
  assert.equal(ent.total1000, 3);
  assert.equal(ent.transporte[0].r500, 1);
  assert.equal(ent.via.tipo, 'Calçadão (pedestres)');
  assert.deepEqual(ent.destaques.map((d) => d.nome), ['Carioca', 'Mercado A']);
  assert.deepEqual(ent.naRua.map((n) => n.nome), ['Bistrô']);

  const imovel = { codigo: 'PB-T', endereco: 'Rua da Assembleia', numero: '58', bairro: 'Centro', cidade: 'Rio de Janeiro', uf: 'RJ', tipo: 'locacao', status: 'disponivel' };
  const analise = { score: 70, resumo: 'ok', criadoEm: new Date(), conteudoJson: '{}' };
  const html = renderInteligencia(imovel, analise, { censo: { municipio: rio, bairro: centro, temBairros: true }, entorno: ent, geo, fonte: 'x' });
  assert.match(html, /Bairro Centro/);
  assert.match(html, /23\.774/);
  assert.match(html, /Renda — Censo 2022/);
  assert.match(html, /Carioca/);
  assert.match(html, /Leitura dos dados/);
  assert.doesNotMatch(html, /undefined|NaN/);
  // bairro fora da base: documento explica e segue só com o município
  const semBairro = renderInteligencia({ ...imovel, bairro: 'Xyz' }, analise, { censo: { municipio: rio, bairro: null, temBairros: true }, entorno: null, geo: null, fonte: 'x' });
  assert.match(semBairro, /Bairro não identificado/);
  assert.doesNotMatch(semBairro, /O que existe ao redor do ponto/);
  assert.match(semBairro, /Seção omitida:<\/strong> entorno da rua/);
  assert.doesNotMatch(semBairro, /undefined|NaN/);
});

test('modelos de contrato: todos leem, só admin mantém, link validado', async () => {
  const criar = (body, t = token) => req('POST', '/api/modelos-contrato', { token: t, body });
  assert.equal((await criar({ nome: 'Locação', url: 'javascript:alert(1)' })).status, 400);
  assert.equal((await criar({ url: 'https://a.b/c.docx' })).status, 400);
  assert.equal((await criar({ nome: 'X', url: 'https://a.b', categoria: 'inventada' })).status, 400);
  const ok = await criar({ nome: ' Locação comercial ', categoria: 'locacao', url: 'https://a.b/locacao.docx' });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.nome, 'Locação comercial');
  await req('POST', '/api/usuarios', { token, body: { nome: 'Comercial MC', email: 'mc@teste.dev', senha: '12345678', role: 'comercial' } });
  const ct = (await login('mc@teste.dev', '12345678')).body.token;
  assert.equal((await req('GET', '/api/modelos-contrato', { token: ct })).body.length, 1);
  assert.equal((await criar({ nome: 'Y', url: 'https://a.b' }, ct)).status, 403);
  assert.equal((await req('DELETE', `/api/modelos-contrato/${ok.body.id}`, { token: ct })).status, 403);
  assert.equal((await req('PUT', `/api/modelos-contrato/${ok.body.id}`, { token, body: { descricao: 'Padrão 2026' } })).body.descricao, 'Padrão 2026');
  assert.equal((await req('PUT', '/api/modelos-contrato/99999', { token, body: { descricao: 'x' } })).status, 404);
  assert.equal((await req('DELETE', `/api/modelos-contrato/${ok.body.id}`, { token })).status, 200);
});

test('proposta comercial: campos do modelo, numeração, documento e regras', async () => {
  const empresa = (await req('POST', '/api/empresas', { token, body: { nome: 'Rede Modelo S.A.' } })).body;
  const outra = (await req('POST', '/api/empresas', { token, body: { nome: 'Outra Rede' } })).body;
  const demanda = (await req('POST', '/api/demandas', { token, body: { empresaId: empresa.id, titulo: 'Expansão 2027' } })).body;
  const criar = (body) => req('POST', '/api/propostas', { token, body });
  assert.equal((await criar({ marca: 'Sem cliente' })).status, 400);
  assert.equal((await criar({ empresaId: outra.id, demandaId: demanda.id })).status, 400);
  assert.equal((await criar({ empresaId: empresa.id, data: '2026-02-30' })).status, 400);
  assert.equal((await criar({ empresaId: empresa.id, status: 'inventado' })).status, 400);

  const p = await criar({ empresaId: empresa.id, demandaId: demanda.id, marca: ' Marca <b>X</b> ', areaAtuacao: 'Grande Rio', honorariosProspeccao: 'R$ 10.000,00 por unidade' });
  assert.equal(p.status, 200);
  assert.match(p.body.numero, /^PC-\d{4}-\d{3}$/);
  assert.match(p.body.data, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(p.body.marca, 'Marca <b>X</b>');
  const segunda = await criar({ empresaId: empresa.id });
  assert.notEqual(segunda.body.numero, p.body.numero);
  assert.equal((await req('PUT', `/api/propostas/${segunda.body.id}`, { token, body: { numero: p.body.numero } })).status, 409);
  assert.equal((await req('PUT', `/api/propostas/${p.body.id}`, { token, body: { numero: '' } })).status, 400);
  assert.equal((await req('PUT', `/api/propostas/${p.body.id}`, { token, body: { validade: '30 dias', status: 'enviada' } })).body.validade, '30 dias');
  assert.equal((await req('GET', `/api/propostas?demandaId=${demanda.id}`, { token })).body.length, 1);

  // documento: restrito, com os campos preenchidos e os pendentes destacados como no modelo
  assert.equal((await fetch(`${getBase()}/proposta/${p.body.id}`)).status, 401);
  const arquivoToken = (await req('GET', '/api/auth/token-arquivo', { token })).body.token;
  assert.equal((await fetch(`${getBase()}/proposta/99999?token=${arquivoToken}`)).status, 404);
  const html = await (await fetch(`${getBase()}/proposta/${p.body.id}?token=${arquivoToken}`)).text();
  assert.equal((html.match(/<section class="pg/g) || []).length, 12);
  for (const trecho of ['Assessoria Estratégica de', 'Mensagem da Proposta', 'Fluxo de Aprovação', 'Entregas Previstas', 'Termo de Aceite', 'Rede Modelo S.A.', 'Grande Rio', 'R$ 10.000,00 por unidade', '30 dias', '[CONTRATANTE]', '[QUANTIDADE DE UNIDADES]']) {
    assert.ok(html.includes(trecho), trecho);
  }
  assert.ok(html.includes('Marca &lt;b&gt;X&lt;/b&gt;'));
  assert.ok(!html.includes('[NOME DA EMPRESA CLIENTE]'));

  // empresa com proposta não é excluída; só admin exclui proposta
  assert.equal((await req('DELETE', `/api/empresas/${outra.id}`, { token })).status, 200);
  assert.equal((await req('DELETE', `/api/propostas/${segunda.body.id}`, { token })).status, 200);
});

test('documentos do imóvel: RGI, regimento e DWG; só os tipos públicos vão à apresentação', async () => {
  const im = (await req('POST', '/api/imoveis', { token, body: { endereco: 'Rua dos Docs', cidade: 'Rio de Janeiro' } })).body;
  const enviar = (rota, arquivo, tipo, mime) => {
    const fd = new FormData();
    fd.append('tipo', tipo);
    fd.append('nome', `Arq ${tipo}`);
    fd.append(rota.endsWith('fotos') ? 'fotos' : 'arquivo', new Blob(['conteudo'], { type: mime }), arquivo);
    return fetch(`${getBase()}/api/imoveis/${im.id}/${rota}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
  };
  const link = (tipo) => req('POST', `/api/imoveis/${im.id}/documentos`, { token, body: { tipo, nome: `Link ${tipo}`, url: `https://exemplo.com/${tipo}` } });

  // tipos novos aceitos; o antigo "rig" (erro de digitação) não existe mais
  for (const tipo of ['rgi', 'regimento', 'dwg', 'convencao', 'doc_locatario']) assert.equal((await link(tipo)).status, 200, tipo);
  assert.equal((await link('rig')).status, 400);

  // DWG sobe como documento (octet-stream ou tipo do AutoCAD), mas não como foto, e outros executáveis não passam
  assert.equal((await enviar('documentos', 'planta.dwg', 'dwg', 'application/octet-stream')).status, 200);
  assert.equal((await enviar('documentos', 'planta2.DWG', 'dwg', 'image/vnd.dwg')).status, 200);
  assert.equal((await enviar('fotos', 'planta.dwg', 'dwg', 'application/octet-stream')).status, 400);
  assert.equal((await enviar('documentos', 'virus.exe', 'outro', 'application/octet-stream')).status, 400);

  // público: RGI e regimento aparecem; DWG e documentação do locatário ficam internos
  const publicos = (await req('GET', `/api/public/imoveis/${im.id}`)).body.documentos.map((d) => d.tipo).sort();
  assert.deepEqual(publicos, ['convencao', 'regimento', 'rgi']);
});

test('apresentação: indicadores no rodapé da 1ª folha e QR code no cabeçalho', () => {
  const { renderApresentacao } = require('../src/templates/apresentacao');
  const imovel = { codigo: 'PB-IND', titulo: 'Loja teste', endereco: 'Rua A', numero: '1', bairro: 'Centro', cidade: 'Rio de Janeiro', uf: 'RJ', tipo: 'locacao', status: 'disponivel', aluguel: 10000, areaTotal: 100, criadoEm: '2026-10-01', fotos: [], documentos: [] };
  const contexto = {
    bairro: { nome: 'Centro', populacao: 23774, rendaMedia: 4195.82, domiciliosOcupados: 12996 },
    entorno: { total500: 393, destaques: [{ rotulo: 'Banco', nome: 'Itaú', dist: 180 }] },
  };
  const html = renderApresentacao(imovel, 'data:image/png;base64,AAAA', { contexto });
  const primeira = html.split('<article class="sheet details"')[0];
  const cabecalho = primeira.match(/<header class="document-header banner">[\s\S]*?<\/header>/)[0];

  assert.match(cabecalho, /class="qr"/);
  assert.match(cabecalho, /QR code para abrir a localização/);
  assert.doesNotMatch(primeira.replace(cabecalho, ''), /class="qr"/);
  const rodape = primeira.match(/<div class="first-foot">([\s\S]*)<\/div>\s*<\/article>/)[1];
  assert.match(rodape, /Indicadores de Inteligência Territorial e Comercial/);
  assert.equal((rodape.match(/<div><span class="small-label">/g) || []).length, 4);
  assert.match(rodape, /class="document-footer"/);
  assert.doesNotMatch(html, /Contexto do ponto|Fontes: IBGE/);
  // a lista de equipamentos não fica sob os cartões: vai para a seção de infraestrutura da 2ª folha
  assert.doesNotMatch(rodape, /Itaú|class="nearby"/);
  assert.match(html.split('<article class="sheet details"')[1], /Infraestrutura Urbana e Equipamentos de Apoio no Entorno[\s\S]*Itaú/);
  // sem dados, não sobra bloco vazio
  const semDados = renderApresentacao(imovel, 'data:image/png;base64,AAAA', {}).replace(/<style>[\s\S]*?<\/style>/, '');
  assert.doesNotMatch(semDados, /first-foot|Indicadores de Inteligência/);
});

test('apresentação: ABL só no destaque, Flash de Mercado no lugar das fotos, documentos em grade e visita no fim da 2ª folha', () => {
  const { renderApresentacao } = require('../src/templates/apresentacao');
  const base = { id: 9, codigo: 'PB-LAY', titulo: 'Loja layout', endereco: 'Rua B', bairro: 'Centro', cidade: 'Rio de Janeiro', uf: 'RJ', tipo: 'locacao', status: 'disponivel', aluguel: 10000, areaTotal: 100, areaUtil: 90, peDireito: 4, criadoEm: '2026-10-01' };
  const fotos = Array.from({ length: 8 }, (_, n) => ({ arquivo: `f${n}.jpg`, legenda: `Foto ${n}` }));
  const docs = Array.from({ length: 5 }, (_, n) => ({ tipo: 'planta', nome: `Planta ${n}`, url: `https://x.com/p${n}` }));
  const html = renderApresentacao({ ...base, fotos, documentos: docs, descricao: 'Texto' }, 'data:image/png;base64,AAAA', { completa: true });
  const [primeira, segunda] = html.split('<article class="sheet details"');
  const corpo = (t) => t.replace(/<style>[\s\S]*?<\/style>/, '');

  // ABL: nome curto, só no destaque; fora de "Características do imóvel"
  assert.match(primeira, /<span class="small-label">ABL<\/span><span class="card-name">Área bruta locável<\/span>/);
  assert.match(primeira, /<span class="small-label">OPEX<\/span><span class="card-name">Custo total de ocupação<\/span>/);
  assert.doesNotMatch(corpo(html), /Custo mensal/);
  assert.doesNotMatch(primeira.match(/Características do imóvel[\s\S]*?<\/section>/)[0], /ABL/);

  // 2ª folha sem fotos: no lugar, o "Flash de Mercado" (só quando já há análise)
  assert.equal((segunda.match(/<figure data-foto=/g) || []).length, 0);
  assert.doesNotMatch(segunda, /Ver todas as fotos|class="gallery"/);
  assert.doesNotMatch(corpo(segunda), /Flash de Mercado/);
  const analise = { score: 72, resumo: 'Ponto com bom fluxo.', modelo: 'regras', conteudoJson: JSON.stringify({ pontosFortes: ['Esquina'], pontosAtencao: ['Ruído'], segmentosRecomendados: ['Farmácia'], recomendacao: 'Priorizar.' }) };
  const comFlash = renderApresentacao({ ...base, fotos, documentos: docs, descricao: 'Texto', analises: [analise] }, 'data:image/png;base64,AAAA', { completa: true }).split('<article class="sheet details"')[1];
  assert.match(corpo(comFlash), /Flash de Mercado[\s\S]*72[\s\S]*Esquina[\s\S]*Ruído[\s\S]*Farmácia/);

  // documentos em grade; 6 no papel (resto só na versão digital)
  assert.match(segunda, /class="doc-grid"/);
  assert.equal((segunda.match(/<li class="">/g) || []).length, 5);

  // visita: no fim da 2ª folha; na 1ª só como faixa do resumo impresso; rodapé verde só na 2ª folha
  assert.match(primeira, /class="contact visit-resumo"/);
  assert.match(segunda, /<section class="contact ">/);
  assert.ok(segunda.indexOf('class="contact ') > segunda.indexOf('Documentos técnicos para consulta'));
  assert.ok(segunda.indexOf('class="contact ') < segunda.indexOf('document-footer band'));
  assert.doesNotMatch(primeira, /document-footer band/);
  assert.match(primeira, /class="document-header banner"/);
  assert.doesNotMatch(segunda.match(/<header[\s\S]*?<\/header>/)[0], /banner/);

  // sem 2ª folha, a visita fica na 1ª folha como sempre
  const semSegunda = renderApresentacao({ ...base, fotos: [], documentos: [] }, 'data:image/png;base64,AAAA', {});
  assert.doesNotMatch(semSegunda, /class="sheet details"/);
  assert.match(semSegunda, /<section class="contact ">/);
  assert.doesNotMatch(semSegunda, /visit-resumo"/);
});

test('imóvel: coordenadas exatas validadas e usadas no link do Google Maps', async () => {
  const im = (await req('POST', '/api/imoveis', { token, body: { endereco: 'Rua das Coordenadas', numero: '7', cidade: 'Rio de Janeiro', bairro: 'Centro' } })).body;
  assert.match(im.googleMapsUrl, /query=Rua%20das%20Coordenadas/);
  const put = (body) => req('PUT', `/api/imoveis/${im.id}`, { token, body });
  assert.equal((await put({ latitude: 95, longitude: -43 })).status, 400);
  assert.equal((await put({ latitude: -22.9, longitude: 181 })).status, 400);
  assert.equal((await put({ latitude: -22.9068 })).status, 400);
  const ok = await put({ latitude: -22.9068, longitude: -43.1729 });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.googleMapsUrl, 'https://www.google.com/maps/search/?api=1&query=-22.9068%2C-43.1729');
  // a apresentação (QR code e mapa) usa o mesmo ponto
  const html = await (await fetch(`${getBase()}/apresentacao/${im.id}`)).text();
  assert.match(html, /query=-22\.9068%2C-43\.1729/);
  assert.match(html, /<figcaption>Localização<span>/);
  // limpar as coordenadas volta ao endereço
  const limpo = await put({ latitude: null, longitude: null });
  assert.match(limpo.body.googleMapsUrl, /query=Rua%20das%20Coordenadas/);
});

test('mapas: Google Geocoding e Static Maps com cache; sem chave cai no OpenStreetMap', async () => {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const mapas = require('../src/services/mapas');
  const original = { fetch: global.fetch, chave: process.env.GOOGLE_MAPS_API_KEY, cache: process.env.MAPAS_CACHE_DIR };
  process.env.MAPAS_CACHE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'pb-mapas-'));
  const chamadas = [];
  let respostaGeocode = { status: 'OK', results: [{ geometry: { location: { lat: -22.9036, lng: -43.1739 }, location_type: 'ROOFTOP' } }] };
  let tipoImagem = 'image/png';
  global.fetch = async (url, opts) => {
    const u = String(url);
    if (u.includes('maps.googleapis.com/maps/api/geocode')) { chamadas.push('geocode'); return new Response(JSON.stringify(respostaGeocode), { headers: { 'content-type': 'application/json' } }); }
    if (u.includes('maps.googleapis.com/maps/api/staticmap')) { chamadas.push('static'); assert.match(u, /markers=color%3A0x153c34/); return new Response(Buffer.from('PNGFAKE'), { headers: { 'content-type': tipoImagem } }); }
    if (u.includes('nominatim.openstreetmap.org')) { chamadas.push('osm'); return new Response('[]', { headers: { 'content-type': 'application/json' } }); }
    return original.fetch(url, opts);
  };
  try {
    const imovel = { endereco: 'Rua da Assembleia', numero: '58', bairro: 'Centro', cidade: 'Rio de Janeiro', uf: 'RJ' };

    // coordenadas cadastradas vencem tudo e não chamam serviço nenhum
    assert.deepEqual(await mapas.geocode({ ...imovel, latitude: -22.1, longitude: -43.2 }), { lat: -22.1, lon: -43.2, fonte: 'cadastro', precisao: 'exata' });
    assert.equal(chamadas.length, 0);

    // com chave: Google, no nível do número, e a segunda busca vem do cache em disco
    process.env.GOOGLE_MAPS_API_KEY = 'chave-de-teste';
    const g = await mapas.geocode(imovel);
    assert.deepEqual([g.lat, g.lon, g.fonte, g.precisao], [-22.9036, -43.1739, 'Google Maps', 'endereco']);
    await mapas.geocode(imovel);
    assert.deepEqual(chamadas, ['geocode']);

    // resultado só de rua/bairro é marcado como aproximado
    respostaGeocode = { status: 'OK', results: [{ geometry: { location: { lat: -22.9, lng: -43.1 }, location_type: 'GEOMETRIC_CENTER' } }] };
    assert.equal((await mapas.geocode({ ...imovel, numero: '999' })).precisao, 'rua');

    // imagem do mapa: uma chamada, depois cache; resposta que não é imagem vira null
    const img = await mapas.mapaEstatico(g);
    assert.equal(img.toString(), 'PNGFAKE');
    await mapas.mapaEstatico(g);
    assert.equal(chamadas.filter((c) => c === 'static').length, 1);
    tipoImagem = 'application/json';
    assert.equal(await mapas.mapaEstatico({ ...g, lat: -20 }), null);
    tipoImagem = 'image/png';

    // rota pública do mapa e documento apontando para ela (imóvel com coordenadas cadastradas)
    const im = (await req('POST', '/api/imoveis', { token, body: { endereco: 'Rua do Mapa Google', cidade: 'Rio de Janeiro', latitude: -22.95, longitude: -43.2 } })).body;
    const rota = await fetch(`${getBase()}/apresentacao/${im.id}/mapa.png`);
    assert.equal(rota.status, 200);
    assert.equal(rota.headers.get('content-type'), 'image/png');
    assert.equal(await rota.text(), 'PNGFAKE');
    const html = await (await fetch(`${getBase()}/apresentacao/${im.id}`)).text();
    assert.match(html, new RegExp(`src="/apresentacao/${im.id}/mapa\\.png"`));
    assert.doesNotMatch(html, /tile\.openstreetmap/);

    // sem chave: mapa de tiles do OpenStreetMap e rota da imagem indisponível
    delete process.env.GOOGLE_MAPS_API_KEY;
    assert.equal(await mapas.mapaEstatico(g), null);
    assert.equal((await fetch(`${getBase()}/apresentacao/${im.id}/mapa.png`)).status, 404);
    assert.match(await (await fetch(`${getBase()}/apresentacao/${im.id}`)).text(), /tile\.openstreetmap\.org/);
    assert.equal(await mapas.geocode(imovel), null); // OSM simulado sem resultados
  } finally {
    global.fetch = original.fetch;
    if (original.chave === undefined) delete process.env.GOOGLE_MAPS_API_KEY; else process.env.GOOGLE_MAPS_API_KEY = original.chave;
    if (original.cache === undefined) delete process.env.MAPAS_CACHE_DIR; else process.env.MAPAS_CACHE_DIR = original.cache;
  }
});

test('geocodificação: abreviações do endereço são expandidas antes de buscar no OpenStreetMap', async () => {
  const { expandirAbreviacoes } = require('../src/services/mapas');
  assert.equal(expandirAbreviacoes('Av. Min. Edgard Romero'), 'Avenida Ministro Edgard Romero');
  assert.equal(expandirAbreviacoes('R. Dr. Pereira'), 'Rua Doutor Pereira');
  assert.equal(expandirAbreviacoes('Av Brasil'), 'Avenida Brasil');
  assert.equal(expandirAbreviacoes('Estr. do Pau Ferro'), 'Estrada do Pau Ferro');
  // sem ponto, só o tipo de logradouro no início é expandido; nomes próprios ficam como estão
  assert.equal(expandirAbreviacoes('Rua Min Guimarães'), 'Rua Min Guimarães');
  assert.equal(expandirAbreviacoes('Avenida das Américas'), 'Avenida das Américas');

  // tentativas em ordem: estruturada → original → abreviações expandidas → só a rua (marcada como aproximada)
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const mapas = require('../src/services/mapas');
  const original = { fetch: global.fetch, cache: process.env.MAPAS_CACHE_DIR, chave: process.env.GOOGLE_MAPS_API_KEY };
  process.env.MAPAS_CACHE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'pb-osm-'));
  delete process.env.GOOGLE_MAPS_API_KEY;
  const consultas = [];
  global.fetch = async (url, opts) => {
    const u = String(url);
    if (!u.includes('nominatim.openstreetmap.org')) return original.fetch(url, opts);
    const params = new URL(u).searchParams;
    // a primeira tentativa é a busca estruturada (número + logradouro)
    const q = params.get('q') ?? `street=${params.get('street')}`;
    consultas.push(q);
    // só a forma por extenso, sem número, existe no mapa
    const achou = q.startsWith('Avenida Ministro Edgard Romero, Madureira');
    return new Response(JSON.stringify(achou ? [{ lat: '-22.86', lon: '-43.33', type: 'residential', address: { city: 'Rio de Janeiro', suburb: 'Madureira', road: 'Avenida Ministro Edgard Romero' } }] : []), { headers: { 'content-type': 'application/json' } });
  };
  try {
    const imovel = { endereco: 'Av. Min. Edgard Romero', numero: '36', bairro: 'Madureira', cidade: 'Rio de Janeiro', uf: 'RJ' };
    const geo = await mapas.geocode(imovel);
    assert.deepEqual([geo.lat, geo.precisao], [-22.86, 'rua']);
    assert.deepEqual(consultas, ['street=36 Avenida Ministro Edgard Romero', 'Av. Min. Edgard Romero, 36, Madureira, Rio de Janeiro, RJ, Brasil', 'Avenida Ministro Edgard Romero, 36, Madureira, Rio de Janeiro, RJ, Brasil', 'Avenida Ministro Edgard Romero, Madureira, Rio de Janeiro, RJ, Brasil']);
    // resultado guardado: nenhuma consulta nova
    await mapas.geocode(imovel);
    assert.equal(consultas.length, 4);
    // endereço que não existe: não repete a busca a cada visita
    const fantasma = { endereco: 'Rua Que Nao Existe', bairro: 'Centro', cidade: 'Rio de Janeiro', uf: 'RJ' };
    assert.equal(await mapas.geocode(fantasma), null);
    const antes = consultas.length;
    assert.equal(await mapas.geocode(fantasma), null);
    assert.equal(consultas.length, antes);
  } finally {
    global.fetch = original.fetch;
    if (original.cache === undefined) delete process.env.MAPAS_CACHE_DIR; else process.env.MAPAS_CACHE_DIR = original.cache;
    if (original.chave !== undefined) process.env.GOOGLE_MAPS_API_KEY = original.chave;
  }
});

test('parceiros: campos por tipo (CRECI físico/jurídico, OAB), pessoa física/jurídica e documento válido', async () => {
  const criar = (body) => req('POST', '/api/parceiros', { token, body });
  const msg = async (body) => (await criar(body)).body.error;

  // corretor: CRECI e UF obrigatórios; só dígitos
  assert.match(await msg({ nome: 'Corretor A', tipo: 'corretor', tipoPessoa: 'pf' }), /CRECI físico/);
  assert.match(await msg({ nome: 'Corretor A', tipo: 'corretor', tipoPessoa: 'pj' }), /CRECI jurídico/);
  assert.match(await msg({ nome: 'Corretor A', tipo: 'corretor', tipoPessoa: 'pf', creci: '12345' }), /UF do CRECI/);
  assert.match(await msg({ nome: 'Corretor A', tipo: 'corretor', tipoPessoa: 'pf', creci: '12', creciUf: 'RJ' }), /CRECI inválido/);
  const pf = await criar({ nome: ' Maria Corretora ', tipo: 'corretor', tipoPessoa: 'pf', creci: 'CRECI 12.345-F', creciUf: 'rj', documento: '111.444.777-35', oab: '999', responsavel: 'ignorado' });
  assert.equal(pf.status, 200);
  assert.deepEqual([pf.body.nome, pf.body.creci, pf.body.creciUf, pf.body.documento, pf.body.tipoPessoa], ['Maria Corretora', '12345', 'RJ', '11144477735', 'pf']);
  assert.equal(pf.body.oab, null);          // OAB não pertence ao corretor
  assert.equal(pf.body.responsavel, null);  // responsável só para pessoa jurídica

  // documento: dígitos verificadores conforme a pessoa
  assert.equal(await msg({ nome: 'X', tipo: 'indicador', tipoPessoa: 'pf', documento: '111.444.777-36' }), 'CPF inválido');
  assert.equal(await msg({ nome: 'X', tipo: 'indicador', tipoPessoa: 'pj', documento: '11.222.333/0001-82' }), 'CNPJ inválido');
  assert.equal(await msg({ nome: 'X', tipo: 'indicador', tipoPessoa: 'pj', documento: '111.444.777-35' }), 'CNPJ inválido');

  // imobiliária: sempre pessoa jurídica, com CRECI jurídico e responsável
  assert.equal(await msg({ nome: 'Imob', tipo: 'imobiliaria', tipoPessoa: 'pf', creci: '1234', creciUf: 'RJ' }), 'Imobiliária é sempre pessoa jurídica');
  const pj = await criar({ nome: 'Imobiliária Centro Ltda', tipo: 'imobiliaria', tipoPessoa: 'pj', creci: '9876', creciUf: 'RJ', documento: '11.222.333/0001-81', responsavel: 'João Responsável' });
  assert.equal(pj.status, 200);
  assert.deepEqual([pj.body.tipoPessoa, pj.body.creci, pj.body.responsavel], ['pj', '9876', 'João Responsável']);

  // advogado: OAB e UF obrigatórias; sem CRECI
  assert.match(await msg({ nome: 'Dr. Paulo', tipo: 'advogado', tipoPessoa: 'pf' }), /número da OAB/);
  assert.match(await msg({ nome: 'Dr. Paulo', tipo: 'advogado', tipoPessoa: 'pf', oab: '123456' }), /UF da OAB/);
  assert.match(await msg({ nome: 'Dr. Paulo', tipo: 'advogado', tipoPessoa: 'pf', oab: '123456', oabUf: 'XX' }), /UF inválida/);
  const adv = await criar({ nome: 'Dr. Paulo', tipo: 'advogado', tipoPessoa: 'pf', oab: 'OAB/RJ 123.456', oabUf: 'RJ', creci: '555', creciUf: 'RJ' });
  assert.equal(adv.status, 200);
  assert.deepEqual([adv.body.oab, adv.body.oabUf, adv.body.creci], ['123456', 'RJ', null]);

  // tipo inventado e edição trocando de tipo limpam o que não vale mais
  assert.equal(await msg({ nome: 'X', tipo: 'inventado' }), 'Tipo de parceiro inválido');
  const troca = await req('PUT', `/api/parceiros/${pf.body.id}`, { token, body: { tipo: 'indicador', status: '' } });
  assert.equal(troca.status, 200);
  assert.deepEqual([troca.body.tipo, troca.body.creci, troca.body.status], ['indicador', null, 'ativo']);
  assert.equal((await req('PUT', '/api/parceiros/99999', { token, body: { nome: 'x' } })).status, 404);
});

test('apresentação: rodapé da 2ª folha traz o vínculo do parceiro com CRECI físico/jurídico ou OAB, sem contato', async () => {
  const novo = async (parceiro) => {
    const p = (await req('POST', '/api/parceiros', { token, body: { telefone: '(21) 99999-0000', email: 'segredo@parceiro.com', ...parceiro } })).body;
    const im = (await req('POST', '/api/imoveis', { token, body: { endereco: 'Rua dos Vínculos', cidade: 'Rio de Janeiro', descricao: 'Texto', parceiroId: p.id } })).body;
    return (await (await fetch(`${getBase()}/apresentacao/${im.id}`)).text()).replace(/<style>[\s\S]*?<\/style>/, '');
  };
  const rodape = (html) => html.split('<article class="sheet details"')[1].match(/<footer class="document-footer band">[\s\S]*?<\/footer>/)[0].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

  const fisica = rodape(await novo({ nome: 'Maria Corretora', tipo: 'corretor', tipoPessoa: 'pf', creci: '12345', creciUf: 'RJ' }));
  assert.match(fisica, /Corretor Maria Corretora CRECI Físico RJ-12345/);
  const juridica = rodape(await novo({ nome: 'Imobiliária Centro', tipo: 'imobiliaria', tipoPessoa: 'pj', creci: '9876', creciUf: 'RJ' }));
  assert.match(juridica, /Imobiliária Imobiliária Centro CRECI Jurídico RJ-9876/);
  const advogado = rodape(await novo({ nome: 'Dr. Paulo', tipo: 'advogado', tipoPessoa: 'pf', oab: '123456', oabUf: 'RJ' }));
  assert.match(advogado, /Advogado Dr\. Paulo OAB RJ-123456/);

  // documento público: o contato do parceiro nunca vai junto
  const html = await novo({ nome: 'Sigilo', tipo: 'corretor', tipoPessoa: 'pf', creci: '5555', creciUf: 'SP' });
  assert.doesNotMatch(html, /99999-0000|segredo@parceiro/);
  // sem parceiro, sem bloco de vínculo
  const sem = (await req('POST', '/api/imoveis', { token, body: { endereco: 'Rua Sem Vínculo', cidade: 'Rio de Janeiro', descricao: 'Texto' } })).body;
  assert.doesNotMatch(await (await fetch(`${getBase()}/apresentacao/${sem.id}`)).text(), /class="partner"/);
});

test('operador do ponto: mesmo cadastro dos proprietários, com papel, e vínculo próprio no imóvel', async () => {
  const criar = (body) => req('POST', '/api/proprietarios', { token, body });
  assert.equal((await criar({ nome: 'X', papel: 'inventado' })).status, 400);
  assert.equal((await criar({ nome: 'X', tipoPessoa: 'pf', documento: '111.444.777-36' })).body.error, 'CPF inválido');
  assert.equal((await criar({ nome: 'X', tipoPessoa: 'pj', documento: '11.222.333/0001-82' })).body.error, 'CNPJ inválido');

  const dono = (await criar({ nome: ' Dona Maria ', documento: '111.444.777-35', marca: 'ignorada' })).body;
  assert.deepEqual([dono.nome, dono.papel, dono.documento, dono.marca], ['Dona Maria', 'proprietario', '11144477735', null]);
  const op = (await criar({ nome: 'Ponto Alfa Ltda', papel: 'operador', tipoPessoa: 'pj', documento: '11.222.333/0001-81', marca: 'Café Alfa' })).body;
  assert.deepEqual([op.papel, op.marca, op.documento], ['operador', 'Café Alfa', '11222333000181']);

  // filtro por papel
  const operadores = (await req('GET', '/api/proprietarios?papel=operador', { token })).body;
  assert.ok(operadores.length >= 1 && operadores.every((p) => p.papel === 'operador'));

  // cada vínculo exige o papel certo
  const novo = (corpo) => req('POST', '/api/imoveis', { token, body: { endereco: 'Rua do Operador', cidade: 'Rio de Janeiro', tipo: 'passagem_ponto', ...corpo } });
  assert.match((await novo({ operadorId: dono.id })).body.error, /outro papel/);
  assert.match((await novo({ proprietarioId: op.id })).body.error, /outro papel/);
  assert.match((await novo({ operadorId: 999999 })).body.error, /não encontrado/);
  const imovel = (await novo({ operadorId: op.id, proprietarioId: dono.id })).body;
  assert.deepEqual([imovel.operadorId, imovel.proprietarioId], [op.id, dono.id]);
  const detalhe = (await req('GET', `/api/imoveis/${imovel.id}`, { token })).body;
  assert.equal(detalhe.operador.nome, 'Ponto Alfa Ltda');
  assert.equal(detalhe.proprietarioRel.nome, 'Dona Maria');
  assert.equal((await req('PUT', `/api/imoveis/${imovel.id}`, { token, body: { operadorId: dono.id } })).status, 400);
  assert.equal((await req('PUT', `/api/imoveis/${imovel.id}`, { token, body: { operadorId: null } })).body.operadorId, null);

  // contagens e proteção do papel
  const lista = (await req('GET', '/api/proprietarios', { token })).body;
  assert.equal(lista.find((p) => p.id === dono.id)._count.imoveis, 1);
  assert.equal((await req('PUT', `/api/proprietarios/${dono.id}`, { token, body: { papel: 'operador' } })).status, 409);
  const livre = (await criar({ nome: 'Sem vínculo' })).body;
  assert.equal((await req('PUT', `/api/proprietarios/${livre.id}`, { token, body: { papel: 'operador', marca: 'Marca' } })).body.marca, 'Marca');
  assert.equal((await req('PUT', '/api/proprietarios/999999', { token, body: { nome: 'x' } })).status, 404);

  // o público nunca recebe os vínculos
  const publico = (await req('GET', `/api/public/imoveis/${imovel.id}`)).body;
  assert.equal('operadorId' in publico || 'operador' in publico || 'proprietarioId' in publico, false);
});

test('ações das operações: acompanhamento da proposta (situação, envio, valor) e etapa acompanhando', async () => {
  const empresa = (await req('POST', '/api/empresas', { token, body: { nome: 'Rede proposta' } })).body;
  const imovel = (await req('POST', '/api/imoveis', { token, body: { endereco: 'Rua proposta', cidade: 'Rio de Janeiro' } })).body;
  const op = (await req('POST', '/api/oportunidades', { token, body: { imovelId: imovel.id, empresaId: empresa.id } })).body;
  assert.equal(op.propostaStatus, 'sem_proposta');
  const put = (body) => req('PUT', `/api/oportunidades/${op.id}`, { token, body });
  assert.equal((await put({ propostaStatus: 'rascunho' })).status, 400);
  assert.equal((await put({ propostaEnviadaEm: '2026-02-30' })).status, 400);
  assert.equal((await put({ propostaValor: -1 })).status, 400);
  const elab = (await put({ propostaStatus: 'em_elaboracao', propostaValor: 15000.5 })).body;
  assert.equal(elab.etapa, 'apresentado');
  assert.equal(Number(elab.propostaValor), 15000.5);
  // enviada: data de envio preenchida e etapa passa para "proposta"
  const enviada = (await put({ propostaStatus: 'enviada' })).body;
  assert.equal(enviada.etapa, 'proposta');
  assert.match(enviada.propostaEnviadaEm, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(enviada.propostaAtualizadaEm);
  const contra = (await put({ propostaStatus: 'contraproposta', propostaRetornoEm: '2026-11-10', propostaObservacao: 'Pediram carência' })).body;
  assert.equal(contra.etapa, 'negociacao');
  assert.equal(contra.propostaEnviadaEm, enviada.propostaEnviadaEm);
  assert.equal((await put({ propostaStatus: 'recusada' })).body.etapa, 'perdido');
});

test('apresentação em PDF gerado no servidor: A4 exato, 2 folhas (completa) e 1 (resumo)', async (t) => {
  try { await require('playwright-core').chromium.launch().then((b) => b.close()); } catch { return t.skip('Chromium do Playwright não instalado'); }
  const imovel = (await req('POST', '/api/imoveis', { token, body: { codigo: 'PB-PDF', endereco: 'Rua PDF', bairro: 'Centro', cidade: 'Rio de Janeiro', uf: 'RJ', aluguel: 9000, areaTotal: 120, descricao: 'Loja ampla. '.repeat(80), latitude: -22.9035, longitude: -43.1775 } })).body;
  const baixar = async (q = '') => {
    const r = await fetch(`${getBase()}/apresentacao/${imovel.id}/pdf${q}`);
    return { status: r.status, tipo: r.headers.get('content-type'), nome: r.headers.get('content-disposition'), pdf: Buffer.from(await r.arrayBuffer()).toString('latin1') };
  };
  const paginas = (pdf) => (pdf.match(/\/Type\s*\/Page[^s]/g) || []).length;
  const completa = await baixar();
  assert.equal(completa.status, 200);
  assert.equal(completa.tipo, 'application/pdf');
  assert.match(completa.nome, /Apresentacao-PB-PDF\.pdf/);
  assert.equal(paginas(completa.pdf), 2);
  for (const m of completa.pdf.match(/\/MediaBox\s*\[[^\]]+\]/g)) {
    const [, , w, h] = m.match(/[\d.]+/g).map(Number);
    assert.ok(Math.abs(w - 595.28) < 1 && Math.abs(h - 841.89) < 1, `A4: ${m}`);
  }
  assert.equal(paginas((await baixar('?formato=resumo')).pdf), 1);
  assert.equal((await fetch(`${getBase()}/apresentacao/999999/pdf`)).status, 404);
});

test('exclusões: imóvel, cliente, termo do glossário e lançamento previsto; restrições preservam o histórico', async () => {
  await req('POST', '/api/usuarios', { token, body: { nome: 'Comercial Excl', email: 'excl@teste.dev', senha: 'senha12345', role: 'comercial' } });
  const comercial = (await login('excl@teste.dev', 'senha12345')).body.token;

  // imóvel: só admin; com ação da operação é bloqueado (arquivar como inativo)
  const livre = (await req('POST', '/api/imoveis', { token, body: { endereco: 'Rua Excluir', cidade: 'Rio de Janeiro' } })).body;
  assert.equal((await req('DELETE', `/api/imoveis/${livre.id}`, { token: comercial })).status, 403);
  assert.equal((await req('DELETE', `/api/imoveis/${livre.id}`, { token })).status, 200);
  assert.equal((await req('GET', `/api/imoveis/${livre.id}`, { token })).status, 404);
  const usado = (await req('POST', '/api/imoveis', { token, body: { endereco: 'Rua Histórico', cidade: 'Rio de Janeiro' } })).body;
  const cliente = (await req('POST', '/api/empresas', { token, body: { nome: 'Cliente com histórico' } })).body;
  await req('POST', '/api/oportunidades', { token, body: { imovelId: usado.id, empresaId: cliente.id } });
  assert.equal((await req('DELETE', `/api/imoveis/${usado.id}`, { token })).status, 409);
  assert.equal((await req('PUT', `/api/imoveis/${usado.id}`, { token, body: { status: 'inativo' } })).body.status, 'inativo');

  // cliente: com ação das operações não sai; sem vínculo, sai
  const bloqueio = await req('DELETE', `/api/empresas/${cliente.id}`, { token });
  assert.equal(bloqueio.status, 409);
  assert.match(bloqueio.body.error, /ações das operações/);
  const avulso = (await req('POST', '/api/empresas', { token, body: { nome: 'Cliente avulso' } })).body;
  assert.equal((await req('DELETE', `/api/empresas/${avulso.id}`, { token })).status, 200);

  // glossário: só admin
  const termo = (await req('POST', '/api/glossario', { token, body: { termo: 'TESTE-EXCL', categoria: 'Teste', significado: 'Para excluir' } })).body;
  assert.equal((await req('DELETE', `/api/glossario/${termo.id}`, { token: comercial })).status, 403);
  assert.equal((await req('DELETE', `/api/glossario/${termo.id}`, { token })).status, 200);
  assert.equal((await req('DELETE', `/api/glossario/${termo.id}`, { token })).status, 404);

  // financeiro: previsto pode ser excluído; pago só estorna
  const lanc = async () => (await req('POST', '/api/financeiro/lancamentos', { token, body: { tipo: 'despesa', categoria: 'taxa', descricao: 'Lançado por engano', valor: 10, vencimento: '2026-11-10' } })).body;
  const previsto = await lanc();
  assert.equal((await req('DELETE', `/api/financeiro/lancamentos/${previsto.id}`, { token })).status, 200);
  const pago = await lanc();
  await req('POST', `/api/financeiro/lancamentos/${pago.id}/baixar`, { token, body: { pagoEm: '2026-11-10', valorPago: 10, formaPagamento: 'pix' } });
  assert.equal((await req('DELETE', `/api/financeiro/lancamentos/${pago.id}`, { token })).status, 409);
});

test('inteligência em PDF gerado no servidor: exige sessão e sai em A4 paisagem', async (t) => {
  try { await require('playwright-core').chromium.launch().then((b) => b.close()); } catch { return t.skip('Chromium do Playwright não instalado'); }
  const im = (await req('POST', '/api/imoveis', { token, body: { codigo: 'PB-IPDF', endereco: 'Rua PDF', cidade: 'Cidade Sem Censo', uf: 'XX' } })).body;
  const analise = (await req('POST', `/api/imoveis/${im.id}/analise`, { token })).body;
  assert.equal((await fetch(`${getBase()}/inteligencia/${analise.id}/pdf`)).status, 401);
  const arquivoToken = (await req('GET', '/api/auth/token-arquivo', { token })).body.token;
  const r = await fetch(`${getBase()}/inteligencia/${analise.id}/pdf?token=${arquivoToken}`);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('content-type'), 'application/pdf');
  assert.match(r.headers.get('content-disposition'), /Inteligencia-PB-IPDF\.pdf/);
  const pdf = Buffer.from(await r.arrayBuffer()).toString('latin1');
  const paginas = (pdf.match(/\/Type\s*\/Page[^s]/g) || []).length;
  assert.ok(paginas >= 4, `páginas: ${paginas}`);
  for (const m of pdf.match(/\/MediaBox\s*\[[^\]]+\]/g)) {
    const [, , w, h] = m.match(/[\d.]+/g).map(Number);
    assert.ok(Math.abs(w - 841.89) < 1 && Math.abs(h - 595.28) < 1, `A4 paisagem: ${m}`);
  }
});

test('apresentação: indicadores do rodapé usam o raio de 500 m quando há setores censitários', () => {
  const { renderApresentacao } = require('../src/templates/apresentacao');
  const setores = require('../src/services/setores');
  const raio = setores.raio(-22.9025, -43.2795, 500);
  const base = { id: 7, codigo: 'PB-R5', endereco: 'Rua', bairro: 'Méier', cidade: 'Rio de Janeiro', uf: 'RJ', tipo: 'locacao', status: 'disponivel', criadoEm: '2026-10-01' };
  const html = renderApresentacao(base, 'data:image/png;base64,AAAA', { contexto: { raio, bairro: { nome: 'Méier', populacao: 49828, rendaMedia: 5210, domiciliosOcupados: 20311 } } });
  assert.match(html, /Moradores em 500 m/);
  assert.match(html, new RegExp(raio.populacao.toLocaleString('pt-BR').replace('.', '\\.')));
  assert.doesNotMatch(html, /Moradores no bairro/);
  assert.match(renderApresentacao(base, 'data:image/png;base64,AAAA', { contexto: { bairro: { nome: 'Méier', populacao: 49828 } } }), /Moradores no bairro/);
});
