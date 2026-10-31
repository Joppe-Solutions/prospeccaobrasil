-- Status do imóvel: disponível, em análise, concluído e inativo
-- Locado e vendido viram concluído (o tipo do imóvel continua dizendo qual foi o negócio).
-- Em negociação sai: o imóvel segue disponível e a negociação fica nas ações das operações.
UPDATE "imoveis" SET "status" = 'concluido' WHERE "status" IN ('locado', 'vendido');
UPDATE "imoveis" SET "status" = 'disponivel' WHERE "status" = 'negociacao';
