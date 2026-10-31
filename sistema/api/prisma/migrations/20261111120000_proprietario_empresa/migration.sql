-- Empresa do proprietário/operador PJ: vínculo com o cadastro de Clientes ou nome digitado
ALTER TABLE "proprietarios" ADD COLUMN "empresa_id" INTEGER REFERENCES "empresas" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "proprietarios" ADD COLUMN "empresa_nome" TEXT;
CREATE INDEX "proprietarios_empresa_id_idx" ON "proprietarios"("empresa_id");
