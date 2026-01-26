#!/bin/bash
set -ex
exec > >(tee /var/log/user-data.log) 2>&1

# Install Docker
dnf update -y
dnf install -y docker git
systemctl enable --now docker
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
usermod -aG docker ec2-user

# Setup app
mkdir -p /opt/plainledger/web-dist
cd /opt/plainledger

# Docker compose
cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports: ["80:80","443:443"]
    volumes: ["./Caddyfile:/etc/caddy/Caddyfile:ro","caddy_data:/data"]
    depends_on: [web,keycloak]
    networks: [app]
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: plainledger
      POSTGRES_PASSWORD: PlainLedger2024Secure!
      POSTGRES_DB: plainledger
    volumes: ["pg_data:/var/lib/postgresql/data","./init.sql:/docker-entrypoint-initdb.d/init.sql:ro"]
    healthcheck: {test: ["CMD","pg_isready","-U","plainledger"],interval: 10s,timeout: 5s,retries: 5}
    networks: [app]
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    networks: [app]
  keycloak:
    image: quay.io/keycloak/keycloak:23.0
    restart: unless-stopped
    environment:
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://postgres:5432/keycloak
      KC_DB_USERNAME: plainledger
      KC_DB_PASSWORD: PlainLedger2024Secure!
      KC_PROXY: edge
      KC_HTTP_ENABLED: "true"
      KC_HEALTH_ENABLED: "true"
      KEYCLOAK_ADMIN: admin
      KEYCLOAK_ADMIN_PASSWORD: PlainLedger2024!
    command: start
    depends_on: {postgres: {condition: service_healthy}}
    networks: [app]
  web:
    image: nginx:alpine
    restart: unless-stopped
    volumes: ["./web-dist:/usr/share/nginx/html:ro"]
    networks: [app]
volumes: {pg_data:,caddy_data:}
networks: {app:}
EOF

# Caddyfile
cat > Caddyfile << 'EOF'
:80 {
  handle /admin/* { reverse_proxy keycloak:8080 }
  handle /realms/* { reverse_proxy keycloak:8080 }
  handle /resources/* { reverse_proxy keycloak:8080 }
  handle { reverse_proxy web:80 }
  encode gzip
}
EOF

# Init SQL
cat > init.sql << 'EOF'
CREATE DATABASE keycloak;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TABLE IF NOT EXISTS organizations (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),name VARCHAR(255),tenant_id VARCHAR(100) UNIQUE,created_at TIMESTAMP DEFAULT NOW());
INSERT INTO organizations (name,tenant_id) VALUES ('Demo','demo-org') ON CONFLICT DO NOTHING;
EOF

# Web page
cat > web-dist/index.html << 'EOF'
<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PlainLedger</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui;background:#fafafa;min-height:100vh;display:flex;align-items:center;justify-content:center}.c{text-align:center}.l{width:60px;height:60px;border:2px solid #1a1a1a;margin:0 auto 1rem;display:flex;align-items:center;justify-content:center;font-size:1.5rem}h1{font-size:2rem;font-weight:300;margin-bottom:.5rem}.t{color:#666;margin-bottom:1.5rem}.s{display:inline-flex;align-items:center;gap:.5rem;padding:.5rem 1rem;background:#e8f5e9;border-radius:4px;color:#2e7d32;font-size:.875rem}.d{width:8px;height:8px;background:#4caf50;border-radius:50%;animation:p 2s infinite}@keyframes p{0%,100%{opacity:1}50%{opacity:.5}}.n{margin-top:1.5rem}.n a{color:#1a1a1a;text-decoration:none;margin:0 .5rem;padding:.5rem 1rem;border:1px solid #ddd;border-radius:4px}.n a:hover{background:#1a1a1a;color:#fff}</style></head><body><div class="c"><div class="l">▢</div><h1>PlainLedger</h1><p class="t">No surprises. Just numbers.</p><div class="s"><span class="d"></span>System Online</div><div class="n"><a href="/admin">Admin</a></div></div></body></html>
EOF

chown -R ec2-user:ec2-user /opt/plainledger
cd /opt/plainledger && docker-compose pull && docker-compose up -d
echo "Done: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
