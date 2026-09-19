# Prospecção Brasil — Sistema Interno

## Stack
- `api/` — Node 22 + Express + Prisma (SQLite) + JWT + multer + qrcode
- `frontend/` — React 18 + Vite 5 + react-router-dom 7 (SPA em `api/public/`)

## Comandos
- Dev API: `cd api && npm run dev` (porta 8090)
- Dev front: `cd frontend && npm run dev` (porta 5271, proxy p/ 8090)
- Build: `cd frontend && npm run build` → copiar `dist/*` para `api/public/`
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
