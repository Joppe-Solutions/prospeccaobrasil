import { test, expect } from '@playwright/test';
import { login, watchErrors, expectNoErrors } from './helpers.js';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {renderApresentacao}=require('../../api/src/templates/apresentacao');
test('glossário: busca por alias, categoria e edição de termo',async({page})=>{
 await login(page);const errors=watchErrors(page);await page.goto('/glossario');await expect(page.getByText('100 de 100 termos · Ordem alfabética')).toBeVisible();
 await page.getByLabel('Buscar termo',{exact:true}).fill('fander');await expect(page.getByRole('heading',{name:'Founder',exact:true})).toBeVisible();await expect(page.getByText('1 de 100 termos · Ordem alfabética')).toBeVisible();
 await page.getByRole('button',{name:'Editar Founder',exact:true}).click();await page.getByLabel('Outras grafias para busca').fill('fander, fundador');await page.getByRole('button',{name:'Salvar termo',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.reload();await page.getByLabel('Buscar termo',{exact:true}).fill('fundador');await expect(page.getByRole('heading',{name:'Founder',exact:true})).toBeVisible();await expectNoErrors(errors);
});
test('clientes: premissas e bairros de interesse dinâmicos; demandas saiu do sistema',async({page})=>{
 await login(page);const errors=watchErrors(page);await page.goto('/empresas');
 await expect(page.getByRole('columnheader',{name:/Premissas/})).toBeVisible();await expect(page.getByRole('columnheader',{name:/^Demandas/})).toHaveCount(0);
 await page.getByRole('link',{name:'Nova empresa'}).click();const modal=page.locator('.modal');
 await modal.locator('#wz-nome').fill('Rede Bairros E2E');await modal.getByRole('button',{name:'Próximo',exact:true}).click();await modal.getByRole('button',{name:'Próximo',exact:true}).click();
 await modal.getByLabel('Bairro de interesse 1').fill('Méier');await modal.getByRole('button',{name:'Adicionar bairro'}).click();
 await modal.getByLabel('Bairro de interesse 2').fill('Tijuca');await modal.getByRole('button',{name:'Adicionar bairro'}).click();
 await modal.getByLabel('Bairro de interesse 3').fill('Centro');await modal.getByRole('button',{name:'Remover bairro 3'}).click();
 await expect(modal.getByLabel('Bairro de interesse 3')).toHaveCount(0);
 await modal.getByRole('button',{name:'Próximo',exact:true}).click();await expect(modal).toContainText('Méier, Tijuca');
 await modal.getByRole('button',{name:/Cadastrar|Salvar/}).click();await expect(page).toHaveURL(/\/empresas$/);
 const linha=page.getByRole('row',{name:/Rede Bairros E2E/});await expect(linha).toContainText('Méier');await expect(linha).toContainText('Tijuca');await expect(linha).toContainText('Nenhuma');
 await page.goto('/demandas');await expect(page).toHaveURL(/\/$/);await expect(page.getByRole('link',{name:/^Demandas/})).toHaveCount(0);
 await expectNoErrors(errors);
});
test('apresentação: resumo em uma folha e complementos em duas',async({page})=>{
 const fixture={codigo:'PB-PRINT',analises:[{score:74,resumo:'Ponto com bom fluxo de pedestres e forte demanda local; vale priorizar o contato com redes de varejo alimentar e farmácias.',modelo:'triagem-interna',conteudoJson:JSON.stringify({pontosFortes:['Esquina com vitrine ampla','Perto da estação','Alto fluxo diário'],pontosAtencao:['Ruído de tráfego','Calçada estreita'],segmentosRecomendados:['Farmácia','Mercado','Banco'],recomendacao:'Priorizar redes com operação de conveniência.'})}],titulo:'Loja comercial para expansão',endereco:'Rua de teste',numero:'100',bairro:'Méier',cidade:'Rio de Janeiro',uf:'RJ',tipo:'locacao',status:'disponivel',areaTotal:200,areaUtil:180,pisoAreaVenda:150,jirau:20,mezanino:30,frenteImovel:8,peDireito:4,vagas:10,aluguel:20000,condominio:1000,iptu:500,cdu:30000,luvas:10000,valorPonto:50000,periodoContrato:'5 anos',descricao:'Imóvel com boa localização e infraestrutura. '.repeat(100),criadoEm:'2026-10-05',fotos:Array.from({length:12},(_,i)=>({arquivo:`teste-${i}.png`,legenda:'Imagem do imóvel'})),documentos:Array.from({length:10},(_,i)=>({tipo:'planta',nome:`Planta ${i}`,url:'https://example.com/planta'}))};
 await page.route('**/uploads/teste-*',r=>r.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jG9sAAAAASUVORK5CYII=','base64')}));
 await page.goto('/login');fs.mkdirSync('../../tmp/pdfs',{recursive:true});
 for(const completa of [false,true]){await page.setContent(renderApresentacao(fixture,'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jG9sAAAAASUVORK5CYII=',{completa,contexto:{bairro:{nome:'Méier',populacao:49828,rendaMedia:5210.4,domiciliosOcupados:20311},entorno:{total500:212,destaques:[{rotulo:'Estação (metrô, trem ou VLT)',nome:'Méier',dist:180},{rotulo:'Shopping',nome:'Shopping do Méier',dist:240},{rotulo:'Supermercado',nome:'Mercado Exemplo',dist:90},{rotulo:'Banco',nome:'Banco Exemplo',dist:60},{rotulo:'Farmácia',nome:'Farmácia Exemplo',dist:40}]}}}));const pdf=await page.pdf({path:path.resolve(`../../tmp/pdfs/apresentacao-${completa?'completa':'resumo'}.pdf`),preferCSSPageSize:true,printBackground:true});expect((pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g)||[]).length,completa?'complementos: 2 folhas':'resumo: 1 folha').toBe(completa?2:1);}
 // visualizador: a capa abre as fotos, setas trocam, Esc fecha
 await page.getByRole('button',{name:'Ver as 12 fotos do imóvel'}).click();const viewer=page.locator('.viewer');await expect(viewer.locator('figcaption')).toHaveText('1 / 12 · Imagem do imóvel');await page.keyboard.press('ArrowRight');await expect(viewer.locator('figcaption')).toContainText('2 / 12');await page.keyboard.press('Escape');await expect(viewer).toBeHidden();await expect(page.getByRole('heading',{name:'Documentos técnicos para consulta'})).toBeVisible();
});
