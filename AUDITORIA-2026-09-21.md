# Auditoria técnica e funcional — Prospecção Brasil

Data: 21/09/2026. Código examinado: commit `d23c759`, monorepo `/Users/relterborges/prospeccaobrasil` (`sistema/` + `landing/`).

## Parecer executivo

O produto tem uma base de CRM operacional, com cadastros, oportunidades, apresentação imobiliária, autenticação, tabelas e parte dos testes automatizados. **Não está completo, não está 100% integrado ao site e há falhas de segurança e integridade que precisam preceder a expansão funcional.**

Leads é um cadastro manual com etiquetas de status. Financeiro é um demonstrativo de despesas por imóvel, sem receitas, contas a pagar/receber ou cálculo de resultado. Uma interface visualmente consistente não comprova integração entre processos.

## Método, evidências e limites

- Inspeção das rotas Express, middleware, schema e migrações Prisma, páginas React, componentes, formulário institucional, testes e workflows.
- `npm run lint` e `npm run build` do admin: aprovados. Build da landing: aprovado. `prisma validate`: aprovado.
- `npm test` da API: falhou antes dos casos, ao preparar o SQLite temporário, com `Schema engine error` em `prisma migrate deploy`. A causa do erro de ambiente não foi determinada; isso não prova falha das migrações em produção.
- Para investigar comportamentos apesar desse bloqueio, as duas migrações SQL foram aplicadas com `/usr/bin/sqlite3` a um banco exclusivo em `/tmp/pb-audit-UNVaWM/audit.db`. O app real foi iniciado em porta efêmera com segredo e usuários de teste. Os resultados abaixo são de chamadas HTTP reais a esse app, não de simulações das rotas. Nenhuma credencial ou registro real foi utilizado.
- Testes adicionais do mecanismo TanStack executados em memória, para busca e ordenação.
- Produção: apenas leituras de HTML, bundles públicos e healthcheck. O JavaScript público do admin (`index-_KXDV12w.js`) e da landing (`index-B4EJrSld.js`) coincidiu byte a byte com os artefatos locais conferidos. Isso confirma correspondência do frontend; **não certifica a versão do backend implantado**.
- Não foram acessados o banco de produção, SSH/VPS, configurações privadas do GitHub, logs operacionais ou backups. Não houve login nem testes destrutivos em produção. Não houve execução E2E no navegador nesta auditoria; os testes E2E existentes foram inspecionados.
- O screenshot fornecido foi utilizado para a leitura visual da tela de leads; não substitui validação responsiva e de acessibilidade no navegador.
- Não foram alterados código funcional, configurações ou dados de produção. Apenas este relatório foi adicionado; builds locais geraram artefatos ignorados pelo Git.

## Situação dos módulos

| Módulo | Implementado | Limite relevante |
|---|---|---|
| Imóveis | Cadastro, edição, dimensões, valores, proprietários/parceiros, fotos, documentos e despesas | Código automático pode colidir; uploads podem reportar sucesso falso; exclusão destrói históricos relacionados |
| Empresas | Cadastro e vínculo com oportunidades | Validação de dados e regras de exclusão insuficientes; sem conversão vinculada a leads |
| Proprietários | Cadastro e vínculo com imóveis | Campos livres e dados duplicados em `Imovel.proprietario/telProprietario` e na relação; exige política de fonte principal |
| Parceiros | Cadastro e vínculo com imóveis | Não há gestão de comissão, repasse ou prestação de contas |
| Leads | Cadastro manual, edição, origem/status, filtros, exportação | Sem captação automática, responsável, atividades, próxima ação ou conversão relacional |
| Oportunidades | Imóvel + empresa, etapa e observação | Fechamento não gera contrato/receita/comissão nem atualiza disponibilidade; sem histórico de transições |
| Financeiro | Despesas e totais por imóvel | Não é módulo financeiro completo; datas/valores/ordenação apresentam defeitos |
| Dashboard | Contagens e imóveis recentes | Não resume leads pendentes, prazos, conversão ou resultados financeiros |
| Usuários/perfil | Login, senha, administrador/comercial | Desativação não revoga token, senha fraca aceita na troca e permissões pouco granulares |
| Apresentação pública | HTML de apresentação e links a documentos | Exposição de documentos internos e de imóveis inativos, sem controle de publicação/revogação |
| Inteligência | Heurística e enriquecimento opcional por LLM | Afirmações de mercado sem fontes/recorte temporal; não equivale a estudo de mercado validado |

