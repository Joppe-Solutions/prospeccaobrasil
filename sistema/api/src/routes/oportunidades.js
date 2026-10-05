const express = require('express');
const auth = require('../middleware/auth');
const ah = require('../middleware/async');
const paginate = require('../lib/paginate');
const {fail,pick}=require('./demandas');
const MODALIDADES=new Set(['expansao_redes','locacao_direta','passagem_ponto','venda_ativo']);
const ETAPAS=new Set(['apresentado','visita','proposta','negociacao','fechado','perdido']);
const include={imovel:true,empresa:true,demanda:true};
module.exports=prisma=>{
 const r=express.Router();r.use(auth);
 r.get('/',ah(async(req,res)=>paginate(req,res,prisma.oportunidade,{orderBy:{atualizadoEm:'desc'},include})));
 async function save(req,res,editing){
  const existing=editing?await prisma.oportunidade.findUnique({where:{id:+req.params.id}}):null;if(editing&&!existing)return res.status(404).json({error:'Relacionamento não encontrado'});
  const data=pick(req.body,editing?['etapa','observacao','modalidade','finalidade','proximaAcao','proximaAcaoEm','demandaId']:['imovelId','empresaId','etapa','observacao','modalidade','finalidade','proximaAcao','proximaAcaoEm','demandaId']);
  for(const k of ['imovelId','empresaId','demandaId'])if(Object.hasOwn(data,k)){data[k]=data[k]===''||data[k]==null?null:Number(data[k]);if(data[k]!==null&&(!Number.isSafeInteger(data[k])||data[k]<1))fail('Vínculo inválido');}
  if(data.modalidade==='')data.modalidade=null;
  if(data.modalidade&&!MODALIDADES.has(data.modalidade))fail('Modalidade inválida');
  if(Object.hasOwn(data,'etapa')&&!ETAPAS.has(data.etapa))fail('Etapa inválida');
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
