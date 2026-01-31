# Deploy NestJS API on AWS EC2

Step-by-step guide to run this NestJS app on an Ubuntu EC2 instance with PM2, Nginx, and optional SSL.

---

## 1. Prerequisites

- AWS account
- (Optional) Domain pointing to your EC2 public IP
- PostgreSQL database (RDS or self-hosted)
- Redis (ElastiCache or self-hosted)

---

## 2. Launch EC2 Instance

### 2.1 In AWS Console

1. **EC2** → **Launch Instance**
2. **Name:** `api-production` (or any name)
3. **AMI:** Ubuntu Server 22.04 LTS
4. **Instance type:** `t3.small` (2 vCPU, 2 GB RAM) or `t3.medium` for more load
5. **Key pair:** Create or select an existing key (`.pem`) for SSH
6. **Network:** Default VPC or your own
7. **Storage:** 20–30 GB gp3
8. **Launch**

### 2.2 Security Group

Create or edit the instance security group:

| Type   | Port | Source        | Purpose      |
|--------|------|---------------|--------------|
| SSH    | 22   | Your IP only  | SSH access   |
| HTTP   | 80   | 0.0.0.0/0     | Nginx        |
| HTTPS  | 443  | 0.0.0.0/0     | Nginx (SSL) |
| Custom | 3000 | 127.0.0.1     | Optional: only if you want to block direct access to Node |

Allow **22**, **80**, **443**. Keep **3000** only for Nginx on the same host (localhost).

---

## 3. Connect and Prepare the Server

```bash
# Replace with your key and public IP
chmod 400 /path/to/your-key.pem
ssh -i /path/to/your-key.pem ubuntu@<EC2_PUBLIC_IP>
```

Update system and install basics:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl build-essential
```

---

## 4. Install Node.js (LTS)

Using NodeSource for Node 20:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # v20.x.x
npm -v
```

---

## 5. Install pnpm

```bash
sudo npm install -g pnpm
pnpm -v
```

---

## 6. Install PostgreSQL Client (if DB is on RDS)

Only needed for running migrations from this server; if DB is elsewhere, you can skip.

```bash
sudo apt install -y postgresql-client
```

---

## 7. Clone Your Repository

Use your real repo URL and branch.

```bash
cd ~
git clone https://github.com/YOUR_ORG/local-commerce-platform.git
cd local-commerce-platform
git checkout main   # or your production branch
```

---

## 8. Build the Monorepo

Build order: `packages/types` then `services/api`.

```bash
# From repo root
pnpm install --frozen-lockfile
pnpm --filter @repo/types build
pnpm --filter api build
```

If your `api` package name in `package.json` is `"name": "api"`, use:

```bash
pnpm --filter api build
```

Confirm build output:

```bash
ls -la services/api/dist/
# Should see main.js, main.js.map, etc.
```

---

## 9. Environment Variables

Create production env on the server (do **not** commit this file):

```bash
cd ~/local-commerce-platform/services/api
nano .env
```

Set at least (adjust values for production):

```env
NODE_ENV=production
PORT=3000
API_PREFIX=api

# Database (RDS or your PostgreSQL URL)
DATABASE_URL="postgresql://USER:PASSWORD@your-rds-endpoint:5432/DBNAME?schema=public"

# Auth
JWT_SECRET=your-strong-jwt-secret-min-32-chars

# Payments (Paytm)
PAYTM_MERCHANT_ID=your_merchant_id
PAYTM_MERCHANT_KEY=your_merchant_key

# Delivery (Uber)
UBER_CLIENT_ID=your_client_id
UBER_CLIENT_SECRET=your_client_secret
UBER_WEBHOOK_SECRET=your_webhook_secret

# Notifications
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your_project.iam.gserviceaccount.com
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_FROM_NUMBER=+1234567890

# File storage (S3)
S3_BUCKET_NAME=your-bucket
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# Redis (ElastiCache or same-server Redis)
REDIS_URL=redis://localhost:6379
```

