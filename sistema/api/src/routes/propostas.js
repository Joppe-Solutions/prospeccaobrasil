const express=require('express');
const auth=require('../middleware/auth');
const ah=require('../middleware/async');
const {pick,fail}=require('./demandas');
module.exports=prisma=>{
 const r=express.Router();r.use(auth);
 const include={demanda:{include:{empresa:true}}};
 r.get('/',ah(async(req,res)=>res.json(await prisma.propostaServico.findMany({include,orderBy:{atualizadoEm:'desc'}}))));
 async function save(req,res,editing){
  const existing=editing?await prisma.propostaServico.findUnique({where:{id:+req.params.id}}):null;
  if(editing&&!existing)return res.status(404).json({error:'Proposta não encontrada'});
  const d=pick(req.body,['demandaId','titulo','escopo','honorarios','prazo','condicoes','status']);const merged={...existing,...d};
  if(!merged.demandaId||!merged.titulo||!merged.escopo)fail('Demanda, título e escopo são obrigatórios');
  if(merged.status&&!['rascunho','enviada','aceita','recusada'].includes(merged.status))fail('Status inválido');
  if(!await prisma.demanda.findUnique({where:{id:merged.demandaId}}))fail('Demanda não encontrada');
  res.json(editing?await prisma.propostaServico.update({where:{id:existing.id},data:d,include}):await prisma.propostaServico.create({data:d,include}));
 }
 r.post('/',ah((req,res)=>save(req,res,false)));r.put('/:id',ah((req,res)=>save(req,res,true)));return r;
};
