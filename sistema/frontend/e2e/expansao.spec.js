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
test('demanda: cadastro, documentos, proposta e vínculo de operação',async({page})=>{
 await login(page);const errors=watchErrors(page);await page.goto('/demandas');await page.getByRole('link',{name:'Nova demanda',exact:true}).click();
 await page.getByLabel('Empresa',{exact:true}).selectOption({label:'Empresa E2E'});await page.getByLabel('Título da demanda').fill('Expansão teste RJ');await page.getByLabel('Cidades, bairros e áreas prioritárias').fill('Méier');
 await page.getByRole('button',{name:'Próximo',exact:true}).click();await page.getByLabel('Área mínima (m²)',{exact:true}).fill('100');await page.getByLabel('Área máxima (m²)',{exact:true}).fill('300');
 await page.getByRole('button',{name:'Próximo',exact:true}).click();await page.getByLabel('Aluguel máximo (R$/mês)').fill('20000');await page.getByRole('button',{name:'Próximo',exact:true}).click();await page.getByLabel('Próxima ação',{exact:true}).fill('Agendar visita');await page.getByRole('button',{name:'Próximo',exact:true}).click();await page.getByRole('button',{name:'Salvar demanda',exact:true}).click();
 await expect(page).toHaveURL(/\/demandas\/\d+$/);await expect(page.getByRole('heading',{name:'Expansão teste RJ',exact:true})).toBeVisible();
 await page.getByLabel('Registro',{exact:true}).fill('Contato com expansão');await page.getByRole('button',{name:'Registrar atividade'}).click();await expect(page.getByText('Contato com expansão',{exact:true})).toBeVisible();
 await page.getByLabel('Nome',{exact:true}).fill('Briefing teste');await page.getByLabel('Link',{exact:true}).fill('https://example.com/briefing');await page.getByRole('button',{name:'Vincular documento'}).click();await expect(page.getByRole('link',{name:'Briefing teste ↗'})).toBeVisible();
 await page.getByRole('link',{name:'Gerenciar propostas'}).click();await page.getByRole('button',{name:'Nova proposta',exact:true}).click();await page.getByLabel('Título',{exact:true}).fill('Proposta teste RJ');await page.getByLabel('Escopo dos serviços').fill('Seleção de pontos em Méier');await page.getByRole('button',{name:'Salvar proposta',exact:true}).click();await expect(page.getByRole('button',{name:'Proposta teste RJ',exact:true})).toBeVisible();
 await page.goto('/demandas');await page.getByRole('link',{name:'Expansão teste RJ Empresa E2E',exact:true}).click();await page.locator('#main-content').getByRole('link',{name:'Relacionamentos comerciais',exact:true}).click();await page.getByRole('button',{name:'Novo relacionamento'}).click();await page.getByLabel(/^Imóvel/).selectOption({label:'PB-E2E · Rua E2E, 1'});await page.getByLabel('Modalidade',{exact:true}).selectOption('venda_ativo');await page.getByRole('button',{name:'Criar oportunidade'}).click();await expect(page.getByRole('cell',{name:'Ativos à venda',exact:true})).toBeVisible();await expectNoErrors(errors);
});
test('apresentação: resumo em uma folha e complementos em duas',async({page})=>{
 const fixture={codigo:'PB-PRINT',titulo:'Loja comercial para expansão',endereco:'Rua de teste',numero:'100',bairro:'Méier',cidade:'Rio de Janeiro',uf:'RJ',tipo:'locacao',status:'disponivel',areaTotal:200,areaUtil:180,pisoAreaVenda:150,jirau:20,mezanino:30,frenteImovel:8,peDireito:4,vagas:10,aluguel:20000,condominio:1000,iptu:500,cdu:30000,luvas:10000,valorPonto:50000,periodoContrato:'5 anos',descricao:'Imóvel com boa localização e infraestrutura. '.repeat(100),criadoEm:'2026-10-05',fotos:Array.from({length:12},(_,i)=>({arquivo:`teste-${i}.png`,legenda:'Imagem do imóvel'})),documentos:Array.from({length:10},(_,i)=>({tipo:'planta',nome:`Planta ${i}`,url:'https://example.com/planta'}))};
 await page.route('**/uploads/teste-*',r=>r.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jG9sAAAAASUVORK5CYII=','base64')}));
 await page.goto('/login');fs.mkdirSync('../../tmp/pdfs',{recursive:true});
 for(const completa of [false,true]){await page.setContent(renderApresentacao(fixture,'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jG9sAAAAASUVORK5CYII=',{completa,contexto:{bairro:{nome:'Méier',populacao:49828,rendaMedia:5210.4,domiciliosOcupados:20311},entorno:{total500:212,destaques:[{rotulo:'Estação (metrô, trem ou VLT)',nome:'Méier',dist:180},{rotulo:'Shopping',nome:'Shopping do Méier',dist:240},{rotulo:'Supermercado',nome:'Mercado Exemplo',dist:90},{rotulo:'Banco',nome:'Banco Exemplo',dist:60},{rotulo:'Farmácia',nome:'Farmácia Exemplo',dist:40}]}}}));await page.pdf({path:path.resolve(`../../tmp/pdfs/apresentacao-${completa?'completa':'resumo'}.pdf`),preferCSSPageSize:true,printBackground:true});}
});