## Achados prioritários

P1 = alta prioridade, corrigir antes de ampliar uso/dados sensíveis. P2 = defeito funcional ou fragilidade relevante. P3 = melhoria. Severidade não significa exploração confirmada em produção.

### A01 — P1: documentos internos aparecem na apresentação pública

**Evidência:** `sistema/api/src/routes/apresentacao.js:30` consulta `documentos: true`; linha 45 utiliza todos os documentos; linha 233 gera os links. `/apresentacao/:id` não exige autenticação. `sistema/api/src/app.js:24` serve `/uploads` publicamente.

**Reprodução:** cadastrar documento sintético `tipo=doc_locatario`; GET sem token da apresentação retornou HTTP 200 e o link privado no HTML. O filtro de `DOC_PUBLICOS` presente em `routes/public.js` não protege essa outra rota.

**Impacto:** links e arquivos de documentação de locatários ou outros materiais internos podem ficar disponíveis fora da equipe. Não foi necessário enumerar imóveis reais para demonstrar a falha.

**Correção:** classificar visibilidade por documento, aplicar a mesma lista permitida em todas as superfícies públicas, separar armazenamento privado e exigir autorização ou URL temporária para download privado. Teste de aceite: documento interno jamais aparece no HTML/JSON público e acesso direto sem autorização é negado.

### A02 — P1: usuários desativados mantêm acesso

**Evidência:** `middleware/auth.js:8` apenas verifica JWT. O token leva `role` e dura 12 horas (`routes/auth.js:15`); não consulta usuário ativo nem versão de sessão.

**Reprodução:** login de usuário comercial, desativação pelo administrador e GET `/api/leads` com token antigo: HTTP 200.

**Impacto:** desligamento de usuário não bloqueia sessões já abertas; alterações de perfil e exclusão também não são refletidas pelo middleware até expiração.

**Correção:** verificar existência/atividade/permissões atuais ou implementar versão/revogação de sessão. Testar desativação, exclusão, rebaixamento de perfil e troca de senha.

### A03 — P1: apagar imóvel elimina despesas e histórico comercial

**Evidência:** `schema.prisma:156`, `209` e `210` usam cascata. `routes/imoveis.js:118` realiza exclusão definitiva. Exclusão de empresa também elimina oportunidades relacionadas.

**Reprodução:** imóvel com uma despesa; DELETE do imóvel reduziu o número de despesas de 1 para 0.

**Impacto:** o total financeiro retroativo muda com a exclusão de um cadastro; não existe trilha de estorno ou histórico de auditoria.

**Correção:** arquivamento lógico e restrição de exclusão de registros com movimento; lançamentos financeiros devem ter estorno identificável. Critério: arquivar um imóvel não muda resultados históricos.

### A04 — P1: deploy não depende da aprovação dos testes

**Evidência:** `.github/workflows/deploy.yml:3` dispara em push para `main` independentemente do workflow `CI`. Não executa testes/lint nem espera o resultado do CI. Publica a landing antes da migração/restart do sistema.

**Impacto:** build que compila, mas falha nos testes, pode ser publicado; falha intermediária pode deixar site e API em estados diferentes.

**Correção:** gate obrigatório de lint/API/E2E no deploy, artefatos imutáveis, backup antes da migração, verificação da versão e rollback documentado. Branch protection não foi inspecionada e não substitui a dependência explícita entre workflows.

### A05 — P1, risco de infraestrutura a validar: CI de pull requests no runner de produção

**Evidência:** `.github/workflows/ci.yml:6` aceita pull requests e todos os jobs usam `prospeccao-prod`; deploy usa o mesmo label e executa comandos com `sudo`. README descreve repositório público e runner na VPS.

