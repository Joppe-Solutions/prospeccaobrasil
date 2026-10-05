const express=require('express');const auth=require('../middleware/auth');const ah=require('../middleware/async');
module.exports=prisma=>{const r=express.Router();r.use(auth);r.get('/',ah(async(req,res)=>res.json(await prisma.benchmarkLocacao.findMany({orderBy:{local:'asc'}}))));r.put('/:id',ah(async(req,res)=>{
 if(req.user.role!=='admin')return res.status(403).json({error:'Apenas administradores podem alterar referências'});
 const data={};for(const k of ['valorM2','minimoM2','maximoM2'])if(Object.hasOwn(req.body,k)){const v=Number(req.body[k]);if(req.body[k]==null||req.body[k]===''||!Number.isFinite(v)||v<0)return res.status(400).json({error:'Valor inválido'});data[k]=v;}
 for(const k of ['corredor','classe','fonte'])if(Object.hasOwn(req.body,k)){if(typeof req.body[k]!=='string'||!req.body[k].trim())return res.status(400).json({error:'Campo obrigatório'});data[k]=req.body[k].trim();}
 const existing=await prisma.benchmarkLocacao.findUnique({where:{id:+req.params.id}});if(!existing)return res.status(404).json({error:'Referência não encontrada'});
 const merged={...existing,...data};if(Number(merged.minimoM2)>Number(merged.valorM2)||Number(merged.valorM2)>Number(merged.maximoM2))return res.status(400).json({error:'A referência deve estar entre mínimo e máximo'});
 res.json(await prisma.benchmarkLocacao.update({where:{id:existing.id},data}));
}));return r;};
