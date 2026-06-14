#!/bin/bash
#
# Provision a FRESH Ubuntu EC2 instance to run services/api.
#
# This bootstraps an already-launched instance (you create the EC2 + security
# group in the AWS console first: open ports 22, 80, 443). It installs the
# toolchain, optionally local Redis/Postgres, Nginx reverse proxy, PM2 + boot
# persistence, and drops a .env template to fill in. After this, run ./deploy.sh.
#
# Usage:
#   ./provision.sh <EC2_PUBLIC_IP> <PATH_TO_KEY.pem>
#
# Optional toggles (env vars):
#   INSTALL_REDIS=true       install + run Redis locally (matches cache.module.ts localhost, no TLS)
#   INSTALL_POSTGRES=false   install + run Postgres locally (default: use RDS instead)
#   SETUP_NGINX=true         install Nginx and proxy :80 -> :3000
#   CREATE_SWAP=true         add a 2G swapfile (recommended on t3.small/2GB boxes)
set -euo pipefail

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <EC2_PUBLIC_IP> <PATH_TO_KEY.pem>" >&2
  exit 1
fi

EC2_IP="$1"
KEY="$2"
EC2="ubuntu@$EC2_IP"

INSTALL_REDIS="${INSTALL_REDIS:-true}"
INSTALL_POSTGRES="${INSTALL_POSTGRES:-false}"
SETUP_NGINX="${SETUP_NGINX:-true}"
CREATE_SWAP="${CREATE_SWAP:-true}"
NODE_MAJOR=22
PNPM_VERSION=10.28.0
REMOTE_REPO=/home/ubuntu/project_1

if [ ! -f "$KEY" ]; then
  echo "❌ Key file '$KEY' not found." >&2
  exit 1
fi
chmod 400 "$KEY"

echo "➡️  Provisioning $EC2 (Redis=$INSTALL_REDIS Postgres=$INSTALL_POSTGRES Nginx=$SETUP_NGINX Swap=$CREATE_SWAP)"

# The outer heredoc is QUOTED so nothing expands locally; the remote bash
# expands everything and reads the toggles as positional args ($1..$6).
ssh -i "$KEY" "$EC2" bash -s -- \
  "$INSTALL_REDIS" "$INSTALL_POSTGRES" "$SETUP_NGINX" "$CREATE_SWAP" "$NODE_MAJOR" "$PNPM_VERSION" "$REMOTE_REPO" <<'REMOTE'
  set -euo pipefail
  INSTALL_REDIS="$1"; INSTALL_POSTGRES="$2"; SETUP_NGINX="$3"
  CREATE_SWAP="$4"; NODE_MAJOR="$5"; PNPM_VERSION="$6"; REMOTE_REPO="$7"

  echo "==> System packages"
  sudo apt-get update -y
  sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y
  sudo apt-get install -y git curl build-essential openssl ca-certificates postgresql-client

  if [ "$CREATE_SWAP" = "true" ] && [ ! -f /swapfile ]; then
    echo "==> Creating 2G swapfile"
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
  fi

  echo "==> Node.js $NODE_MAJOR (NodeSource)"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | sudo -E bash -
  sudo apt-get install -y nodejs
  node -v

  echo "==> pnpm $PNPM_VERSION (corepack)"
  sudo corepack enable
  corepack prepare "pnpm@${PNPM_VERSION}" --activate
  pnpm -v

  echo "==> PM2"
  sudo npm install -g pm2

  if [ "$INSTALL_REDIS" = "true" ]; then
    echo "==> Redis (local, bind localhost)"
    sudo apt-get install -y redis-server
    sudo systemctl enable redis-server
    sudo systemctl restart redis-server
  fi

  if [ "$INSTALL_POSTGRES" = "true" ]; then
    echo "==> PostgreSQL (local)"
    sudo apt-get install -y postgresql postgresql-contrib
    sudo systemctl enable postgresql
    sudo systemctl start postgresql
    # Create role/db only if they don't already exist (idempotent).
    sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='api_user'" | grep -q 1 || \
      sudo -u postgres psql -c "CREATE USER api_user WITH PASSWORD 'CHANGE_ME_strong_pw';"
    sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='api_db'" | grep -q 1 || \
      sudo -u postgres psql -c "CREATE DATABASE api_db OWNER api_user;"
    echo "    Local DB ready: postgresql://api_user:CHANGE_ME_strong_pw@localhost:5432/api_db"
    echo "    >>> Change that password and update services/api/.env DATABASE_URL <<<"
  fi

  echo "==> App directory"
  mkdir -p "$REMOTE_REPO/services/api"

  echo "==> .env template (only if absent — never clobbers an existing one)"
  ENV_FILE="$REMOTE_REPO/services/api/.env"
  if [ ! -f "$ENV_FILE" ]; then
    cat > "$ENV_FILE" <<'ENVEOF'
NODE_ENV=production
PORT=3000
API_PREFIX=api
# CORS (main.ts logic is INVERTED + the var is misspelled): CORS is applied only
# when CORS_ENALED is NOT "true". So to allow your web origin, do NOT set
# CORS_ENALED=true; instead set CORS_ORIGINS to a comma-separated allowlist
# (leave CORS_ORIGINS empty to allow all origins).
CORS_ORIGINS=https://your-web-app.example.com

# Database (RDS recommended; or local: postgresql://api_user:...@localhost:5432/api_db)
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME?schema=public

# Auth
JWT_SECRET=__CHANGE_ME_min_32_chars__

# Payments (Paytm)
PAYTM_MERCHANT_ID=
PAYTM_MERCHANT_KEY=

# Delivery (Uber)
UBER_CLIENT_ID=
UBER_CLIENT_SECRET=
UBER_WEBHOOK_SECRET=

# Notifications
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=

# File storage (S3)
S3_BUCKET_NAME=
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# Redis — validateEnvironment requires REDIS_URL, but the app connects via
# REDIS_HOST/PORT/PASSWORD (see cache.module.ts). Set BOTH.
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
ENVEOF
    chmod 600 "$ENV_FILE"
    echo "    Wrote template -> $ENV_FILE (fill in real values before deploying)"
  else
    echo "    Existing .env left untouched."
  fi

  if [ "$SETUP_NGINX" = "true" ]; then
    echo "==> Nginx reverse proxy (:80 -> :3000)"
    sudo apt-get install -y nginx
    sudo tee /etc/nginx/sites-available/api >/dev/null <<'NGINX'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90s;
        proxy_connect_timeout 90s;
        proxy_send_timeout 90s;
    }
}
NGINX
    sudo ln -sf /etc/nginx/sites-available/api /etc/nginx/sites-enabled/api
    sudo rm -f /etc/nginx/sites-enabled/default
    sudo nginx -t
    sudo systemctl reload nginx
  fi

  echo "==> PM2 boot persistence (survives reboots)"
  sudo env PATH="$PATH:$(dirname "$(command -v node)")" pm2 startup systemd -u ubuntu --hp /home/ubuntu
  pm2 save || true

  echo "==> Provisioning complete on $(hostname)"
REMOTE

cat <<EOF

✅ Provisioned $EC2_IP

Next steps:
  1. SSH in and fill real values:   ssh -i "$KEY" $EC2  -> edit $REMOTE_REPO/services/api/.env
  2. Point deploy.sh at this box:   set EC2=$EC2 and KEY=<key> in deploy.sh
  3. First deploy:                  ./deploy.sh
  4. (Optional) HTTPS with a domain: sudo certbot --nginx -d yourdomain.com
EOF
