#!/bin/bash
# Deploy legado do sistema — preferir ./scripts/deploy-prod.sh na raiz do monorepo
set -e
cd "$(dirname "$0")/.."
SSHPASS="${SSHPASS:?defina SSHPASS}" ./scripts/deploy-prod.sh --sistema-only
