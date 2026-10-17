-- Operador do ponto comercial (passagem de ponto): mesmo cadastro dos proprietários, com um "papel".
ALTER TABLE "proprietarios" ADD COLUMN "papel" TEXT NOT NULL DEFAULT 'proprietario';
ALTER TABLE "proprietarios" ADD COLUMN "marca" TEXT;
ALTER TABLE "imoveis" ADD COLUMN "operador_id" INTEGER REFERENCES "proprietarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "imoveis_operador_id_idx" ON "imoveis"("operador_id");
