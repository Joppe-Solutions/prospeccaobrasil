-- Tipos de parceiro: consultor (CPF), advogado (OAB), corretor (CRECI-PF), imobiliária (CRECI-PJ), indicador (sem registro).
-- "Outro" e sem tipo passam a indicador; corretor pessoa jurídica é imobiliária.
UPDATE "parceiros" SET "tipo" = 'indicador' WHERE "tipo" IS NULL OR "tipo" = 'outro';
UPDATE "parceiros" SET "tipo" = 'imobiliaria' WHERE "tipo" = 'corretor' AND "tipo_pessoa" = 'pj';
