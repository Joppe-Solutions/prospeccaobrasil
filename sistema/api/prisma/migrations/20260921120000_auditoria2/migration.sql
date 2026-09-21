-- Vínculo persistente de conversão: Lead -> Empresa/Oportunidade
ALTER TABLE "leads" ADD COLUMN "empresa_id" INTEGER REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "leads" ADD COLUMN "oportunidade_id" INTEGER REFERENCES "oportunidades"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "leads_empresa_id_idx" ON "leads"("empresa_id");

-- Histórico de interações de leads (deduplicação preserva novas demandas)
CREATE TABLE "lead_interacoes" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "lead_id" INTEGER NOT NULL,
    "mensagem" TEXT,
    "interesse" TEXT,
    "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lead_interacoes_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "lead_interacoes_lead_id_idx" ON "lead_interacoes"("lead_id");

-- Estorno de despesa preserva histórico (não apaga lançamento)
ALTER TABLE "imovel_despesas" ADD COLUMN "estornada" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "imovel_despesas" ADD COLUMN "estornado_em" DATETIME;
ALTER TABLE "imovel_despesas" ADD COLUMN "estorno_motivo" TEXT;
ALTER TABLE "imovel_despesas" ADD COLUMN "criado_por_id" INTEGER;

-- Sequência persistente para códigos PB-xxx (atômica, imune a exclusões)
CREATE TABLE "sequencias" (
    "nome" TEXT NOT NULL PRIMARY KEY,
    "valor" INTEGER NOT NULL DEFAULT 0
);
INSERT INTO "sequencias" ("nome", "valor")
SELECT 'imovel', COALESCE(MAX(CAST(SUBSTR("codigo", 4) AS INTEGER)), 0)
FROM "imoveis"
WHERE "codigo" GLOB 'PB-[0-9]*'
  AND SUBSTR("codigo", 4) NOT GLOB '*[^0-9]*';
