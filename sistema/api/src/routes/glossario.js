const express=require('express');const auth=require('../middleware/auth');const ah=require('../middleware/async');
module.exports=prisma=>{
 const r=express.Router();r.use(auth);
 r.get('/',ah(async(req,res)=>res.json(await prisma.glossarioTermo.findMany({orderBy:{termo:'asc'}}))));
 async function save(req,res,editing){
  const data={};for(const k of ['termo','nomeExtenso','categoria','significado','exemplo','aliases','relacionados','fonte','revisadoEm'])if(Object.hasOwn(req.body,k)){if(typeof req.body[k]!=='string')return res.status(400).json({error:'Campos devem ser texto'});data[k]=req.body[k].trim();}
  const existing=editing?await prisma.glossarioTermo.findUnique({where:{id:+req.params.id}}):null;
  if(editing&&!existing)return res.status(404).json({error:'Termo não encontrado'});
  const merged={...existing,...data};if(!merged.termo||!merged.categoria||!merged.significado)return res.status(400).json({error:'Termo, categoria e significado são obrigatórios'});
  const normalize = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const duplicate = (await prisma.glossarioTermo.findMany({select:{id:true,termo:true}})).find(t => normalize(t.termo) === normalize(merged.termo));if(duplicate&&duplicate.id!==existing?.id)return res.status(409).json({error:'Termo já cadastrado'});
  if(merged.revisadoEm && (!/^\d{4}-\d{2}-\d{2}$/.test(merged.revisadoEm)||!Number.isFinite(Date.parse(merged.revisadoEm))||new Date(merged.revisadoEm).toISOString().slice(0,10)!==merged.revisadoEm))return res.status(400).json({error:'Data de revisão inválida'});
  try{res.json(editing?await prisma.glossarioTermo.update({where:{id:existing.id},data}):await prisma.glossarioTermo.create({data}));}catch(e){if(e.code==='P2002')return res.status(409).json({error:'Termo já cadastrado'});throw e;}
 }
 r.post('/',ah((req,res)=>save(req,res,false)));r.put('/:id',ah((req,res)=>save(req,res,true)));return r;
};
