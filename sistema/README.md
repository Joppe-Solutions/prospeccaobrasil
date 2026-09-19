# Prospecção Brasil — Sistema Interno

Sistema de gestão de pontos comerciais: cadastro de imóveis, empresas, pipeline de apresentações, inteligência de mercado e geração de apresentação "Ponto Comercial Disponível" (A4/PDF).

## Stack

- **API**: Node.js + Express + Prisma (SQLite) + JWT — `api/`
- **Admin**: React 18 + Vite + React Router — `frontend/`
- **Apresentação**: página HTML server-side em `/apresentacao/:id` (pública, imprimível em A4, com QR para o Google Maps)

## Desenvolvimento

```bash
cd api && npm install && npx prisma migrate dev && npx prisma db seed && npm run dev   # :8090
cd frontend && npm install && npm run dev                                            # :5271 (proxy p/ API)
```

## Produção (VPS)

- Código em `/opt/prospeccao-sistema`, banco SQLite em `prisma/prospeccao.db`
- Serviço: `prospeccao-sistema.service` (porta 8090)
- Build do frontend copiado para `api/public/` (servido pelo próprio Express)
- Deploy: `./deploy.sh` na raiz

## Acesso

- `admin@prospeccaoab…` → ver `api/prisma/seed.js`. Troque a senha no primeiro acesso.
- URL: `https://sistema.prospeccaobrasil.com.br`

## Variáveis de ambiente (`api/.env`)

| Var | Descrição |
|---|---|
| `DATABASE_URL` | `file:...` SQLite |
| `JWT_SECRET` | segredo do token |
| `PORT` | porta (8090) |
| `OPENAI_API_KEY` | opcional — enriquece a análise de mercado com LLM; sem ela usa o motor interno |
