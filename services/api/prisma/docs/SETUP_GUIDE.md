# Prisma Database Setup - Quick Start

## 🚀 Sprint 1 Day 1: Database Setup

This guide will get your PostgreSQL database running with the complete MVP schema in ~30 minutes.

---

## Prerequisites

- [ ] PostgreSQL installed and running
- [ ] Node.js 18+ installed
- [ ] pnpm installed

---

## Step 1: Install PostgreSQL (if needed)

### macOS
```bash
brew install postgresql@15
brew services start postgresql@15
```

### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### Docker (Recommended for Development)
```bash
docker run --name mvp-postgres \
  -e POSTGRES_USER=mvpuser \
  -e POSTGRES_PASSWORD=mvppassword \
  -e POSTGRES_DB=mvp_db \
  -p 5432:5432 \
  -d postgres:15-alpine
```

---

## Step 2: Create Database

### If using local PostgreSQL:
```bash
# Connect to PostgreSQL
psql postgres

# In psql:
CREATE DATABASE mvp_db;
CREATE USER mvpuser WITH ENCRYPTED PASSWORD 'mvppassword';
GRANT ALL PRIVILEGES ON DATABASE mvp_db TO mvpuser;
\q
```

### If using Docker:
Database already created! Skip this step.

---

## Step 3: Configure Environment

### Prisma v7 Configuration Notes

**IMPORTANT**: Prisma v7 changed how database connections are configured:
- Connection URLs are managed via `prisma.config.ts` for CLI operations (migrations, introspection)
- Your application uses PrismaClient with environment variables at runtime

### Development Setup

Create `services/api/.env`:

```env
# Database (Prisma v7 supports both pooled and direct connections)
DATABASE_URL="postgresql://mvpuser:mvppassword@localhost:5432/mvp_db?schema=public"

# Direct URL for migrations (can be same as DATABASE_URL for local dev)
DATABASE_DIRECT_URL="postgresql://mvpuser:mvppassword@localhost:5432/mvp_db?schema=public"

# Application
NODE_ENV=development
PORT=3000
API_PREFIX=api
API_VERSION=1

# CORS
CORS_ENABLED=true
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Rate Limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=10

# JWT (to be configured in Sprint 1 Day 3)
# JWT_SECRET=your-secret-key-here
# JWT_EXPIRATION=3600

# OTP (to be configured in Sprint 1 Day 2)
# OTP_PROVIDER=twilio
# OTP_ACCOUNT_SID=your-account-sid
# OTP_AUTH_TOKEN=your-auth-token
```

### Production Configuration

For production deployments, use TWO different connection URLs:

```env
# Pooled connection (via PgBouncer, Railway, Render, Supabase)
DATABASE_URL="postgresql://USER:PASSWORD@POOLER_HOST:PORT/DATABASE?schema=public&pgbouncer=true"

# Direct connection (bypass pooler for migrations)
DATABASE_DIRECT_URL="postgresql://USER:PASSWORD@DIRECT_HOST:PORT/DATABASE?schema=public"
```