**Impacto potencial:** código de contribuição executado no host que atende produção. A explorabilidade depende das aprovações de workflows, isolamento e permissões do runner, não verificados.

**Correção:** mover CI de PR para runner isolado/efêmero e limitar o runner de produção a artefatos confiáveis e aprovações de deploy.

### A06 — P2: não existe integração automática landing → leads

**Evidência:** `landing/src/main.jsx:123` monta mensagem e chama `window.open(wa.me...)` na linha 135. Não há chamada de gravação no CRM. `routes/leads.js:11` exige token em todas as rotas. Não foi encontrado webhook de entrada.

**Consequência:** preencher o formulário não cria lead; abrir WhatsApp tampouco prova envio da mensagem. A origem “Site” do screenshot é um campo editável e também o padrão do cadastro manual; não comprova captura automática.

**Correção:** endpoint público específico e limitado, validação/antispam, confirmação de persistência, deduplicação e metadados de atribuição. Registrar lead antes de oferecer o WhatsApp; não embutir credencial do admin na landing. Conversas iniciadas diretamente no WhatsApp exigem integração própria para captura automática.

### A07 — P2: “convertido” é apenas uma etiqueta

**Evidência:** `schema.prisma:47` não relaciona Lead a Empresa, Imóvel, Oportunidade ou Usuario. `routes/leads.js:47` somente atualiza campos.

**Consequência:** marcar conversão aumenta o contador, mas não cria/vincula empresa nem oportunidade e não permite rastrear receita por origem.

**Correção:** conversão transacional e idempotente, com vínculo explícito e opção de reutilizar empresa existente; responsável, atividades, próxima ação, motivo de perda e datas por etapa.

### A08 — P2: financeiro é parcial e não calcula resultado líquido

**Evidência:** `routes/financeiro.js:9` somente lista/soma despesas; `schema.prisma:149` tem descrição, valor, data e imóvel. Não existem entidades de receita, recebimento, comissão, repasse, vencimento, pagamento ou conciliação.

**Consequência:** o texto “chegar no líquido” não corresponde a um cálculo implementado. Custo de ocupação do imóvel também não é receita da assessoria.

**Correção:** definir receitas e despesas da operação, previsto/realizado, vencimento/pagamento, categorias, comprovantes, comissão/repasse, filtros por período e estornos. A abrangência bancária/fiscal deve ser definida separadamente, não presumida.

### A09 — P2: despesa negativa e data deslocada

**Evidência:** `routes/imoveis.js:186` valida ausência/NaN, não positividade; linha 192 converte data sem hora para UTC. `pages/Financeiro.jsx` e `ImovelDetalhe.jsx:150` exibem no fuso local.

**Reprodução:** valor `-100` retornou HTTP 200; data `2026-09-21` foi exibida como `20/09/2026` em America/Sao_Paulo.

**Correção:** representar data civil sem deslocamento de fuso, aceitar valores finitos com precisão monetária definida, distinguir estorno de despesa e validar no servidor. Testar datas de fechamento de mês e lançamentos fracionários.

### A10 — P2: ordenação monetária e precisão dos totais

**Evidência:** Prisma devolve Decimal como string; Financeiro usa `accessorKey: 'valor'` sem conversão. TanStack, com as mesmas strings, ordenou ascendente `['100', '20']`. A API soma com `Number`, perdendo o benefício da aritmética decimal.

**Correção:** accessor numérico para ordenação; somas em Decimal ou centavos inteiros, arredondamento definido e testes de centavos. Ordenação deve retornar 20 antes de 100.

### A11 — P2: código automático de imóvel colide

**Evidência:** `routes/imoveis.js:108` gera código a partir de `count()+1`.

**Reprodução:** criar PB-001 e PB-002, excluir PB-001 e criar novo imóvel gerou HTTP 500 por código PB-002 duplicado. Concorrência também pode disputar o mesmo código.

**Correção:** sequência transacional independente da quantidade de registros e resposta de conflito compreensível; testar exclusões e criações simultâneas.

### A12 — P2: validação e senha inconsistentes

