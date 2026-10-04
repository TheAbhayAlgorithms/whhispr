# Whispr Platform — Production Deployment Guide (Module 21)

## 1. Overview
This document provides production deployment procedures for Whispr across cloud environments (AWS, Railway, Render, DigitalOcean, or standard Linux VPS).

---

## 2. Environment Configuration

Create a production `.env` file for the backend server:

```ini
# Core
NODE_ENV=production
PORT=4000
CLIENT_URL=https://whispr.yourdomain.com

# Database (PostgreSQL 16)
DATABASE_URL=postgres://whispr_user:StrongRandomPassword@postgres:5432/whispr?sslmode=require
DB_HOST=postgres
DB_PORT=5432
DB_NAME=whispr
DB_USER=whispr_user
DB_PASSWORD=StrongRandomPassword

# Redis 7
REDIS_URL=redis://:StrongRedisPassword@redis:6379

# JWT Secrets (Minimum 32 random characters)
JWT_ACCESS_SECRET=GenerateWithOpenSSL_rand_hex_32
JWT_REFRESH_SECRET=GenerateWithOpenSSL_rand_hex_32
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Storage (AWS S3 or MinIO)
STORAGE_DRIVER=s3
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=whispr-prod-media

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

---

## 3. Deployment with Docker Compose (Recommended)

### Step 1: Clone and Configure
```bash
git clone https://github.com/whispr-chat/whispr.git /opt/whispr
cd /opt/whispr
cp server/.env.example server/.env
# Edit server/.env with production credentials
```

### Step 2: Build & Start Containers
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### Step 3: Run Database Migrations
```bash
docker compose -f docker-compose.prod.yml exec api npm run migrate
```

---

## 4. HTTPS & Reverse Proxy Configuration (Certbot + Nginx)

If deploying to a standalone VPS or cloud VM, terminate SSL at Nginx:

```bash
# Install certbot
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx

# Obtain SSL Certificate
sudo certbot --nginx -d whispr.yourdomain.com
```

Nginx SSL configuration snippet:
```nginx
server {
    listen 443 ssl http2;
    server_name whispr.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/whispr.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/whispr.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:80;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
    }
}
```

---

## 5. Automated Database Backups

Set up automated daily PostgreSQL backups using `cron`:

```bash
# /etc/cron.daily/backup-whispr-db
#!/bin/bash
BACKUP_DIR="/var/backups/whispr"
mkdir -p "$BACKUP_DIR"
docker exec whispr_prod_postgres pg_dump -U whispr_user -d whispr | gzip > "$BACKUP_DIR/whispr_$(date +\%F_\%T).sql.gz"
find "$BACKUP_DIR" -type f -mtime +14 -delete
```

---

## 6. Health Checks & Monitoring

- **Liveness & Readiness Endpoint**: `GET /api/health`
  - Returns `200 OK` with JSON:
    ```json
    {
      "status": "ok",
      "services": {
        "database": "ok",
        "redis": "ok"
      }
    }
    ```
- **Interactive OpenAPI Specification**: `GET /api/docs`
