#!/bin/bash
# =============================================================================
# Atualizar site — Papo de Sysadmin Eventos
# Roda na VPS para puxar as últimas alterações do repositório
# =============================================================================

set -e

SITE_DIR="/var/www/eventos"

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}Atualizando Papo de Sysadmin Eventos...${NC}"

cd "$SITE_DIR"

# Guardar estado atual
BEFORE=$(git rev-parse HEAD)

# Puxar alterações
git fetch origin main
git reset --hard origin/main

# Verificar se houve mudança
AFTER=$(git rev-parse HEAD)

if [ "$BEFORE" = "$AFTER" ]; then
    echo -e "${GREEN}Nenhuma alteração encontrada. Site já está atualizado.${NC}"
else
    echo -e "${GREEN}Atualizado: $BEFORE → $AFTER${NC}"
    echo ""
    echo "Alterações:"
    git log --oneline "$BEFORE".."$AFTER"
fi

# Ajustar permissões
chown -R www-data:www-data "$SITE_DIR"

echo ""
echo -e "${GREEN}✅ Site atualizado com sucesso!${NC}"
