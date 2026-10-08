-- Proposta comercial passa a seguir o modelo oficial: campos do documento, cliente obrigatório, demanda opcional.
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_propostas_servico" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "numero" TEXT NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "demanda_id" INTEGER,
    "marca" TEXT,
    "data" TEXT,
    "area_atuacao" TEXT,
    "quantidade_unidades" TEXT,
    "prazo_atuacao" TEXT,
    "contratante" TEXT,
    "honorarios_prospeccao" TEXT,
    "remuneracao_intermediacao" TEXT,
    "forma_pagamento" TEXT,
    "exclusividade" TEXT,
    "validade" TEXT,
    "observacoes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'rascunho',
    "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" DATETIME NOT NULL,
    CONSTRAINT "propostas_servico_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "propostas_servico_demanda_id_fkey" FOREIGN KEY ("demanda_id") REFERENCES "demandas" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
-- Propostas antigas: o cliente vem da demanda; título, escopo e condições viram observações internas.
INSERT INTO "new_propostas_servico" ("id", "numero", "empresa_id", "demanda_id", "prazo_atuacao", "honorarios_prospeccao", "observacoes", "status", "criado_em", "atualizado_em")
SELECT p."id", 'PC-' || printf('%04d', p."id"), d."empresa_id", p."demanda_id", p."prazo",
       CASE WHEN p."honorarios" IS NOT NULL THEN 'R$ ' || p."honorarios" END,
       trim(p."titulo" || char(10) || p."escopo" || COALESCE(char(10) || p."condicoes", '')),
       p."status", p."criado_em", p."atualizado_em"
FROM "propostas_servico" p JOIN "demandas" d ON d."id" = p."demanda_id";
DROP TABLE "propostas_servico";
ALTER TABLE "new_propostas_servico" RENAME TO "propostas_servico";
CREATE UNIQUE INDEX "propostas_servico_numero_key" ON "propostas_servico"("numero");
CREATE INDEX "propostas_servico_empresa_id_idx" ON "propostas_servico"("empresa_id");
CREATE INDEX "propostas_servico_demanda_id_idx" ON "propostas_servico"("demanda_id");
PRAGMA foreign_keys=ON;
