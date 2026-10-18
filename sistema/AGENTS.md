# Prospecção Brasil — Sistema Interno

## Stack
- `api/` — Node 22 + Express + Prisma (SQLite) + JWT + multer + qrcode
- `frontend/` — React 18 + Vite 5 + react-router-dom 7 (SPA em `api/public/`)

## Comandos
- Dev API: `cd api && npm run dev` (porta 8090)
- Dev front: `cd frontend && npm run dev` (porta 5271, proxy p/ 8090)
- Build: `cd frontend && npm run build` → copiar `dist/*` para `api/public/`
- Lint: `cd frontend && npm run lint` (rodar antes de build/deploy — pega imports quebrados que o Vite não detecta)
- Testes API: `cd api && npm test` (node:test + SQLite temporário, cobre auth e CRUD dos módulos)
- E2E: `cd frontend && npm run test:e2e` (Playwright; sobe a API em :8190 com banco `prisma/e2e.db` e percorre todos os módulos; precisa de `api/public/` buildado)
- DB: `npx prisma migrate dev` | seed: `npx prisma db seed`
- Deploy: na raiz do monorepo `SSHPASS='...' ./scripts/deploy-prod.sh` (VPS `/opt/prospeccao-sistema`, systemd `prospeccao-sistema`)


## Decisões
- SQLite em vez de Postgres (escala pequena, deploy simples; schema é portável p/ Postgres)
- Express serve API + SPA + uploads + página de apresentação (sem nginx proxy para arquivos)
- `sistema.prospeccaobrasil.com.br` — HTTPS via certbot; `pb-certbot-loop.timer` emite quando DNS propagar
- IA de mercado: motor interno determinístico; `OPENAI_API_KEY` no `.env` habilita LLM
- Apresentação `/apresentacao/:id` é pública (link para clientes); o resto exige JWT

## Convenções
- Campos em pt-BR camelCase no Prisma, `@map` snake_case no banco
- Rotas Express montadas como fábrica `(prisma) => Router`
- Acesso teste: admin@prospeccaobrasil.com.br / prospeccao123 (trocar em prod)

## Segurança de uploads e deploy

- `/uploads/:arquivo` passa por entrega controlada (não é `express.static`): fotos e
  documentos de tipo público (`planta`, `inteligencia`, `rig`, `avcb`, `convencao`,
  `iptu_doc`) são abertos; demais tipos exigem JWT válido de usuário ativo
  (`Authorization: Bearer` ou `?token=`). Privados usam `Cache-Control: no-store`.
- Códigos `PB-###` vêm da tabela `sequencias` (incremento atômico); código manual
  `PB-N` acima da sequência a reposiciona.
- Despesas são lançamentos auditáveis: não se exclui, usa-se `POST .../estornar`
  (admin). Valor ≤ 2 casas decimais e data civil `AAAA-MM-DD` estrita.
- Deploy (`deploy.yml` e `scripts/deploy-prod.sh`) faz snapshot de
  `prisma/prospeccao.db` em `/opt/prospeccao-sistema/backups/` antes de
  `prisma migrate deploy` (retenção 15). Rollback: `systemctl stop
  prospeccao-sistema`, restaurar o `.db` desejado com `cp`, `systemctl start`.
- CI roda em runner hospedado (ubuntu-latest); o runner self-hosted
  `prospeccao-prod` é reservado ao deploy.
- Landing chama a API via `VITE_API_URL` (fallback: `localhost:8090` em dev,
  `sistema.prospeccaobrasil.com.br` em prod).

## Sessão, permissões e validação

- Token de sessão (12h) só no header `Authorization`. Links que abrem em nova aba
  (uploads privados, comprovantes, `/inteligencia/:id`) usam `?token=` com o token de
  arquivo de 10 min (`GET /api/auth/token-arquivo`, hook `useArquivoToken`).