**Why two URLs in production?**
- Connection pooling (PgBouncer) improves performance under load
- Migrations require direct database access (poolers don't support DDL)
- This separation is a Prisma v7 best practice

---

## Step 4: Install Prisma

```bash
cd services/api
pnpm add prisma @prisma/client
pnpm add -D ts-node
```

**Expected output:**
```
✓ @prisma/client added
✓ prisma added (dev)
✓ ts-node added (dev)
```

---

## Step 5: Generate Prisma Client

```bash
npx prisma generate
```

**Expected output:**
```
✔ Generated Prisma Client (7.3.0) to ./node_modules/@prisma/client
```

**Note**: Prisma v7.3.0 is installed. The client will be compatible with the new configuration format.

---

## Step 6: Create Initial Migration

**Prisma v7 Note:** Connection URL must be provided via environment variable or `--url` flag.

```bash
# Option 1: Using environment variable (recommended)
DATABASE_URL="postgresql://mvpuser:mvppassword@localhost:5432/mvp_db?schema=public" \
  npx prisma migrate dev --name init

# Option 2: Using --url flag
npx prisma migrate dev --url="postgresql://mvpuser:mvppassword@localhost:5432/mvp_db?schema=public" --name init

# Option 3: If DATABASE_URL is already in .env file
npx prisma migrate dev --name init
```

**Expected output:**
```
✔ Created migration 20260124_init
✔ Applied migration 20260124_init
```

**What this does:**
- Creates `prisma/migrations/` directory
- Generates SQL for all tables
- Applies migration to database
- Updates Prisma Client

---

## Step 7: Run Seed Data

```bash
npx prisma db seed
```

**Expected output:**
```
🌱 Starting database seed...
📦 Seeding categories...
✅ Categories seeded
🏪 Seeding test sellers...
✅ Test sellers seeded
👤 Seeding admin user...
✅ Admin user seeded

🎉 Database seed completed successfully!

📊 Summary:
   - Categories: 4 (1 ACTIVE, 3 COMING_SOON)
   - Test Sellers: 3 (all in Gurgaon)
   - Admin User: 1

🔐 Test Credentials:
   Seller 1: +919876543210
   Seller 2: +919876543211
   Seller 3: +919876543212
   Admin:    +919999999999
```

---

## Step 8: Verify Setup

### Open Prisma Studio
```bash
npx prisma studio
```

Browser opens at `http://localhost:5555`

**Verify:**
- [ ] `categories` table has 4 entries (printing is ACTIVE)
- [ ] `users` table has 4 entries (3 sellers + 1 admin)
- [ ] `sellers` table has 3 entries (all OFFLINE status)
- [ ] `seller_categories` table has 3 entries (all support printing)

---

## Step 9: Test Database Connection

Update `services/api/src/health/health.controller.ts`:

```typescript
import { Controller, Get } from '@nestjs/common';
import { HealthCheckService, HealthCheck, PrismaHealthIndicator } from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service'; // Create this next

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: PrismaHealthIndicator,
    private prisma: PrismaService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database', this.prisma),
    ]);
  }
}
```

Test:
```bash
pnpm start:dev
curl http://localhost:3000/health
```

Expected:
```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up"
    }
  }
}
```

---

## Production Deployment

### Running Migrations in Production

**IMPORTANT**: In production with connection pooling (PgBouncer), migrations must use the direct database URL.

#### Option 1: Using environment variable override
```bash
# Set both URLs in your environment
export DATABASE_URL="postgresql://user:pass@pooler:5432/db?pgbouncer=true"
export DATABASE_DIRECT_URL="postgresql://user:pass@direct-host:5432/db"

# Run migrations with direct URL
npx prisma migrate deploy --url=$DATABASE_DIRECT_URL
```

#### Option 2: Using --url flag directly
```bash
# Specify direct URL inline (bypasses pooler)
npx prisma migrate deploy --url="postgresql://user:pass@direct-host:5432/db"
```

#### Option 3: Deployment script
Create `prisma/deploy.sh`:
```bash
#!/bin/bash
set -e

echo "🚀 Deploying Prisma migrations..."

# Use direct URL for migrations
npx prisma migrate deploy --url="$DATABASE_DIRECT_URL"

# Generate client (uses standard DATABASE_URL)
npx prisma generate

echo "✅ Migrations deployed successfully"
```

**Why this matters:**
- Connection poolers (PgBouncer) work in transaction mode
- DDL operations (CREATE TABLE, ALTER TABLE) require session mode
- Direct connection bypasses pooler for migrations
- Application queries still use pooled connection for performance

---

## Common Issues & Solutions

### Issue: Connection refused
**Symptom:** `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solution:**
```bash
# Check if PostgreSQL is running
ps aux | grep postgres

# Start PostgreSQL
# macOS: brew services start postgresql@15
# Linux: sudo systemctl start postgresql
# Docker: docker start mvp-postgres
```

### Issue: Authentication failed
**Symptom:** `Error: password authentication failed`

**Solution:**
```bash
# Reset password
psql postgres
ALTER USER mvpuser WITH PASSWORD 'mvppassword';
\q

# Update .env with correct credentials
```

### Issue: Database does not exist
**Symptom:** `Error: database "mvp_db" does not exist`

**Solution:**
```bash
# Create database
psql postgres
CREATE DATABASE mvp_db;
\q
```

### Issue: Prisma Client not generated
**Symptom:** `Cannot find module '@prisma/client'`

**Solution:**
```bash
npx prisma generate
```

### Issue: Seed fails with unique constraint
**Symptom:** `Unique constraint failed on the fields: (phone)`

**Solution:**
```bash
# Reset database and re-seed
npx prisma migrate reset
# Confirm with 'y'
```

---

## Next Steps (Sprint 1 Continuation)

After database setup is complete:

- [ ] **Day 1 PM:** Create `PrismaService` as global provider
- [ ] **Day 1 PM:** Update `app.module.ts` to include PrismaModule
- [ ] **Day 2:** Start Auth implementation (OTP)
- [ ] **Day 3:** Implement JWT and seller availability

---

## Useful Commands

```bash
# View database in browser
npx prisma studio

# Reset database (DESTRUCTIVE)
npx prisma migrate reset

# Create new migration
npx prisma migrate dev --name description

# Apply migrations (production)
npx prisma migrate deploy

# Pull schema from existing database
npx prisma db pull

# Push schema without migration (dev only)
npx prisma db push

# Format schema file
npx prisma format

# Validate schema
npx prisma validate
```

---

## Database Credentials (Development)

**Local PostgreSQL:**
- Host: localhost
- Port: 5432
- Database: mvp_db
- User: mvpuser
- Password: mvppassword

**Connection String:**
```
postgresql://mvpuser:mvppassword@localhost:5432/mvp_db?schema=public
```

---

## ✅ Setup Complete Checklist

Before moving to Sprint 1 Day 2:

- [ ] PostgreSQL is running
- [ ] Database `mvp_db` exists
- [ ] `.env` file configured
- [ ] Prisma installed
- [ ] Migration applied successfully
- [ ] Seed data loaded
- [ ] Prisma Studio shows correct data
- [ ] Health check passes
- [ ] Team has reviewed schema

**Status:** 🚀 Ready for Sprint 1 Day 2 (Auth Implementation)

---

**Setup Time:** ~30 minutes  
**Created:** 2026-01-24  
**For:** Sprint 1 Day 1
