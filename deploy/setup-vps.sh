#!/bin/bash
# =============================================================================
# Setup VPS — Papo de Sysadmin Eventos
# Distro: Debian 12+ (funciona também em Ubuntu 22.04+)
# Executa como root na VPS
# =============================================================================

set -e

# ---------------------------------------------------------------------------
# CONFIGURAÇÃO — Edite antes de rodar
# ---------------------------------------------------------------------------
DOMINIO="eventos.papodesysadmin.com.br"   # Seu domínio (ou IP da VPS)
REPO_URL="https://github.com/seu-usuario/eventos.git"  # URL do repositório
EMAIL_CERTBOT="seu-email@exemplo.com"     # Email para Let's Encrypt
SITE_DIR="/var/www/eventos"
NGINX_CONF="/etc/nginx/sites-available/eventos"

# ---------------------------------------------------------------------------
# Cores para output
# ---------------------------------------------------------------------------
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}[1/6] Atualizando sistema...${NC}"
apt update && apt upgrade -y

echo -e "${GREEN}[2/6] Instalando dependências...${NC}"
apt install -y nginx git certbot python3-certbot-nginx curl

echo -e "${GREEN}[3/6] Clonando repositório...${NC}"
if [ -d "$SITE_DIR" ]; then
    echo -e "${YELLOW}Diretório já existe. Atualizando...${NC}"
    cd "$SITE_DIR" && git pull origin main
else
    git clone "$REPO_URL" "$SITE_DIR"
fi

# Ajustar permissões
chown -R www-data:www-data "$SITE_DIR"
chmod -R 755 "$SITE_DIR"

echo -e "${GREEN}[4/6] Configurando Nginx...${NC}"
cat > "$NGINX_CONF" << 'NGINX_EOF'
server {
    listen 80;
    listen [::]:80;
    server_name DOMINIO_PLACEHOLDER;

    root SITE_DIR_PLACEHOLDER;
    index index.html;

    # Segurança
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Cache para assets estáticos
    location ~* \.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    # JSON sem cache (para atualizações de eventos)
    location ~* \.json$ {
        expires -1;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }

    # Bloquear acesso ao diretório cli e .git
    location ~ ^/(cli|\.git|\.kiro|\.github) {
        deny all;
        return 404;
    }

    # Bloquear admin.html de acesso externo (opcional)
    # Descomente se quiser proteger o painel admin
    # location = /admin.html {
    #     allow 127.0.0.1;
    #     allow SEU_IP_AQUI;
    #     deny all;
    # }

    location / {
        try_files $uri $uri/ =404;
    }

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 256;
}
NGINX_EOF

# Substituir placeholders
sed -i "s|DOMINIO_PLACEHOLDER|$DOMINIO|g" "$NGINX_CONF"
sed -i "s|SITE_DIR_PLACEHOLDER|$SITE_DIR|g" "$NGINX_CONF"

# Ativar site e desativar default
ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/eventos
rm -f /etc/nginx/sites-enabled/default

# Testar e recarregar
nginx -t
systemctl reload nginx
systemctl enable nginx

echo -e "${GREEN}[5/6] Configurando HTTPS com Let's Encrypt...${NC}"
if [ "$DOMINIO" != "eventos.papodesysadmin.com.br" ] && [ "$EMAIL_CERTBOT" != "seu-email@exemplo.com" ]; then
    certbot --nginx -d "$DOMINIO" --non-interactive --agree-tos -m "$EMAIL_CERTBOT" --redirect
    echo -e "${GREEN}HTTPS configurado com sucesso!${NC}"
else
    echo -e "${YELLOW}Pule esta etapa: edite DOMINIO e EMAIL_CERTBOT no script e rode:${NC}"
    echo -e "${YELLOW}  certbot --nginx -d $DOMINIO --agree-tos -m $EMAIL_CERTBOT --redirect${NC}"
fi

echo -e "${GREEN}[6/6] Configurando renovação automática do certificado...${NC}"
systemctl enable certbot.timer
systemctl start certbot.timer

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Deploy concluído!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "  Site: http://$DOMINIO"
echo -e "  Arquivos: $SITE_DIR"
echo -e "  Nginx config: $NGINX_CONF"
echo ""
echo -e "${YELLOW}Para atualizar o site após mudanças:${NC}"
echo -e "  cd $SITE_DIR && git pull origin main"
echo ""
echo -e "${YELLOW}Ou use o script de atualização:${NC}"
echo -e "  /opt/eventos-update.sh"
