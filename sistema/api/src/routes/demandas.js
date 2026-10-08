const express = require('express');
const auth = require('../middleware/auth');
const ah = require('../middleware/async');
const fields = ['empresaId','titulo','tipo','finalidade','objetivo','unidades','prazo','regioesInteresse','perfilImovel','areaMinima','areaMaxima','frenteMinima','peDireitoMinimo','vagasMinimas','acessibilidade','exigencias','aluguelMinimo','aluguelMaximo','compraMinima','compraMaxima','cdu','luvas','valorPonto','carenciaMeses','investimento','restricoes','responsavelEmpresa','consultor','inicioEm','proximaAcao','proximaAcaoEm','status','observacoes'];
const numbers = new Set(['imovelId','empresaId','unidades','areaMinima','areaMaxima','frenteMinima','peDireitoMinimo','vagasMinimas','aluguelMinimo','aluguelMaximo','compraMinima','compraMaxima','cdu','luvas','valorPonto','carenciaMeses','investimento']);
const integers = new Set(['empresaId','unidades','vagasMinimas','carenciaMeses']);
const enums = {tipo:['locacao','aquisicao','passagem_ponto','implantacao'],finalidade:['expansao_redes','ocupacao','investimento','outro'],status:['aberta','contratada','em_andamento','concluida','cancelada']};
const { fail } = require('../lib/validar');
function pick(body, allowed = fields) {
  const d = {};
  for (const key of allowed) if (Object.hasOwn(body, key)) {
    let v = body[key];
    if (numbers.has(key) || key === 'honorarios' || key === 'demandaId') {
      v = v === '' || v == null ? null : Number(v);
      if (v !== null && (!Number.isFinite(v) || v < 0 || ((integers.has(key) || key === 'demandaId') && !Number.isSafeInteger(v)))) fail(`Valor inválido: ${key}`);
    } else if (v !== null && typeof v !== 'string') fail(`Texto inválido: ${key}`);
    if (typeof v === 'string') v = v.trim();
    if (allowed === fields && enums[key] && !enums[key].includes(v)) fail(`Opção inválida: ${key}`);
    if (['inicioEm','proximaAcaoEm'].includes(key) && v && (!/^\d{4}-\d{2}-\d{2}$/.test(v) || !Number.isFinite(Date.parse(v)) || new Date(v).toISOString().slice(0,10) !== v)) fail('Data inválida');
    d[key] = v;
  }
  return d;
}
const include = {empresa:true, oportunidades:{include:{imovel:true}},documentos:true,atividades:{orderBy:{criadoEm:'desc'}},propostas:{select:{id:true,numero:true,status:true,data:true}}};
module.exports = prisma => {
  const r = express.Router(); r.use(auth);
  r.get('/', ah(async(req,res) => res.json(await prisma.demanda.findMany({where:req.query.empresaId ? {empresaId:Number(req.query.empresaId)} : {},include,orderBy:{atualizadoEm:'desc'}}))));
  r.get('/:id', ah(async(req,res) => { const d=await prisma.demanda.findUnique({where:{id:+req.params.id},include}); if(!d)return res.status(404).json({error:'Demanda não encontrada'});res.json(d); }));
  async function validate(d, existing) {
    const merged={...existing,...d};
    if(!merged.titulo || !merged.empresaId)fail('Empresa e título são obrigatórios');
    if(!await prisma.empresa.findUnique({where:{id:merged.empresaId}}))fail('Empresa não encontrada');
    for(const [a,b] of [['areaMinima','areaMaxima'],['aluguelMinimo','aluguelMaximo'],['compraMinima','compraMaxima']]) if(merged[a]!=null && merged[b]!=null && Number(merged[a])>Number(merged[b]))fail('O mínimo deve ser menor ou igual ao máximo');
    if(existing && merged.empresaId!==existing.empresaId && (existing.oportunidades.length || existing.propostas.length))fail('Demanda com operações vinculadas não pode mudar de empresa');
  }
  r.post('/',ah(async(req,res)=>{const d=pick(req.body);await validate(d);res.json(await prisma.demanda.create({data:d,include}));}));
  r.put('/:id',ah(async(req,res)=>{const existing=await prisma.demanda.findUnique({where:{id:+req.params.id},include});if(!existing)return res.status(404).json({error:'Demanda não encontrada'});const d=pick(req.body);await validate(d,existing);res.json(await prisma.demanda.update({where:{id:existing.id},data:d,include}));}));
  r.post('/:id/atividades',ah(async(req,res)=>{const {texto,tipo='nota'}=req.body;if(typeof texto!=='string'||!texto.trim())fail('Informe a atividade');if(!['nota','contato','visita','proposta','status'].includes(tipo))fail('Tipo inválido');if(!await prisma.demanda.findUnique({where:{id:+req.params.id}}))return res.status(404).json({error:'Demanda não encontrada'});res.json(await prisma.demandaAtividade.create({data:{demandaId:+req.params.id,texto:texto.trim(),tipo}}));}));
  r.post('/:id/documentos',ah(async(req,res)=>{const {nome,url,tipo='anexo'}=req.body;let u;try{u=new URL(url);}catch{fail('Informe um link válido');}if(!['http:','https:'].includes(u.protocol))fail('Informe um link HTTP ou HTTPS');if(typeof nome!=='string'||!nome.trim())fail('Informe o nome do documento');if(!['briefing','contrato','proposta','anexo'].includes(tipo))fail('Tipo inválido');if(!await prisma.demanda.findUnique({where:{id:+req.params.id}}))return res.status(404).json({error:'Demanda não encontrada'});res.json(await prisma.demandaDocumento.create({data:{demandaId:+req.params.id,nome:nome.trim(),url:u.href,tipo}}));}));
  return r;
};
module.exports.pick = pick;
module.exports.fail = fail;
