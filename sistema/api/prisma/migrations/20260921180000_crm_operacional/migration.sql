-- CRM operacional: responsável, próxima ação e atividades por lead
ALTER TABLE "leads" ADD COLUMN "responsavel_id" INTEGER REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "leads" ADD COLUMN "proxima_acao" TEXT;
ALTER TABLE "leads" ADD COLUMN "proxima_acao_em" DATETIME;
CREATE INDEX "leads_responsavel_id_idx" ON "leads"("responsavel_id");

CREATE TABLE "lead_atividades" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "lead_id" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'nota',
    "texto" TEXT NOT NULL,
    "autor_id" INTEGER,
    "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lead_atividades_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "lead_atividades_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "lead_atividades_lead_id_idx" ON "lead_atividades"("lead_id");
