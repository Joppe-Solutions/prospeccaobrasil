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
  assert.equal((await req('GET', `/inteligencia/99999?token=${token}`)).status, 404);

  const doc = await req('GET', `/inteligencia/${analise.body.id}?token=${token}`);
  assert.equal(doc.status, 200);
  assert.match(doc.body, /A4 landscape/);
  assert.match(doc.body, /CONTAGEM DEMOGRÁFICA/);
  assert.match(doc.body, /Evolução populacional/);
  assert.match(doc.body, /classificação social/i);
  assert.match(doc.body, /sob levantamento/i);
  assert.match(doc.body, /Rua Geo/);
});
