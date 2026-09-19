-- CreateTable
CREATE TABLE "leads" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "telefone" TEXT,
    "email" TEXT,
    "origem" TEXT NOT NULL DEFAULT 'site',
    "interesse" TEXT,
    "status" TEXT NOT NULL DEFAULT 'novo',
    "observacoes" TEXT,
    "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "proprietarios" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tipo_pessoa" TEXT NOT NULL DEFAULT 'pf',
    "nome" TEXT NOT NULL,
    "documento" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "cidade" TEXT,
    "uf" TEXT,
    "observacoes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "parceiros" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "tipo" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "cidade" TEXT,
    "uf" TEXT,
    "observacoes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "imovel_despesas" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "imovel_id" INTEGER NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL NOT NULL,
    "data" DATETIME,
    "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "imovel_despesas_imovel_id_fkey" FOREIGN KEY ("imovel_id") REFERENCES "imoveis" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_imoveis" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "codigo" TEXT NOT NULL,
    "titulo" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'locacao',
    "categoria" TEXT DEFAULT 'loja',
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
    "proprietario_id" INTEGER,
    "parceiro_id" INTEGER,
    "google_maps_url" TEXT,
    "google_drive_url" TEXT,
    "descricao" TEXT,
    "observacoes" TEXT,
    "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" DATETIME NOT NULL,
    CONSTRAINT "imoveis_proprietario_id_fkey" FOREIGN KEY ("proprietario_id") REFERENCES "proprietarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "imoveis_parceiro_id_fkey" FOREIGN KEY ("parceiro_id") REFERENCES "parceiros" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_imoveis" ("id", "codigo", "titulo", "tipo", "status", "endereco", "numero", "complemento", "bairro", "cidade", "uf", "cep", "latitude", "longitude", "area_total", "area_util", "piso_area_venda", "jirau", "mezanino", "pe_direito", "frente_imovel", "cdu", "aluguel", "condominio", "iptu", "preco_venda", "periodo_contrato", "proprietario", "tel_proprietario", "google_maps_url", "google_drive_url", "descricao", "observacoes", "criado_em", "atualizado_em")
SELECT "id", "codigo", "titulo", "tipo", "status", "endereco", "numero", "complemento", "bairro", "cidade", "uf", "cep", "latitude", "longitude", "area_total", "area_util", "piso_area_venda", "jirau", "mezanino", "pe_direito", "frente_imovel", "cdu", "aluguel", "condominio", "iptu", "preco_venda", "periodo_contrato", "proprietario", "tel_proprietario", "google_maps_url", "google_drive_url", "descricao", "observacoes", "criado_em", "atualizado_em" FROM "imoveis";
DROP TABLE "imoveis";
ALTER TABLE "new_imoveis" RENAME TO "imoveis";
CREATE UNIQUE INDEX "imoveis_codigo_key" ON "imoveis"("codigo");
CREATE INDEX "imoveis_proprietario_id_idx" ON "imoveis"("proprietario_id");
CREATE INDEX "imoveis_parceiro_id_idx" ON "imoveis"("parceiro_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "imovel_despesas_imovel_id_idx" ON "imovel_despesas"("imovel_id");
