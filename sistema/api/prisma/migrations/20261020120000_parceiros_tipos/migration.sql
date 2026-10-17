-- Parceiros com campos específicos por tipo: pessoa física/jurídica, CPF/CNPJ, CRECI (corretor e imobiliária),
-- OAB (advogado) e responsável (pessoa jurídica).
ALTER TABLE "parceiros" ADD COLUMN "tipo_pessoa" TEXT NOT NULL DEFAULT 'pf';
ALTER TABLE "parceiros" ADD COLUMN "documento" TEXT;
ALTER TABLE "parceiros" ADD COLUMN "creci" TEXT;
ALTER TABLE "parceiros" ADD COLUMN "creci_uf" TEXT;
ALTER TABLE "parceiros" ADD COLUMN "oab" TEXT;
ALTER TABLE "parceiros" ADD COLUMN "oab_uf" TEXT;
ALTER TABLE "parceiros" ADD COLUMN "responsavel" TEXT;
-- Imobiliária é sempre pessoa jurídica
UPDATE "parceiros" SET "tipo_pessoa" = 'pj' WHERE "tipo" = 'imobiliaria';