- Trocar ou redefinir senha grava `senhaAlteradaEm` e invalida tokens anteriores.
- Exclusões de cadastros e operações exigem `admin`; o sistema nunca fica sem admin ativo.
- `/api/public/imoveis/:id` devolve só `CAMPOS_PUBLICOS` (campo novo não vaza por padrão).
- Tipos de imóvel: `locacao`, `venda` (rótulo "Venda direta") e `passagem_ponto`.
- Fluxo comercial sem Demandas: Cliente (premissas = faixa de área + bairros de interesse) → Imóvel → Ação da
  operação (`Oportunidade`, imóvel × cliente, etapas). O detalhe do imóvel lista "Clientes compatíveis"
  (`frontend/src/lib/bairros.js`, `premissasDoCliente`) e "Apresentar" cria a ação. Bairros ficam em
  `Empresa.regioesInteresse` como texto "Méier; Tijuca" (aceita vírgula/quebra de linha dos cadastros antigos).
  O módulo Demandas saiu da interface (`/demandas/*` volta ao início); API e tabelas de demandas ficam sem tela
  para preservar os dados.
- Dimensões do imóvel: `imovel_areas` guarda a composição (térreo, 2º piso, jirau...);
  `areaTotal` é a ABL (sugerida pela soma, editável). As colunas `pisoAreaVenda`, `jirau`
  e `mezanino` são derivadas das linhas pela API e não aparecem mais no formulário.
- `googleMapsUrl` é gerado pela API a partir do endereço; link manual antigo é preservado.
- Fotos: componente `PhotoUploader` (formulário e detalhe); galeria pública em
  `/apresentacao/:id/fotos`. `proprietario`/`telProprietario`/`googleDriveUrl`/`valorPonto`
  são legados: continuam no banco, fora do formulário.
- E2E local sem o Chromium do Playwright: `PB_CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"`.
- Inteligência de mercado (`/inteligencia/:id`): Censo 2022 por bairro e município vem de
  `api/src/data/censo2022.json` (gerado por `scripts/build-censo2022.py` a partir dos
  Agregados do IBGE; sem chamada externa). Entorno da rua vem do OpenStreetMap/Overpass
  (`services/entorno.js`), com cache em disco em `api/cache/entorno/` (30 dias; o serviço
  público oscila, então a última consulta vale como reserva). Estimativas anuais e
  geocodificação continuam online (IBGE 6579 e Nominatim).
- Relatório de inteligência (`templates/inteligencia.js`, gráficos SVG em `templates/graficos.js`): cada
  folha mede exatamente A4 paisagem (297 × 210 mm, `@page` sem margem; 209,6 mm no papel para o
  arredondamento não gerar página em branco). Folhas sem dados são omitidas (e registradas em
  "Limitações"), nunca ficam vazias; listas de texto são truncadas para caber. O teste e2e
  `inteligencia.spec.js` exige: páginas do PDF = folhas, A4 deitado, nenhum conteúdo passando da folha,
  em 5 cenários de dados faltando. Ao mudar o layout, rode-o e confira as imagens (`pdftoppm`).
- Domicílios por classe social (`services/classes.js`): o Censo 2022 não publica a distribuição por bairro;
  é uma ESTIMATIVA lognormal calibrada com a média e a mediana do rendimento do responsável, com os limites
  do Critério Brasil sobre o salário mínimo de 2022. Sempre rotulada como estimativa no documento.
  A pirâmide etária usa os homens por faixa (último bloco de cada registro de `censo2022.json`; o script
  `scripts/build-censo2022.py` gera o arquivo). O município vem do código local do Censo (sem rede).
- Parceiros: tipos corretor, imobiliária, advogado, indicador, outro; `tipoPessoa` pf/pj (imobiliária é sempre
  pj), `documento` (CPF/CNPJ com dígitos verificadores), CRECI (físico se pf, jurídico se pj) com UF para
  corretor/imobiliária e OAB com UF para advogado. A apresentação mostra no rodapé da 2ª folha só tipo, nome
  e registro profissional (`lib/parceiros.js`); contato do parceiro nunca vai para o documento público.
