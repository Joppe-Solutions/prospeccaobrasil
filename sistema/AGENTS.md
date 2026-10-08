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
- Coluna "Diretrizes" em Imóveis: regra em `api/src/lib/compatibilidade.js`.
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
- Menu lateral segue o PDF "Espaço Work" do cliente (`NAV` em `components/Layout.jsx`):
  `sub` = linha de apoio, `children` = subitens. Rotas mantidas: Clientes = `/empresas`,
  Consultores = `/parceiros`, Ações das operações = `/oportunidades`. Proprietários e
  Documentação não estavam no PDF e foram mantidos em Cadastros.
- Conhecimento: `/inteligencia` (um relatório por imóvel), `/benchmark` (rental rate),
  `/modelos-contratos` (links; só admin mantém), `/diretrizes` (premissas das demandas ativas).
- Apresentação do imóvel: "Contexto do ponto" (Censo 2022 do bairro + entorno) na folha de
  complementos; o entorno tem 4 s para responder e depois vem do cache.
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
