# Deploy na VPS — Papo de Sysadmin Eventos

## Pré-requisitos

- VPS com Debian 12+ ou Ubuntu 22.04+
- Acesso root (ou sudo)
- Domínio apontando para o IP da VPS (registro A no DNS)

## Setup Inicial

1. Edite o arquivo `setup-vps.sh` e configure:
   - `DOMINIO` — seu domínio (ex: `eventos.papodesysadmin.com.br`)
   - `REPO_URL` — URL do repositório Git
   - `EMAIL_CERTBOT` — email para o certificado SSL

2. Copie o script para a VPS e execute:

```bash
scp deploy/setup-vps.sh root@sua-vps:/root/
ssh root@sua-vps
chmod +x /root/setup-vps.sh
./setup-vps.sh
```

## Atualizar o Site

Após fazer alterações (adicionar/remover eventos), faça push para o repositório e rode na VPS:

```bash
/var/www/eventos/deploy/update.sh
```

Ou configure um cron para atualizar automaticamente a cada hora:

```bash
crontab -e
# Adicione:
0 * * * * /var/www/eventos/deploy/update.sh >> /var/log/eventos-update.log 2>&1
```

## Estrutura na VPS

```
/var/www/eventos/          → Arquivos do site (servidos pelo Nginx)
/etc/nginx/sites-available/eventos  → Configuração do Nginx
/etc/letsencrypt/          → Certificados SSL
```

## Segurança

O script de setup já configura:
- Headers de segurança (X-Frame-Options, X-Content-Type-Options, etc.)
- Bloqueio de acesso aos diretórios `cli/`, `.git/`, `.kiro/`, `.github/`
- Gzip para performance
- Cache de 7 dias para assets estáticos
- JSON sem cache (para atualizações imediatas)
- HTTPS com renovação automática

## Webhook (Opcional)

Para deploy automático ao fazer push, configure um webhook no GitHub que chama o script de update na VPS. Exemplo com um micro-servidor:

```bash
apt install -y webhook
```

Crie `/etc/webhook.conf`:
```json
[
  {
    "id": "deploy-eventos",
    "execute-command": "/var/www/eventos/deploy/update.sh",
    "command-working-directory": "/var/www/eventos"
  }
]
```

Depois configure o webhook no GitHub apontando para `http://sua-vps:9000/hooks/deploy-eventos`.