- Máscaras numéricas (`components/NumberFields.jsx`, `lib/numeros.js`): `DinheiroInput` (R$ 1.234,56),
  `DecimalInput` (áreas e medidas) e `InteiroInput`; o valor do estado é sempre canônico ("1234.5") e a API
  não muda. Nunca use `type="number"` em formulários. Formatos nos formulários: `fmt: 'dinheiro'|'decimal'|'inteiro'`
  (wizards) ou o tipo na lista de campos do `BusinessFields`.
- Menu lateral segue o PDF "Espaço Work" do cliente (`NAV` em `components/Layout.jsx`):
  `sub` = linha de apoio, `children` = subitens; item sem `to` é só um grupo (rótulo sem página, caso de
  "Institucional", que contém apenas o link externo "Site institucional"). Rotas mantidas: Clientes = `/empresas`,
  Consultores = `/parceiros`, Ações das operações = `/oportunidades`. Proprietários e Documentação não
  estavam no PDF e foram mantidos em Cadastros. Os módulos Diretrizes, Demandas, Institucional e Propostas Comerciais
  foram removidos da interface; `/diretrizes`, `/institucional` e `/propostas` redirecionam para o início.
  A API de propostas (`/api/propostas`, `/proposta/:id`, `templates/proposta.js`) e a tabela
  `propostas_servico` continuam no sistema, sem tela, para não perder dados.
- Conhecimento: `/inteligencia` (um relatório por imóvel), `/benchmark` (rental rate),
  `/modelos-contratos` (links; só admin mantém).
- Apresentação do imóvel (`templates/apresentacao.js`): 1ª folha com faixa verde no cabeçalho (QR
  code de localização à direita), mapa ao lado da foto e "Indicadores de Inteligência Territorial e
  Comercial" (4 cartões) no rodapé. 2ª folha ("complementos"): descrição, Infraestrutura Urbana e
  Equipamentos de Apoio no Entorno, "Flash de Mercado" (resumo da última análise de inteligência, fundo verde; só aparece se já houver
  análise; sem fotos na 2ª folha — elas ficam no visualizador e na galeria pública), documentos técnicos em grade de 3 colunas, "Agende uma visita" e rodapé verde.
  O resumo impresso (1 folha) mantém uma faixa de visita na 1ª folha, pois não tem 2ª folha. O teste
  e2e `expansao.spec.js` exige 1 página (resumo) e 2 (completa) no PDF. O entorno tem 4 s para
  responder e depois vem do cache. Faixas verdes não "sangram" até a borda no papel (o Chrome não
  pinta a margem de página): ficam dentro dela.
- Localização e mapa (`services/mapas.js`): coordenadas cadastradas no imóvel (campo "Coordenadas",
  coladas do Google Maps) vencem sempre. Com `GOOGLE_MAPS_API_KEY` no `.env` da VPS (APIs Geocoding e
  Maps Static, chave restrita ao IP do servidor) o endereço é geocodificado pelo Google e o mapa da
  apresentação é a imagem do Google, servida do cache em disco por `/apresentacao/:id/mapa.png` (a
  chave nunca vai para a página). Sem chave: Nominatim + tiles do OpenStreetMap, que muitas vezes só
  acha o meio da rua; nesse caso o documento diz "Localização aproximada". Cache em `api/cache/mapas`
  (90 dias; `MAPAS_CACHE_DIR` muda o local). A busca no OpenStreetMap tenta o endereço como digitado,
  depois com abreviações expandidas ("Av. Min." → "Avenida Ministro") e por fim só a rua; sem resultado,
  não repete por 1 dia. Ao salvar um imóvel, `services/aquecer.js` pré-carrega em segundo plano
  coordenadas, mapa e entorno, para a 1ª abertura da apresentação já sair completa. O relatório de inteligência usa a mesma geocodificação,
  mas seu desenho do mapa (com os raios) segue em tiles do OpenStreetMap.
- Documentos do imóvel: tipos `planta`, `dwg`, `inteligencia`, `pre_analise`, `rgi`, `avcb`,
  `convencao`, `regimento`, `iptu_doc`, `doc_locatario`, `outro`. Públicos (`lib/publicDocs.js`):
  planta, inteligência, RGI, AVCB, convenção, regimento, IPTU. DWG e documentação do locatário
  são internos. DWG só sobe como documento (não como foto).