**Reprodução:** Lead com nome em branco, email inválido e status “inventado” foi aceito (200). Troca de senha por um único caractere também foi aceita (200).

**Evidência:** `routes/leads.js:41` só testa truthiness do nome; atualizações não validam enums. `routes/auth.js:24` não aplica a exigência de 8 caracteres presente na criação de usuário. PUT de usuários também não a aplica.

**Correção:** schemas de entrada compartilhados, normalização, enumerações, limites e erros 400/404/409 úteis; política de senha igual em criação/troca/reset. Validar limites de área, UF, tipos de vínculo e datas em todos os módulos.

### A13 — P2: uploads exibem sucesso mesmo após rejeição

**Evidência:** `ImovelDetalhe.jsx:43` e `51` usam fetch sem testar `response.ok`; logo depois limpam campos e mostram “Fotos enviadas”/“Documento adicionado”.

**Consequência:** rejeição por tipo/tamanho/autenticação pode parecer sucesso. A análise e despesas também têm caminhos de rejeição sem tratamento local; a análise pode ficar presa em “Gerando”.

**Correção:** cliente HTTP único, validação de status, try/catch/finally, bloqueio de clique repetido, preservação do formulário em falha e mensagens acessíveis.

### A14 — P2: copiar link público usa a localização do router

**Evidência:** `ImovelDetalhe.jsx:11` define `location = useLocation()`; linha 84 usa `location.origin`, atributo inexistente nesse objeto.

**Consequência pelo código:** o conteúdo copiado começa com `undefined/apresentacao/...`, apesar da mensagem de sucesso.

**Correção:** usar origem do navegador ou URL pública configurada e aguardar sucesso da Clipboard API antes da notificação.

### A15 — P2: apresentação não respeita disponibilidade/publicação

**Reprodução:** imóvel marcado inativo continuou retornando 200 no endpoint público, incluindo `googleDriveUrl`. A apresentação escolhe “disponível para venda/locação” apenas a partir de `tipo`.

**Correção:** flag de publicação independente do status comercial, conteúdo consistente com o status e identificador público revogável. Decidir quais links/atributos são próprios para clientes.

### A16 — P2: busca de leads não busca o interesse prometido

**Evidência:** `Leads.jsx:74` usa accessor somente de nome; interesse é renderizado visualmente, mas não é um accessor. DataTable filtra valores das colunas, não todo o objeto. Teste em memória encontrou zero resultados para “Expansão” presente só no interesse.

**Correção:** accessor de busca explícito incluindo interesse, telefone e email; exportação com campos separados para interesse e observações, não apenas colunas visíveis.

### A17 — P2: permissões financeiras/comerciais não são separadas

**Reprodução:** usuário comercial conseguiu GET `/api/financeiro` (200). As rotas dos módulos exigem autenticação, mas apenas usuários possuem verificação de role.

**Avaliação:** isso só é aceitável se acesso amplo for a regra de negócio. Hoje não existe mecanismo para restringir financeiro, exclusões ou exportação por função.

**Correção:** matriz de permissões aplicada no backend e espelhada na UI, com testes de negar acesso por rota e operação.

### A18 — P2: inteligência apresenta heurística como evidência de mercado

**Evidência:** `services/inteligencia.js` usa faixas fixas de R$/m² e nomes de bairros para afirmar competitividade, média regional, fluxo e poder de compra; não consulta fonte de mercado. Dados ausentes ainda produzem score e “sem pontos críticos”. O caminho LLM envia o objeto inteiro do imóvel.

**Correção:** rotular como triagem baseada em dados cadastrados, evidenciar insuficiência de dados e separar fato, inferência e recomendação. Exigir fontes/data/amostra para comparativos; enviar ao serviço externo somente atributos necessários. A chave externa não foi inspecionada; não foi feita chamada ao LLM.

## Qualidade, cobertura e operação

