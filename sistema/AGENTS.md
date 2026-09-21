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
