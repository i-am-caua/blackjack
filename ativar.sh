#!/usr/bin/env bash
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Execute com sudo: sudo bash /var/www/html/ativar.sh"
  exit 1
fi

echo "==> Encerrando execucao manual anterior do server.py (se houver)..."
pkill -f "/var/www/html/server.py" || true

echo "==> Configurando Nginx como servidor web (porta 80) + proxy reverso (/api/ -> 8080)..."
cat > /etc/nginx/sites-available/default <<'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    root /var/www/html;
    index index.html;

    server_name _;

    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location / {
        try_files $uri $uri/ =404;
        # Nao guardar HTML/JS/CSS antigos no navegador: cada visita revalida.
        expires -1;
    }
}
EOF

ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default
nginx -t

echo "==> Criando servico systemd para o modo online (blackjack-api)..."
cat > /etc/systemd/system/blackjack-api.service <<'EOF'
[Unit]
Description=Pixel Blackjack e Roleta Russa Multiplayer API
After=network.target

[Service]
Type=simple
WorkingDirectory=/var/www/html
ExecStart=/usr/bin/python3 /var/www/html/server.py --port 8080
Restart=always
RestartSec=2

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now blackjack-api
systemctl restart blackjack-api
systemctl enable --now nginx
systemctl restart nginx

echo ""
echo "=============================================="
echo "  TUDO PRONTO E ATIVO (inclusive apos reboot!)"
echo "=============================================="
echo "Status Nginx        : $(systemctl is-active nginx)"
echo "Status Multiplayer  : $(systemctl is-active blackjack-api)"
echo "Acesse no navegador : http://$(hostname -I | awk '{print $1}')"
echo "=============================================="