- Os testes API existentes cobrem happy paths de CRUD e autenticação básica, mas o financeiro só tem teste de resposta 200. Não cobrem totais, fuso, estorno, cascata, revogação, exposição documental ou captação pública.
- Os E2E atuais verificam login, abertura das páginas e navegação. Não exercitam cadastro completo pelos wizards, conversão, financeiro e integração landing/CRM. O helper ainda ignora erros contendo “Failed to load resource”, podendo ocultar falhas relevantes.
- `npm audit --omit=dev --json` apontou 3 entradas de severidade alta na cadeia `prisma → @prisma/config → deepmerge-ts`, referentes ao advisory GHSA-ggr8-5vv4-36mx. São três pacotes afetados na mesma cadeia, não três explorações comprovadas. Avaliar alcance e atualização compatível; não aplicar downgrade automático sugerido pelo audit sem validação.
- Listagens carregam todos os registros e paginam no cliente. Para crescimento: paginação/filtro/ordenação no servidor, índices de consulta e limites de exportação.
- Fotos: excluir a principal não promove outra; trocar principal não é transacional. Excluir imóvel remove relações, mas não remove arquivos físicos correspondentes, deixando órfãos no armazenamento público.
- Limiter de login usa `req.ip`, e o app não configura `trust proxy`; atrás do Nginx há risco de compartilhar limite entre clientes. Configuração efetiva do proxy não foi inspecionada.
- Não foi encontrada rotina versionada de backup/restauração/rollback, trilha de auditoria ou monitoramento funcional. Isso não prova ausência na VPS. Healthcheck atual retorna `ok` sem verificar acesso ao banco.
- HTML institucional publicado usa `prospeccaobrasil.com` em og:url, imagens e JSON-LD, enquanto o domínio acessado é `.com.br`. Unificar domínio canônico/metadados e conferir redirecionamentos.

## Melhorias de experiência

Na tela fornecida, a hierarquia geral, os filtros, contadores e paginação são claros. O maior ganho agora é funcional:

1. Lead: responsável, próxima ação e prazo, histórico de contatos, atalho WhatsApp/email, alerta de duplicidade e conversão explícita.
2. Indicadores: separar “novos” de “sem atendimento”; mostrar atrasados e conversão por período com denominador definido.
3. Financeiro: filtros de período/imóvel/categoria, valor realizado x previsto, lançamentos editáveis com histórico e vínculo ao negócio.
4. Ícone de seta abre edição, comportamento ambíguo: adotar detalhe próprio ou ícone de edição com tooltip. Telefones/emails são texto; podem virar ações claras.
5. Detalhe de imóvel ainda usa formulários inline e tabelas HTML comuns para despesas/documentos/oportunidades, sem o padrão de modal/TanStack usado nas listagens.
6. Testar mobile, navegação por teclado, foco e fechamento dos modais, contraste e estados de falha; não declarar conformidade só pelo screenshot.

## Sequência recomendada e critérios de aceite

**Etapa 1 — proteção e integridade:** documentos públicos/privados, revogação de sessão, exclusão com histórico, senha/validação e gates de deploy. Aceite: regressões específicas dos achados passam; permissões e publicação documentadas.

**Etapa 2 — operação confiável:** códigos de imóvel, datas/valores/ordenação, erros de upload, copiar link, busca de leads, tratamento de falhas e teste de recuperação de backup.

**Etapa 3 — integração real:** formulário institucional salva lead com origem comprovável, deduplicação, confirmação e fallback; responsável/atividade/próxima ação; conversão liga lead → empresa → oportunidade. Aceite: um contato sintético em ambiente de teste percorre o fluxo sem recadastro manual e sem duplicar no reenvio.

**Etapa 4 — financeiro conforme a operação:** receitas/comissões/despesas/repasses, previsto/realizado, vencimentos, conciliação conforme necessidade e resultado por negócio/período. Aceite: um fechamento de oportunidade chega ao financeiro com valores conciliáveis, estorno rastreável e permissões adequadas.

**Etapa 5 — acabamento e escala:** dashboard operacional, acessibilidade/responsividade, paginação de servidor, observabilidade e desempenho.

Para encerrar uma auditoria também de produção, ainda é necessário conferir versão do backend, regras de acesso do runner/GitHub, Nginx/TLS, backup e restauração, logs, volumes reais e fluxos no navegador. Esses itens permanecem não verificados, e não foram tratados como aprovados.