- Proposta comercial (SEM TELA desde que o módulo saiu do menu; API e documento seguem disponíveis): `/api/propostas`
  guarda os campos variáveis do modelo oficial e
  `/proposta/:id` gera o documento (`templates/proposta.js`), réplica página a página do PDF
  modelo: fontes Gelasio e Carlito em `frontend/public/fonts`, capa e logo em
  `frontend/public/proposta`. Campo vazio sai destacado entre colchetes. Ao mudar o texto do
  modelo, comparar lado a lado com o PDF (render via Playwright + `pdftoppm`).
- CORS restrito aos domínios de produção + localhost (`CORS_ORIGINS` sobrescreve).

## Dependências externas pendentes

- Conta GitHub com billing bloqueado impede runners `ubuntu-latest` no CI
  (jobs falham em segundos, sem executar). Até regularizar, o gate de testes
  roda no job `deploy` (self-hosted) antes de publicar — a esteira segue
  protegida, mas CI em PRs depende de destravar o billing.
- Backup diário na VPS: cron 04:17 UTC roda `/opt/prospeccao-sistema/backup.sh`
  (checkpoint WAL + cópia do banco + tarball de uploads, retenção 30 dias,
  log em /var/log/pb-backup.log). SSH por chave ed25519 configurada
  (~/.ssh/id_ed25519 no Mac); senha segue aceita como fallback.

- Operador do ponto: reaproveita `Proprietario` com `papel` (proprietario|operador) + `marca`; o imóvel tem
  `proprietarioId` e `operadorId` (relações nomeadas). Imóvel de tipo `passagem_ponto` usa operador no lugar do
  proprietário (a API valida o papel do cadastro; trocar o papel de quem já tem imóveis dá 409). No wizard,
  `VinculoPessoa` seleciona ou cria o cadastro ali mesmo. Menu: "Proprietários e operadores".
- Apresentação impressa: `@page { size:A4; margin:0 }` e cada `.sheet` com 210 × 296,8 mm (overflow oculto), faixas verdes
  sangrando até a borda. Padrão = as duas folhas; `?formato=resumo` mostra/imprime só a primeira. O e2e confere
  MediaBox A4, altura de cada folha e conteúdo sem corte. Cards: "OPEX · Custo total de ocupação" e "ABL · Área bruta locável".
- Mapa do formulário de imóvel (`components/MapaPonto.jsx`, Leaflet + tiles OSM): "Localizar endereço no mapa" chama
  `GET /api/imoveis/localizar` e o marcador arrastável preenche as coordenadas (que vencem qualquer geocodificação).
  O Nominatim tenta primeiro a busca estruturada (número + logradouro). Sem `GOOGLE_MAPS_API_KEY`, o número raramente é achado.
- Inteligência no raio de 500 m: `services/setores.js` soma os setores censitários do Censo 2022 (RJ,
  `data/censo2022-setores-rj.json`, gerado por `scripts/build-censo2022-setores.py`) com a fração de cada setor dentro
  do raio; classes sociais somadas setor a setor (`somarClasses`). Sem coordenadas/fora do RJ, o relatório usa o bairro.
  O entorno (OSM) mostra só 500 m.
- Ações das operações: proposta com situação (sem proposta → em elaboração → enviada → em análise → contraproposta →
  aceita/recusada), valor, data de envio, retorno previsto e observação. Enviada/em análise movem a etapa para
  Proposta; contraproposta → Negociação; recusada → Perdido.
- PDF da apresentação no servidor: `GET /apresentacao/:id/pdf[?formato=resumo]` (`services/pdf.js`, playwright-core +
  Chromium, uma geração por vez). O botão da página aponta para ele: imprimir pelo navegador quebra folhas no
  Safari/Firefox (ignoram `@page size`). O deploy instala o Chromium em `/opt/prospeccao-sistema/.browsers`.
