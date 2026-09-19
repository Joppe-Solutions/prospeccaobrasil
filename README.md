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

- **`develop`** → workflow `CI` (build landing + sistema)
- **`main`** → `CI` + `Deploy produção` (runner self-hosted na VPS)

Runner: `prospeccao-vps` em `/opt/actions-runner` (label `prospeccao-prod`).

> **Nota:** a org está no plano GitHub Free. Actions em repositório **privado** falha com `startup_failure`. O repo está **público** para a esteira funcionar; com plano Team pode voltar a privado.

Secrets (úteis se voltar deploy via SSH): `SSH_HOST`, `SSH_USER`, `SSH_PASSWORD`.
