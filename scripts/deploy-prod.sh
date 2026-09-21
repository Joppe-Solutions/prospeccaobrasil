#!/usr/bin/env bash
# Deploy completo (sistema + landing) para a VPS de produção.
# Uso: SSHPASS='senha' ./scripts/deploy-prod.sh
#      SSHPASS='senha' ./scripts/deploy-prod.sh --landing-only
#      SSHPASS='senha' ./scripts/deploy-prod.sh --sistema-only
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="${SSH_HOST:-179.198.107.179}"
USER="${SSH_USER:-root}"
MODE="${1:-all}"

if [[ -z "${SSHPASS:-}" ]]; then
  echo "Defina SSHPASS (senha SSH). Ex.: SSHPASS='…' $0"
  exit 1
fi

SSH_BASE=(sshpass -e ssh -o StrictHostKeyChecking=accept-new -o PreferredAuthentications=password -o PubkeyAuthentication=no)
RSYNC_SSH="sshpass -e ssh -o StrictHostKeyChecking=accept-new -o PreferredAuthentications=password -o PubkeyAuthentication=no"

remote() {
  "${SSH_BASE[@]}" "${USER}@${HOST}" "$@"
}

deploy_landing() {
  echo "==> Build landing"
  cd "$ROOT/landing"
  npm ci
  npm run build

  echo "==> Sync landing → /var/www/prospeccaobrasil-landing"
  rsync -az --delete \
    -e "$RSYNC_SSH" \
    "$ROOT/landing/dist/" \
    "${USER}@${HOST}:/var/www/prospeccaobrasil-landing/"
  echo "Landing OK — https://prospeccaobrasil.com.br"
}

deploy_sistema() {
  echo "==> Testes e lint antes do deploy"
  cd "$ROOT/sistema/api"
  npm ci
  npx prisma generate
  npm test
  cd "$ROOT/sistema/frontend"
  npm ci
  npm run lint

  echo "==> Build frontend do sistema"
  npm run build

  echo "==> Copiar SPA para api/public"
  cd "$ROOT/sistema/api"
  rm -rf public
  cp -R ../frontend/dist public

  echo "==> Sync API → /opt/prospeccao-sistema"
  rsync -az \
    --exclude node_modules \
    --exclude .env \
    --exclude 'prisma/*.db*' \
    --exclude 'uploads/*' \
    --exclude 'dev.db*' \
    -e "$RSYNC_SSH" \
    "$ROOT/sistema/api/" \
    "${USER}@${HOST}:/opt/prospeccao-sistema/"

  echo "==> Instalar deps, migrar e reiniciar"
  # Snapshot do banco antes de qualquer migration (rollback = parar serviço, restaurar cp, restart)
  remote "mkdir -p /opt/prospeccao-sistema/backups && cp /opt/prospeccao-sistema/prisma/prospeccao.db /opt/prospeccao-sistema/backups/prospeccao-$(date +%Y%m%d%H%M%S).db && ls -t /opt/prospeccao-sistema/backups/*.db | tail -n +16 | xargs -r rm --"
  remote "cd /opt/prospeccao-sistema && npm install --omit=dev && npx prisma generate && npx prisma migrate deploy && systemctl restart prospeccao-sistema && sleep 2 && curl -sf http://127.0.0.1:8090/api/healthz"
  echo "Sistema OK — https://sistema.prospeccaobrasil.com.br"
}

case "$MODE" in
  --landing-only) deploy_landing ;;
  --sistema-only) deploy_sistema ;;
  all|"") deploy_landing; deploy_sistema ;;
  *) echo "Uso: $0 [--landing-only|--sistema-only]"; exit 1 ;;
esac

echo "Deploy concluído."