Save and restrict permissions:

```bash
chmod 600 .env
```

---

## 10. Database and Redis

### Option A: AWS RDS + ElastiCache

- Create RDS PostgreSQL and ElastiCache Redis.
- Put RDS URL in `DATABASE_URL` and Redis URL in `REDIS_URL`.
- Ensure EC2 security group can reach RDS and Redis (same VPC / security group rules).

### Option B: PostgreSQL and Redis on Same EC2

```bash
sudo apt install -y postgresql postgresql-contrib redis-server
sudo systemctl enable postgresql redis-server
sudo systemctl start postgresql redis-server
```

Create DB and user:

```bash
sudo -u postgres psql -c "CREATE USER api_user WITH PASSWORD 'secure_password';"
sudo -u postgres psql -c "CREATE DATABASE api_db OWNER api_user;"
```

Use in `.env`:

```env
DATABASE_URL="postgresql://api_user:secure_password@localhost:5432/api_db?schema=public"
REDIS_URL=redis://localhost:6379
```

---

## 11. Run Prisma Migrations

From the API service directory:

```bash
cd ~/local-commerce-platform/services/api
npx prisma generate
npx prisma migrate deploy
```

(Optional) Seed:

```bash
pnpm prisma:seed
```

---

## 12. Process Manager (PM2)

Install PM2 and run the app:

```bash
sudo npm install -g pm2
cd ~/local-commerce-platform/services/api
pm2 start dist/main.js --name api
pm2 save
pm2 startup
# Run the command it prints (e.g. sudo env PATH=... pm2 startup systemd -u ubuntu --no-daemon)
```

Useful commands:

```bash
pm2 status
pm2 logs api
pm2 restart api
pm2 stop api
```

---

## 13. Nginx Reverse Proxy

Install Nginx and create a site config:

```bash
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/api
```

Paste (replace `YOUR_DOMAIN_OR_IP` with your domain or EC2 public IP):

```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

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
```

Enable and reload:

```bash
sudo ln -s /etc/nginx/sites-available/api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Your API will be at:

- `http://YOUR_DOMAIN_OR_IP/api/...`
- `http://YOUR_DOMAIN_OR_IP/docs` (Swagger)

---

## 14. (Optional) HTTPS with Let’s Encrypt

Only if you have a domain pointing to this EC2 IP:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

Follow prompts. Certbot will configure Nginx for HTTPS and auto-renewal.

---

## 15. Quick Checklist

- [ ] EC2 launched (Ubuntu 22.04), security group allows 22, 80, 443
- [ ] Node 20 + pnpm installed
- [ ] Repo cloned, `pnpm install`, types + api built
- [ ] `.env` created with all required variables
- [ ] PostgreSQL and Redis reachable (RDS/ElastiCache or local)
- [ ] `prisma migrate deploy` run
- [ ] PM2 running `dist/main.js` and `pm2 startup` done
- [ ] Nginx proxying port 80 → 3000
- [ ] (Optional) SSL with certbot

---

## 16. Updating the App Later

```bash
cd ~/local-commerce-platform
git pull
pnpm install --frozen-lockfile
pnpm --filter @repo/types build
pnpm --filter api build
cd services/api
npx prisma migrate deploy   # if there are new migrations
pm2 restart api
```

---

## 17. Troubleshooting

| Issue | What to check |
|-------|----------------|
| 502 Bad Gateway | `pm2 status` and `pm2 logs api`; ensure app listens on `PORT` (3000) and Nginx proxies to it |
| App crashes on start | `pm2 logs api`; usually missing env vars or DB/Redis unreachable |
| Can’t connect to RDS/Redis | Security groups: allow EC2 security group (or IP) on PostgreSQL (5432) and Redis (6379) |
| Prisma errors | `DATABASE_URL` correct; run `npx prisma migrate deploy` and `npx prisma generate` |

For more detail on required env vars, see `main.ts` (the `validateEnvironment()` list) and your `.env.sample` in the repo.
