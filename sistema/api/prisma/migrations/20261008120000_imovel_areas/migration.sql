-- CreateTable
CREATE TABLE "imovel_areas" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "imovel_id" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "area" DECIMAL NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "imovel_areas_imovel_id_fkey" FOREIGN KEY ("imovel_id") REFERENCES "imoveis" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "imovel_areas_imovel_id_idx" ON "imovel_areas"("imovel_id");

-- Áreas fixas antigas viram linhas da composição (as colunas continuam, sincronizadas pela API)
INSERT INTO "imovel_areas" ("imovel_id", "nome", "area", "ordem")
SELECT "id", 'Piso área de venda', "piso_area_venda", 0 FROM "imoveis" WHERE "piso_area_venda" IS NOT NULL AND "piso_area_venda" > 0;
INSERT INTO "imovel_areas" ("imovel_id", "nome", "area", "ordem")
SELECT "id", 'Jirau', "jirau", 1 FROM "imoveis" WHERE "jirau" IS NOT NULL AND "jirau" > 0;
INSERT INTO "imovel_areas" ("imovel_id", "nome", "area", "ordem")
SELECT "id", 'Mezanino', "mezanino", 2 FROM "imoveis" WHERE "mezanino" IS NOT NULL AND "mezanino" > 0;
