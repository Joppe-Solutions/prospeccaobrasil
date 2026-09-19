const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

async function main() {
  const senha = await bcrypt.hash('prospeccao123', 10);
  await prisma.usuario.upsert({
    where: { email: 'admin@prospeccaobrasil.com.br' },
    update: {},
    create: { nome: 'Luiz Claudio P. André', email: 'admin@prospeccaobrasil.com.br', senhaHash: senha, role: 'admin' },
  });
  await prisma.usuario.upsert({
    where: { email: 'comercial@prospeccaobrasil.com.br' },
    update: {},
    create: { nome: 'Comercial PB', email: 'comercial@prospeccaobrasil.com.br', senhaHash: senha, role: 'comercial' },
  });

  const empresas = [
    { nome: 'Drogasmil', segmento: 'Farmácias e drogarias', contatoNome: 'Alerson Azevedo', cidade: 'Rio de Janeiro', uf: 'RJ', areaMinima: 120, areaMaxima: 400, regioesInteresse: 'Zona Sul, Barra, Tijuca', perfilLoja: 'Rua comercial de alto fluxo, esquinas preferenciais' },
    { nome: 'Ri Happy', segmento: 'Brinquedos e puericultura', cidade: 'São Paulo', uf: 'SP', areaMinima: 200, areaMaxima: 600, regioesInteresse: 'Capitais e polos regionais' },
    { nome: 'Óticas do Bem', segmento: 'Óticas', cidade: 'Rio de Janeiro', uf: 'RJ', areaMinima: 50, areaMaxima: 150, perfilLoja: 'Galerias e pontas comerciais' },
    { nome: 'Sono Show Móveis', segmento: 'Colchões e móveis', areaMinima: 250, areaMaxima: 800 },
    { nome: 'American Pet', segmento: 'Pet shops', areaMinima: 150, areaMaxima: 450, regioesInteresse: 'Zona Sul e Barra da Tijuca' },
    { nome: 'Monamie', segmento: 'Perfumaria e cosméticos', areaMinima: 40, areaMaxima: 120 },
    { nome: 'O Amigão', segmento: 'Pet e agropecuária', areaMinima: 300, areaMaxima: 1000 },
    { nome: 'Drogarias Pacheco', segmento: 'Farmácias e drogarias', areaMinima: 120, areaMaxima: 350, cidade: 'Rio de Janeiro', uf: 'RJ' },
  ];
  for (const e of empresas) {
    const ex = await prisma.empresa.findFirst({ where: { nome: e.nome } });
    if (!ex) await prisma.empresa.create({ data: e });
  }

  const imoveis = [
    {
      codigo: 'PB-001', titulo: 'Av. Cônego Vasconcelos, 423 - Loja A', tipo: 'locacao', status: 'disponivel',
      endereco: 'Av. Cônego Vasconcelos', numero: '423', complemento: 'Loja A', bairro: 'Bangu', cidade: 'Rio de Janeiro', uf: 'RJ', cep: '21810-011',
      areaTotal: 156, areaUtil: 126, pisoAreaVenda: 126, jirau: 30, peDireito: 4, frenteImovel: 5.2,
      cdu: 0, aluguel: 25000, condominio: 840, iptu: 654.10, periodoContrato: '5 anos',
      googleMapsUrl: 'https://maps.google.com/?q=Av.+Conego+Vasconcelos+423+Bangu+RJ',
      descricao: 'Ponto comercial em corredor varejista de Bangu, ao lado de Casas Pedro.',
    },
    {
      codigo: 'PB-002', titulo: 'Esquina Rua da Assembleia - Centro', tipo: 'locacao', status: 'disponivel',
      endereco: 'Rua da Assembleia', numero: '58', complemento: 'Loja 01', bairro: 'Centro', cidade: 'Rio de Janeiro', uf: 'RJ', cep: '20011-901',
      areaTotal: 210, areaUtil: 190, pisoAreaVenda: 190, peDireito: 3.8, frenteImovel: 9.5,
      aluguel: 32000, condominio: 1200, iptu: 900, periodoContrato: '5 anos',
      descricao: 'Esquina de alto fluxo corporativo, ideal para food service e conveniência.',
    },
    {
      codigo: 'PB-003', titulo: 'Av. das Américas - Barra', tipo: 'venda', status: 'negociacao',
      endereco: 'Av. das Américas', numero: '4200', complemento: 'Loja 110', bairro: 'Barra da Tijuca', cidade: 'Rio de Janeiro', uf: 'RJ', cep: '22640-102',
      areaTotal: 380, areaUtil: 340, pisoAreaVenda: 340, peDireito: 4.2, frenteImovel: 12,
      precoVenda: 4500000, periodoContrato: null,
      descricao: 'Ativo imobiliário para venda em corredor premium da Barra.',
    },
    {
      codigo: 'PB-004', titulo: 'Rua Voluntários da Pátria - Botafogo', tipo: 'locacao', status: 'disponivel',
      endereco: 'Rua Voluntários da Pátria', numero: '190', bairro: 'Botafogo', cidade: 'Rio de Janeiro', uf: 'RJ', cep: '22270-010',
      areaTotal: 95, areaUtil: 88, pisoAreaVenda: 88, peDireito: 3.2, frenteImovel: 4.8,
      aluguel: 14500, condominio: 600, iptu: 420, periodoContrato: '3 anos',
      descricao: 'Loja compacta em rua de forte fluxo pedrestre, próxima ao metrô.',
    },
    {
      codigo: 'PB-005', titulo: 'Av. Ayrton Senna - Barra (galpão)', tipo: 'locacao', status: 'disponivel',
      endereco: 'Av. Ayrton Senna', numero: '3000', bairro: 'Barra da Tijuca', cidade: 'Rio de Janeiro', uf: 'RJ', cep: '22775-003',
      areaTotal: 850, areaUtil: 800, pisoAreaVenda: 800, peDireito: 6, frenteImovel: 22,
      aluguel: 85000, condominio: 3200, iptu: 2400, periodoContrato: '10 anos',
      descricao: 'Galpão comercial para grandes formatos — home center, pet, utilidades.',
    },
    {
      codigo: 'PB-006', titulo: 'Rua Conde de Bonfim - Tijuca', tipo: 'locacao', status: 'locado',
      endereco: 'Rua Conde de Bonfim', numero: '255', complemento: 'Sobreloja', bairro: 'Tijuca', cidade: 'Rio de Janeiro', uf: 'RJ', cep: '20520-050',
      areaTotal: 140, areaUtil: 130, pisoAreaVenda: 130, peDireito: 3.4, frenteImovel: 6,
      aluguel: 18000, condominio: 750, iptu: 500, periodoContrato: '5 anos',
      descricao: 'Locado em 2025 para rede de farmácias.',
    },
  ];
  for (const im of imoveis) {
    const ex = await prisma.imovel.findUnique({ where: { codigo: im.codigo } });
    if (!ex) await prisma.imovel.create({ data: im });
  }

  // Foto de exemplo para o PB-001 (imagem aérea do portfólio)
  const seedImg = path.join(__dirname, 'assets', 'bangu-aerea.jpg');
  const pb1Check = await prisma.imovel.findUnique({ where: { codigo: 'PB-001' }, include: { fotos: true } });
  if (pb1Check && fs.existsSync(seedImg) && !pb1Check.fotos.length) {
    const dest = path.join(__dirname, '..', 'uploads', 'seed-bangu-aerea.jpg');
    fs.copyFileSync(seedImg, dest);
    await prisma.imovelFoto.create({ data: { imovelId: pb1Check.id, arquivo: 'seed-bangu-aerea.jpg', principal: true, ordem: 0, legenda: 'Vista aérea' } });
  }

  // Oportunidades de exemplo
  const pb1 = await prisma.imovel.findUnique({ where: { codigo: 'PB-001' } });
  const pb4 = await prisma.imovel.findUnique({ where: { codigo: 'PB-004' } });
  const drogasmil = await prisma.empresa.findFirst({ where: { nome: 'Drogasmil' } });
  const monamie = await prisma.empresa.findFirst({ where: { nome: 'Monamie' } });
  if (pb1 && drogasmil && !(await prisma.oportunidade.findFirst({ where: { imovelId: pb1.id, empresaId: drogasmil.id } }))) {
    await prisma.oportunidade.create({ data: { imovelId: pb1.id, empresaId: drogasmil.id, etapa: 'apresentado', observacao: 'Apresentado por e-mail' } });
  }
  if (pb4 && monamie && !(await prisma.oportunidade.findFirst({ where: { imovelId: pb4.id, empresaId: monamie.id } }))) {
    await prisma.oportunidade.create({ data: { imovelId: pb4.id, empresaId: monamie.id, etapa: 'visita' } });
  }

  console.log('Seed concluído. Usuários: admin@prospeccaobrasil.com.br / prospeccao123');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
