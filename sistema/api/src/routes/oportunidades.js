const express = require('express');
const auth = require('../middleware/auth');
const ah = require('../middleware/async');
const paginate = require('../lib/paginate');
const {fail,pick}=require('./demandas');
const MODALIDADES=new Set(['expansao_redes','locacao_direta','passagem_ponto','venda_ativo']);
const ETAPAS=new Set(['apresentado','visita','proposta','negociacao','fechado','perdido']);
const include={imovel:true,empresa:true,demanda:true};
const PROPOSTA=new Set(['sem_proposta','em_elaboracao','enviada','em_analise','contraproposta','aceita','recusada']);
const PROPOSTA_FIELDS=['propostaStatus','propostaValor','propostaEnviadaEm','propostaRetornoEm','propostaObservacao'];
const dataValida=v=>/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
// Ajusta e valida os campos da proposta; a etapa acompanha a proposta enviada (e o aceite/recusa)
function proposta(data,existing){
 for(const k of ['propostaEnviadaEm','propostaRetornoEm','propostaObservacao'])if(Object.hasOwn(data,k)&&(data[k]===''||data[k]==null))data[k]=null;
 if(Object.hasOwn(data,'propostaStatus')&&!PROPOSTA.has(data.propostaStatus))fail('Situação da proposta inválida');
 for(const k of ['propostaEnviadaEm','propostaRetornoEm'])if(data[k]&&!dataValida(data[k]))fail('Data da proposta inválida');
 if(Object.hasOwn(data,'propostaValor')){const v=data.propostaValor===''||data.propostaValor==null?null:Number(data.propostaValor);if(v!==null&&(!Number.isFinite(v)||v<0))fail('Valor da proposta inválido');data.propostaValor=v;}
 const antes=existing?.propostaStatus||'sem_proposta',status=data.propostaStatus??antes;
 if(status!==antes){
  data.propostaAtualizadaEm=new Date();
  if(['enviada','em_analise','contraproposta'].includes(status)&&!(data.propostaEnviadaEm??existing?.propostaEnviadaEm))data.propostaEnviadaEm=new Date().toISOString().slice(0,10);
  const etapa=data.etapa??existing?.etapa??'apresentado';
  if(['enviada','em_analise'].includes(status)&&['apresentado','visita'].includes(etapa))data.etapa='proposta';
  if(status==='contraproposta'&&['apresentado','visita','proposta'].includes(etapa))data.etapa='negociacao';
  if(status==='recusada'&&etapa!=='fechado')data.etapa='perdido';
 }
}
module.exports=prisma=>{
 const r=express.Router();r.use(auth);
 r.get('/',ah(async(req,res)=>paginate(req,res,prisma.oportunidade,{orderBy:{atualizadoEm:'desc'},include})));
 async function save(req,res,editing){
  const existing=editing?await prisma.oportunidade.findUnique({where:{id:+req.params.id}}):null;if(editing&&!existing)return res.status(404).json({error:'Relacionamento não encontrado'});
  const body={...req.body};if(typeof body.propostaValor==='number')body.propostaValor=String(body.propostaValor);
  const data=pick(body,[...(editing?[]:['imovelId','empresaId']),'etapa','observacao','modalidade','finalidade','proximaAcao','proximaAcaoEm','demandaId',...PROPOSTA_FIELDS]);
  for(const k of ['imovelId','empresaId','demandaId'])if(Object.hasOwn(data,k)){data[k]=data[k]===''||data[k]==null?null:Number(data[k]);if(data[k]!==null&&(!Number.isSafeInteger(data[k])||data[k]<1))fail('Vínculo inválido');}
  if(data.modalidade==='')data.modalidade=null;
  if(data.modalidade&&!MODALIDADES.has(data.modalidade))fail('Modalidade inválida');
  if(Object.hasOwn(data,'etapa')&&!ETAPAS.has(data.etapa))fail('Etapa inválida');
  proposta(data,existing);
  if(data.finalidade&&!['expansao_redes','ocupacao','investimento','outro'].includes(data.finalidade))fail('Finalidade inválida');
  const merged={...existing,...data};if(!merged.imovelId||!merged.empresaId)fail('Imóvel e empresa são obrigatórios');
  if(merged.demandaId){const d=await prisma.demanda.findUnique({where:{id:merged.demandaId}});if(!d||d.empresaId!==merged.empresaId)fail('A demanda deve pertencer à empresa da operação');}
  if(!await prisma.imovel.findUnique({where:{id:merged.imovelId}})||!await prisma.empresa.findUnique({where:{id:merged.empresaId}}))fail('Imóvel ou empresa não encontrado');
  // Um imóvel é apresentado uma única vez por demanda (ou por empresa, quando não há demanda)
  if(!editing||existing.demandaId!==merged.demandaId){const dup=await prisma.oportunidade.findFirst({where:{imovelId:merged.imovelId,empresaId:merged.empresaId,demandaId:merged.demandaId??null,...(editing?{id:{not:existing.id}}:{})}});if(dup)fail('Este imóvel já foi apresentado para esta '+(merged.demandaId?'demanda':'empresa'),409);}
  const result=await prisma.$transaction(async tx=>{
   const o=editing?await tx.oportunidade.update({where:{id:existing.id},data,include}):await tx.oportunidade.create({data:{...data,etapa:data.etapa||'apresentado'},include});
   if(o.demandaId && (!editing||existing.etapa!==o.etapa||existing.demandaId!==o.demandaId))await tx.demandaAtividade.create({data:{demandaId:o.demandaId,tipo:o.etapa==='visita'?'visita':o.etapa==='proposta'?'proposta':'status',texto:`${o.imovel.codigo}: ${editing?'operação atualizada':'imóvel apresentado'} — etapa ${o.etapa}.`}});
   return o;
  });res.json(result);
 }
 r.post('/',ah((req,res)=>save(req,res,false)));r.put('/:id',ah((req,res)=>save(req,res,true)));
 r.delete('/:id',auth.requireRole('admin'),ah(async(req,res)=>{await prisma.oportunidade.delete({where:{id:+req.params.id}});res.json({ok:true});}));return r;
};
