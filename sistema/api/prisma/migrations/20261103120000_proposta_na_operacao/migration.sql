-- Acompanhamento da proposta dentro da ação da operação
ALTER TABLE "oportunidades" ADD COLUMN "proposta_status" TEXT NOT NULL DEFAULT 'sem_proposta';
ALTER TABLE "oportunidades" ADD COLUMN "proposta_valor" DECIMAL;
ALTER TABLE "oportunidades" ADD COLUMN "proposta_enviada_em" TEXT;
ALTER TABLE "oportunidades" ADD COLUMN "proposta_retorno_em" TEXT;
ALTER TABLE "oportunidades" ADD COLUMN "proposta_observacao" TEXT;
ALTER TABLE "oportunidades" ADD COLUMN "proposta_atualizada_em" DATETIME;
