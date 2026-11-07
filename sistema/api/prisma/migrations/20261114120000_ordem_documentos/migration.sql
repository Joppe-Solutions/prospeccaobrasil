ALTER TABLE "imovel_documentos" ADD COLUMN "ordem" INTEGER NOT NULL DEFAULT 0;

-- Preserva a ordem anteriormente exibida no detalhe do imóvel.
UPDATE "imovel_documentos" AS d
SET "ordem" = (
  SELECT COUNT(*) FROM "imovel_documentos" AS anterior
  WHERE anterior."imovel_id" = d."imovel_id"
    AND (anterior."criado_em" > d."criado_em" OR (anterior."criado_em" = d."criado_em" AND anterior."id" > d."id"))
);
