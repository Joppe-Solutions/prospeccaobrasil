-- Financeiro: lançamentos de receita/despesa com baixa e estorno
CREATE TABLE "lancamentos" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tipo" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL NOT NULL,
    "competencia" DATETIME,
    "vencimento" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'previsto',
    "pago_em" DATETIME,
    "valor_pago" DECIMAL,
    "forma_pagamento" TEXT,
    "estornado_em" DATETIME,
    "estorno_motivo" TEXT,
    "imovel_id" INTEGER REFERENCES "imoveis"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "empresa_id" INTEGER REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "oportunidade_id" INTEGER REFERENCES "oportunidades"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "criado_por_id" INTEGER REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "lancamentos_tipo_status_idx" ON "lancamentos"("tipo", "status");
CREATE INDEX "lancamentos_vencimento_idx" ON "lancamentos"("vencimento");
CREATE INDEX "lancamentos_imovel_id_idx" ON "lancamentos"("imovel_id");
CREATE INDEX "lancamentos_empresa_id_idx" ON "lancamentos"("empresa_id");
