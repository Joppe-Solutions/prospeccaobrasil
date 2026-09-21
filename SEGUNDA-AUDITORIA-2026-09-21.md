# Segunda auditoria — verificação das correções do Devin

Data: 21/09/2026. Commit examinado: `66bdc5a7544c0f5d24fe6c0fc8afd04774a17d70`, comparado com `d23c759`.
Repositório encontrado: `/Users/relterborges/prospeccaobrasil`; aplicação em `sistema/`, site em `landing/`. As antigas pastas informadas na conversa não estão mais nesses caminhos. O legado Go não foi utilizado.

## Conclusão

As alterações e o deploy são reais, mas não encerram a auditoria. Permanecem dois P1 reproduzidos e vários P2. Leads ainda não têm conversão operacional completa; financeiro continua sendo um controle de despesas, e a integração do formulário com o CRM não garante persistência nem preserva novos contatos repetidos.

Não alterei o código da aplicação, não fiz deploy e não escrevi dados em produção. Os testes de falhas usaram uma cópia temporária do backend, uploads sintéticos e SQLite novo, inicializado com os dois SQLs de migrations versionados.

## Evidências de execução e limites

- GitHub confirma [CI concluído](https://github.com/Joppe-Solutions/prospeccaobrasil/actions/runs/35611228099) e [deploy concluído](https://github.com/Joppe-Solutions/prospeccaobrasil/actions/runs/35611228360).
- Li os logs do gate: **25 testes API passaram, zero falhas; 15 E2E passaram**. O gate executou antes da publicação.
- `npm run lint` e `npm run build` do frontend passaram localmente.
- `npm test` e `npm run test:e2e` locais falharam no bootstrap `prisma migrate deploy`, com `Schema engine error`, antes de executar os casos. A causa local não foi determinada. Isso não invalida os logs positivos do runner, nem permite declarar a reprodução local dessas suítes bem-sucedida.
- A bateria independente contra o backend real reproduziu os casos abaixo após aplicar os SQLs diretamente em banco temporário. Esse procedimento verifica comportamento da aplicação; não valida o mecanismo de deploy das migrations.
- `GET https://sistema.prospeccaobrasil.com.br/api/healthz` retornou `{"ok":true}`.
- Bundle JS público `index-B1EgTsFA.js` tem o mesmo SHA-256 do build local: `78a8496fea5f149be2b1e5f580b68829f743cf420f4b0972845c1f166170f1b5`.
- Isso comprova correspondência do frontend servido e execução do pipeline; não é atestado integral do backend remoto, Nginx, firewall, backup, permissões do runner ou logs da VPS.
- Não executei os ataques de reprodução em produção nem consultei documentos reais de clientes.

## Achados prioritários

### B01 — P1 — arquivos privados continuam acessíveis sem autenticação (A01 parcial)

Referências: `sistema/api/src/app.js:25`, `src/routes/imoveis.js:190`, `src/lib/publicDocs.js`.

O filtro remove documentos privados do JSON/HTML, mas todo o diretório de uploads continua publicado por `express.static('/uploads', ...)`, antes da autenticação. Um arquivo com cadastro `tipo: doc_locatario` foi baixado anonimamente: **HTTP 200**, conteúdo `%PDF-1.4 AUDIT PRIVATE`. A reprodução usou um arquivo sintético no diretório isolado, associado a um imóvel pela mesma modelagem usada no upload.

Impacto: quem conhece ou recebe uma URL consegue acessar o arquivo mesmo sem sessão. URL difícil de adivinhar não é autorização. O cache público de sete dias também precisa ser considerado ao revogar acesso.

Correção: separar entrega pública e privada; autorizar cada download privado; impedir acesso alternativo pela pasta estática e por eventual alias Nginx. Manter fotos/documentos deliberadamente públicos funcionais. Para conteúdo privado, revisar cache e URLs já distribuídas. A lista pública agora inclui planta, inteligência, RIG, AVCB, convenção e IPTU: revisar essa política, pois o tipo documental sozinho não prova autorização para publicação.

Aceite: testar o próprio conteúdo do arquivo, não apenas ausência do link; anônimo negado, usuário autorizado permitido, mudança para privado revoga novas requisições e URLs antigas não contornam o controle. Cópias já baixadas não podem ser recuperadas pelo servidor.

### B02 — P1 — restrição financeira é contornável por rotas de imóveis (A17 parcial)

Referências: `src/routes/financeiro.js:11`; `src/routes/imoveis.js:95,208,215,236`.

Com o mesmo token de usuário comercial:

| Operação | Resultado observado |
|---|---|
| GET /api/financeiro | 403 |
| POST /api/imoveis/:id/despesas | 200, criou despesa |
| GET /api/imoveis/:id/despesas | 200, retornou valores |
| DELETE /api/imoveis/:id/despesas/:id | 200, apagou despesa |

O detalhe do imóvel também inclui `despesas` sem filtro por papel. Esconder o menu não aplica a regra às demais entradas.

Correção: uma política única de acesso financeiro em todas as rotas, respostas e controles da interface. Se comercial deve ter alguma permissão financeira, explicitar a matriz; a implementação atual não corresponde à alegação de financeiro restrito a admin.

Aceite: comercial não lê nem altera despesas pelos caminhos alternativos; admin mantém o fluxo. Testar também o payload do detalhe, não só /financeiro.

### B03 — P2 — captação da landing ignora falhas e usa produção em qualquer ambiente (A06 parcial)

Referência: `landing/src/main.jsx:124-152`.

O handler dispara `fetch`, não aguarda o resultado, não verifica `res.ok`, descarta rejeições e abre o WhatsApp imediatamente. Assim, 400/429/500 ou falha de rede não informam que o CRM deixou de registrar o contato. O endpoint de produção está fixo no código, inclusive quando a landing roda localmente.

Correção: URL configurável por ambiente, confirmação de persistência, estado de envio, mensagens de erro e repetição segura. Preservar alternativa explícita de contato pelo WhatsApp e considerar bloqueadores de popup ao mudar o fluxo assíncrono. Não alterar o design público por causa dessa correção.

Aceite: E2E do formulário real em ambiente isolado, com sucesso, indisponibilidade, 429 e reenvio; nenhum teste/local envia dados inadvertidamente para produção.

### B04 — P2 — deduplicação descarta novas demandas (A06 parcial)

Referência: `src/routes/public.js:65-77`.

Primeiro POST com e-mail sintético e mensagem “Primeira demanda” retornou 201. Segundo POST com o mesmo e-mail e “Segunda demanda” retornou 200/duplicado, mas o banco continuou apenas com “Primeira demanda”. Nenhum histórico registra o segundo contato.

Correção: distinguir reenvio técnico da mesma submissão de uma nova interação do mesmo contato. Preservar mensagem, interesse e data de cada interação, normalizar telefone e garantir deduplicação sob concorrência. Evitar mesclar pessoas silenciosamente por telefone compartilhado.

Aceite: um retry não duplica; uma demanda diferente fica registrada; versões formatadas do mesmo telefone seguem política documentada; testar concorrência.

### B05 — P2 — conversão não mantém vínculo e pode gerar duplicatas (A07 parcial)

Referências: `src/routes/leads.js:62-97`, `prisma/schema.prisma` (Lead), `frontend/src/pages/Leads.jsx`.

Reprodução: converter lead → empresa 1; PUT status novo → 200; converter novamente → empresa 2. Ambas ficaram persistidas. A empresa criada recebe só o nome: telefone e e-mail preenchidos no lead chegaram como null. O modelo não registra vínculo persistente de conversão com empresa/oportunidade. A tela continua apenas editando status, sem chamar o novo endpoint de conversão. É possível marcar “convertido” sem efetuar conversão.

Além disso, converter com empresaId inexistente retornou **500**, embora a rota monte erro com status 404: o middleware global ignora esse status.

Correção: relação persistente e invariantes transacionais de conversão; copiar dados pertinentes sem sobrescrever empresa existente indevidamente; apresentar resultado na UI em modal/wizard reutilizável. Evitar duplicação após mudança de status/retry e cobrir chamadas simultâneas. Tratar IDs inválidos/inexistentes como 4xx sem gravar parcialmente.

Observação: o teste de repetição imediata com 409 cobre só um cenário. Não demonstrei duplicação concorrente; ela deve ser testada, não presumida como reproduzida.

### B06 — P2 — sequência de imóveis trava na transição para quatro dígitos (A11 parcial)

Referência: `src/routes/imoveis.js:104-123`.

Com apenas PB-999 e PB-1000 no banco, cadastrar sem código retornou **409** após os retries. O código ordena strings, escolhe PB-999 e tenta PB-1000 repetidamente. Códigos manuais não numéricos também não são adequadamente separados da sequência. Em colisão de código explicitamente informado, o retry pode substituí-lo sem avisar.

Correção: sequência numérica persistente/atômica ou estratégia equivalente, diferenciando geração automática de código informado. Testar PB-999/PB-1000, exclusões, códigos manuais e concorrência. Código explícito duplicado deve retornar conflito, sem substituição silenciosa.

### B07 — P2 — datas inválidas e frações de centavo são aceitas (A09/A10 parciais)

Referência: `src/routes/imoveis.js:215-232`; `src/routes/financeiro.js:7`; `frontend/src/pages/Financeiro.jsx:49`.

POST de despesa com `valor: 1.005` e `data: 2026-02-30` retornou 200, armazenando valor 1.005 e data **2026-03-02T12:00:00.000Z**. A data impossível foi normalizada silenciosamente. Somar em centavos na leitura não padroniza os valores gravados; `Math.round(Number(...) * 100)` ainda passa por ponto flutuante.

A gravação ao meio-dia corrige o caso novo usual no fuso brasileiro, mas não houve migração dos registros antigos. A exibição continua usando Date/toLocaleDateString; datas legadas à meia-noite UTC podem continuar no dia anterior. Não inspecionei registros financeiros reais para medir o alcance desse problema.

Correção: contrato explícito de moeda com duas casas/centavos ou Decimal exato, validação estrita de data civil e tratamento compatível para dados legados. Não deslocar todas as datas indiscriminadamente.

Aceite: data impossível retorna 400; formato com lixo é rejeitado; política para 1.005 é explícita; API, totais e telas concordam; testes no fuso America/Sao_Paulo com registros novos e legados.

### B08 — P2 — inteligência de mercado continua sem fonte para suas afirmações (A18 não corrigido)

Referência: `src/services/inteligencia.js`.

O diff não altera esse serviço. Faixas fixas e nomes de bairros continuam gerando frases como “competitivo para a região”, “acima da média” e “alto fluxo e poder de compra”, sem consulta a comparáveis. Dados ausentes podem resultar em “sem pontos críticos”. A resposta do Devin não cita A18 entre corrigidos nem pendências.

Correção: rotular como triagem heurística baseada em cadastro, mostrar dados insuficientes e separar cálculos, inferências e evidências. Comparações de mercado exigem fonte/data/amostra; minimizar campos enviados a eventual provedor externo. Não foi chamada IA externa nesta auditoria.

## Melhorias implementadas que devem ser preservadas

| Item | Verificação |
|---|---|
| A02 revogação de usuário | Reproduzida: token anterior passou a 401 após desativação; middleware consulta papel atual |
| A03 bloqueio de exclusão com vínculos | Guardas presentes para imóvel e empresa; cobertura no gate. Não equivalem a trilha financeira nem proteção atômica contra corrida |
| A04 gate de deploy | Confirmado em workflow e logs antes da publicação |
| A05 forks | Condição de exclusão de PRs de forks presente em todos os jobs de CI |
| A12 validação básica/senha | Regras adicionadas; não substituem validação uniforme de tipos/IDs/limites |
| A13/A14 erros e link | Checks res.ok e uso de window.location.origin presentes nas alterações do detalhe |
| A15 imóvel inativo | Guardas 404 presentes na apresentação e JSON público |
| A16 busca de leads | Interesse/telefone/e-mail incluídos |
| Extras | Healthcheck consulta banco, trust proxy configurado, promoção de foto implementada, metadados da landing corrigidos |

## Pendências operacionais e funcionais

- **Runner:** bloquear forks é melhoria real, porém PRs do próprio repo continuam executando no runner rotulado `prospeccao-prod`. Separar testes em runner hospedado/isolado e reservar acesso de produção ao deploy protegido. Não verifiquei credenciais ou isolamento do host; não afirmo exploração ocorrida.
- **Histórico:** excluir despesas continua sendo exclusão definitiva e é sugerido pela mensagem de validação como “estorno”. Uma operação financeira rastreável precisa de reversão/cancelamento registrado, autor, data e motivo. Guardas de delete consultam e apagam em operações separadas; revisar transações/FKs e limpeza de arquivos após confirmação do banco.
- **Financeiro completo:** schema contém somente despesas por imóvel. Receitas, comissões, repasses, vencimentos, contas a pagar/receber, baixa e integração com fechamento continuam fora do que existe. Não declarar módulo completo antes de definir e entregar esse fluxo.
- **CRM:** faltam responsável, atividades, próxima ação e vínculo histórico de conversão. Priorizar conversão confiável antes de novos indicadores.
- **Publicação:** status inativo agora bloqueia a página, mas vendido/locado ainda pode receber título “DISPONÍVEL” na apresentação. Separar disponibilidade de publicação e refletir status real.
- **Escala/recuperação:** paginação no servidor, limites de exportação, monitoramento e backup com restauração comprovada continuam pendentes de verificação/implementação.
- **Cobertura:** os 15 E2E cobrem login, navegação, abertura de módulos e detalhe. Não validam submissão da landing, conversão ou lançamentos financeiros. Quantidade de testes não demonstra fechamento dos achados.
- **Interface:** preservar paleta/identidade, acrescentar ações claras para contato/conversão, histórico e próximos passos. Testar modal/wizard, teclado e mobile em fluxos reais. A segunda auditoria não foi uma bateria visual completa em navegador.

## Ordem recomendada

1. B01/B02: proteção de arquivos e permissões em todas as entradas.
2. B03–B07: integridade da captação/conversão, códigos, valores e datas, com regressões reproduzíveis.
3. B08, isolamento de CI, preservação de histórico, publicação e recuperação operacional.
4. Evolução do CRM e financeiro por fluxos de negócio completos, sem confundir funcionalidades novas com correções encerradas.

Solicitar entrega por achado: reprodução anterior, correção, teste negativo/positivo, arquivos/migrations, evidência do CI e limitações restantes. Não aceitar “tudo verde” como substituto dessas evidências.
