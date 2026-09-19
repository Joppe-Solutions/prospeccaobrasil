-- CreateTable
CREATE TABLE "usuarios" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "empresas" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "segmento" TEXT,
    "cnpj" TEXT,
    "site" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "contato_nome" TEXT,
    "contato_cargo" TEXT,
    "cidade" TEXT,
    "uf" TEXT,
    "perfil_loja" TEXT,
    "area_minima" DECIMAL,
    "area_maxima" DECIMAL,
    "regioes_interesse" TEXT,
    "observacoes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "imoveis" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "codigo" TEXT NOT NULL,
    "titulo" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'locacao',
    "status" TEXT NOT NULL DEFAULT 'disponivel',
    "endereco" TEXT NOT NULL,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cidade" TEXT NOT NULL,
    "uf" TEXT NOT NULL DEFAULT 'RJ',
    "cep" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "area_total" DECIMAL,
    "area_util" DECIMAL,
    "piso_area_venda" DECIMAL,
    "jirau" DECIMAL,
    "mezanino" DECIMAL,
    "pe_direito" DECIMAL,
    "frente_imovel" DECIMAL,
    "cdu" DECIMAL,
    "aluguel" DECIMAL,
    "condominio" DECIMAL,
    "iptu" DECIMAL,
    "preco_venda" DECIMAL,
    "periodo_contrato" TEXT,
    "proprietario" TEXT,
    "tel_proprietario" TEXT,
    "google_maps_url" TEXT,
    "google_drive_url" TEXT,
    "descricao" TEXT,
    "observacoes" TEXT,
    "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "imovel_fotos" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "imovel_id" INTEGER NOT NULL,
    "arquivo" TEXT NOT NULL,
    "legenda" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "principal" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "imovel_fotos_imovel_id_fkey" FOREIGN KEY ("imovel_id") REFERENCES "imoveis" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "imovel_documentos" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "imovel_id" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "url" TEXT,
    "arquivo" TEXT,
    "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "imovel_documentos_imovel_id_fkey" FOREIGN KEY ("imovel_id") REFERENCES "imoveis" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "analises_mercado" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "imovel_id" INTEGER NOT NULL,
    "score" INTEGER,
    "resumo" TEXT,
    "conteudo_json" TEXT,
    "modelo" TEXT NOT NULL DEFAULT 'motor-interno',
    "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "analises_mercado_imovel_id_fkey" FOREIGN KEY ("imovel_id") REFERENCES "imoveis" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "oportunidades" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "imovel_id" INTEGER NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "etapa" TEXT NOT NULL DEFAULT 'apresentado',
    "observacao" TEXT,
    "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" DATETIME NOT NULL,
    CONSTRAINT "oportunidades_imovel_id_fkey" FOREIGN KEY ("imovel_id") REFERENCES "imoveis" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "oportunidades_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "imoveis_codigo_key" ON "imoveis"("codigo");
