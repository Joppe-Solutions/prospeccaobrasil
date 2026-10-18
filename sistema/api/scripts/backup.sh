#!/usr/bin/env bash
# Backup diário do banco (instalado pelo deploy em /etc/cron.d/prospeccao-backup, 03:15).
# Guarda 30 cópias em /opt/prospeccao-sistema/backups. Se BACKUP_REMOTE estiver no .env (destino do rclone,
# ex.: "gdrive:prospeccao-backups"), envia também a cópia do dia para fora da VPS.
set -euo pipefail
export PATH=/usr/local/bin:/usr/bin:/bin:$PATH
cd /opt/prospeccao-sistema
mkdir -p backups
destino="backups/diario-$(date +%Y%m%d%H%M%S).db"
# cópia consistente mesmo com o sistema no ar (API de backup do SQLite)
DESTINO="$PWD/$destino" DATABASE_URL="file:$PWD/prisma/prospeccao.db" node -e "
const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient();
p.\$executeRawUnsafe('VACUUM INTO \'' + process.env.DESTINO.replace(/'/g, \"''\") + '\'').then(() => p.\$disconnect()).catch((e) => { console.error(e.message); process.exit(1); });"
gzip -f "$destino"
ls -t backups/diario-*.db.gz | tail -n +31 | xargs -r rm --
remoto=$(grep -E '^BACKUP_REMOTE=' .env 2>/dev/null | cut -d= -f2- | tr -d '"' || true)
if [ -n "$remoto" ] && command -v rclone >/dev/null; then
  rclone copy "$destino.gz" "$remoto" && echo "enviado para $remoto"
fi
echo "backup ok: $destino.gz"
