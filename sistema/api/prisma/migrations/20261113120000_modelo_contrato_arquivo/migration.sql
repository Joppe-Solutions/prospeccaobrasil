-- Modelo de contrato com arquivo enviado; o link vira opcional e fica só nos modelos antigos
CREATE TABLE "new_modelos_contrato" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "categoria" TEXT NOT NULL DEFAULT 'outro',
    "descricao" TEXT,
    "url" TEXT,
    "arquivo" TEXT,
    "arquivo_nome" TEXT,
    "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" DATETIME NOT NULL
);
INSERT INTO "new_modelos_contrato" ("id", "nome", "categoria", "descricao", "url", "criado_em", "atualizado_em")
SELECT "id", "nome", "categoria", "descricao", "url", "criado_em", "atualizado_em" FROM "modelos_contrato";
DROP TABLE "modelos_contrato";
ALTER TABLE "new_modelos_contrato" RENAME TO "modelos_contrato";
