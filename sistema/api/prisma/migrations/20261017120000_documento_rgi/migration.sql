-- "RIG" era erro de digitação de RGI (Registro Geral de Imóveis): documentos existentes passam ao tipo correto.
UPDATE "imovel_documentos" SET "tipo" = 'rgi' WHERE "tipo" = 'rig';
