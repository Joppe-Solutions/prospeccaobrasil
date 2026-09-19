# Prospecção Brasil

Monorepo do ecossistema Prospecção Brasil.

| Pasta | O que é | Produção |
|-------|---------|----------|
| `sistema/` | CRM interno (API Express + React admin) | https://sistema.prospeccaobrasil.com.br |
| `landing/` | Site institucional | https://prospeccaobrasil.com.br |

## Branches

- **`develop`** — integração contínua (build/check). Sem deploy.
- **`main`** — produção. Push dispara build + deploy na VPS.

## Desenvolvimento local

```bash
# API
cd sistema/api && npm install && npx prisma migrate dev && npm run dev   # :8090

# Admin
cd sistema/frontend && npm install && npm run dev                       # :5271

# Landing
cd landing && npm install && npm run dev
```

## Deploy manual

```bash
export SSHPASS='…'   # senha root da VPS (não versionar)
./scripts/deploy-prod.sh
```

## CI/CD (GitHub Actions)

Secrets necessários no repositório:

- `SSH_HOST` — IP da VPS
- `SSH_USER` — usuário SSH (ex.: `root`)
- `SSH_PASSWORD` — senha SSH

Workflows em `.github/workflows/`.
