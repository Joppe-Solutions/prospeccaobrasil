Revise e corrija as pendências da segunda auditoria do Prospecção Brasil. Seu commit 66bdc5a7544c0f5d24fe6c0fc8afd04774a17d70 e o deploy foram verificados: os logs realmente mostram 25 testes API e 15 E2E passando. Entretanto, a auditoria reproduziu falhas não cobertas pelos testes. Não considere os P1/P2 encerrados apenas pelo gate verde.

Trabalhe no repositório Joppe-Solutions/prospeccaobrasil (sistema/ e landing/); ignore o legado Go. Leia SEGUNDA-AUDITORIA-2026-09-21.md, se disponível, e reproduza os casos abaixo com dados sintéticos em ambiente isolado. Preserve o visual da landing pública; altere somente a integração necessária. Preserve a identidade visual do sistema e use componentes reutilizáveis de modal/wizard nas novas ações.

PRIORIDADE 1 — SEGURANÇA

1. B01/A01: app.js ainda publica /uploads sem autenticação. Documento cadastrado como doc_locatario foi baixado anonimamente com HTTP 200 usando sua URL. Ocultar links no HTML/JSON não protege arquivos. Implemente entrega autorizada para documentos privados, mantenha os públicos deliberadamente publicados e bloqueie bypass pelo caminho antigo/alias do servidor. Revise cache, URLs legadas e a política de publicação por tipo. Teste download real anônimo negado, autorizado permitido e revogação de publicação.

2. B02/A17: comercial recebe 403 em /api/financeiro, mas GET/POST/DELETE /api/imoveis/:id/despesas retornam 200. O detalhe também inclui despesas. Aplique a mesma matriz de permissões a todas as rotas e payloads financeiros e à UI. Teste acessos alternativos, não apenas menu e endpoint principal.

PRIORIDADE 2 — INTEGRIDADE E INTEGRAÇÃO

3. B03/A06: landing/src/main.jsx dispara fetch sem await/res.ok, engole erros e abre WhatsApp. O endereço de produção está hardcoded. Configure URL por ambiente e implemente confirmação real, estado de envio, erro e retry seguro, preservando alternativa explícita de WhatsApp e funcionamento de popup. Teste formulário real com sucesso, erro de rede, 429 e 500; testes/local não podem gravar em produção.

4. B04/A06: reenviar o mesmo e-mail com uma mensagem diferente retorna ok/duplicado mas descarta a nova mensagem. Preserve cada nova demanda em histórico; distinga retry da mesma submissão de nova interação. Normalize contato e teste concorrência, sem mesclar pessoas automaticamente por telefone compartilhado.

5. B05/A07: converter lead, mudar status para novo e converter de novo cria outra empresa. Não há vínculo persistente Lead→Empresa/Oportunidade; a empresa nova perde telefone/e-mail; a UI não chama o endpoint, só edita status. Implemente conversão operacional em modal/wizard, relações persistentes, preservação dos dados pertinentes, invariantes transacionais e proteção contra repetição/concorrência/reversão de status. IDs inexistentes devem produzir 4xx: empresaId inexistente hoje retorna 500. Adicione migrations compatíveis e testes de rollback. Não use apenas status convertido como prova de conversão.

6. B06/A11: com PB-999 e PB-1000 no banco, criação automática retorna 409 em todos os retries porque codigo desc é ordenação textual. Implemente geração numérica segura sob concorrência e códigos manuais, preferencialmente com sequência persistente. Código explícito duplicado deve retornar conflito sem ser substituído silenciosamente. Cubra fronteira 999/1000, exclusões e códigos não numéricos.

7. B07/A09/A10: despesa com valor 1.005 e data 2026-02-30 retorna 200, grava 1.005 e muda a data para 2026-03-02. Defina representação/validação monetária consistente e validação estrita de data civil. Teste valores/totais e registros legados à meia-noite UTC no fuso America/Sao_Paulo. Não faça migração indiscriminada das datas antigas. Estorno deve preservar histórico, não significar apagar definitivamente o lançamento.

8. B08/A18: o motor ainda afirma média regional/alto fluxo/poder de compra com faixas e bairros fixos, sem fontes. Rotule a análise como heurística, exponha insuficiência de dados e retire afirmações factuais não sustentadas. Minimize dados enviados a IA externa. Esse achado foi omitido no seu resumo anterior.

QUALIDADE E OPERAÇÃO

- Preserve as correções já válidas: revogação de usuário, bloqueios de exclusão com vínculos, gate, res.ok em uploads, link da apresentação, 404 de inativos, busca e healthcheck.
- Separe CI de PRs do host de produção; o bloqueio de forks não isola PRs internos. Reserve deploy a fluxo protegido. Documente qualquer dependência de configuração externa que não consiga resolver.
- Torne proteção de exclusão/histórico consistente no banco e na aplicação; não remova arquivos antes de confirmar a operação no banco. Teste falhas e vínculos concorrentes.
- Corrija a apresentação que ainda anuncia imóvel vendido/locado como disponível. Diferencie publicação de disponibilidade conforme a regra definida.
- Acrescente testes de negócio ponta a ponta. Os 15 E2E existentes são principalmente login/navegação, não comprovação da integração. Na segunda auditoria lint/build passaram localmente, mas API/E2E pararam no prisma migrate deploy com Schema engine error; diagnostique a reprodutibilidade do bootstrap sem remover o gate nem usar banco real.
- Comprove backup/restauração em ambiente isolado e apresente procedimento de rollback antes de migrations/publicação que afetem dados. Não crie leads reais de teste em produção.

ENTREGA

Entregue por achado: causa, alteração, teste que antes falha e depois passa, resultado, migrations e limitações. Apresente commits/PR e evidência do CI; siga o fluxo de publicação autorizado do projeto e diferencie código corrigido de produção efetivamente verificada. Não declare 100% integrado/completo sem demonstrar o percurso formulário→lead→conversão→empresa/oportunidade.

Depois de fechar as correções, apresente plano separado para o financeiro completo (receitas, comissões, repasses, vencimentos, baixas, resultado por negócio) e CRM operacional (responsável, atividades, próxima ação). Hoje só existe controle de despesas por imóvel. Essas funcionalidades exigem regras de negócio explícitas; não as apresente como já implementadas.
