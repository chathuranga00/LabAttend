# NSBM Green University AttendX - Production Deployment Manual & Operations Runbook

This guide outlines the deployment architecture, configuration files, production security hardening, migration procedures, backup strategies, and release workflows for **AttendX**.

> **Note**: This document provides verified deployment configurations and runbooks ready for staging/production deployment. No live cloud production deployments have been executed or claimed.

---

## 1. Production Hosting Topology

```
                                  [ Global CDN / Edge Layer ]
                                               │
                       ┌───────────────────────┴───────────────────────┐
                       ▼                                               ▼
         [ Web Client: Vercel / Netlify ]              [ Mobile Client: Android / iOS ]
         - React 19 + TypeScript + Vite                - Flutter 3.47.1 Release Build
         - Edge Caching & Asset Compression            - Obfuscated bytecode & Keystore signed
         - SPA Rewrites to index.html                  - Injects API_BASE_URL via dart-define
                       │                                               │
                       │ HTTPS (TLS 1.3)                               │ HTTPS (TLS 1.3)
                       ▼                                               ▼
      ┌─────────────────────────────────────────────────────────────────────────────────┐
      │                        Backend API: Render / Railway / Docker                   │
      │  - Containerized Node.js 20 Express Service (Port 5000)                        │
      │  - Reverse Proxy SSL Termination & Strict CORS Filter                           │
      │  - Global, Submission & Export Rate Limiters                                    │
      │  - Ephemeral 30s QR Rotation & Haversine Geofencing Engine                      │
      └─────────────────────────────────────────────────────────────────────────────────┘
                                               │
                                               │ Encrypted PostgreSQL Connection
                                               │ (Transaction Pooler - Port 6543)
                                               ▼
      ┌─────────────────────────────────────────────────────────────────────────────────┐
      │                         Database & Identity: Supabase Managed                   │
      │  - PostgreSQL 15+ Engine with Row-Level Security (RLS) on all 12 tables        │
      │  - Supabase Auth Service (Cryptographic JWT Token Issuer)                      │
      │  - Automated Point-in-Time Recovery (PITR) & Daily Snapshots                    │
      └─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Backend API Hosting (Render / Railway / Docker)

### Option A: Render Managed Web Service
The repository includes a ready-to-use Render Blueprint specification: [render.yaml](file:///q:/MY%20Projects/AttendX/render.yaml).

1. Connect the GitHub repository to [Render](https://render.com).
2. Create a new **Blueprint Instance** pointing to `render.yaml`.
3. Configure the secret environment variables in the Render Dashboard:
   - `SUPABASE_URL`: Production Supabase HTTPS endpoint.
   - `SUPABASE_ANON_KEY`: Public anonymous key.
   - `SUPABASE_SERVICE_ROLE_KEY`: Administrative service role secret key.
   - `CORS_ORIGIN`: Comma-separated allowed web dashboard domains (e.g., `https://attendx.nsbm.ac.lk,https://attendx-web.vercel.app`).
4. **Health Check Path**: `/api/health`
5. **Auto-Deploy**: Enabled on commits to the `main` branch.

### Option B: Railway Container Service
1. Link GitHub repository on [Railway](https://railway.app).
2. Set the Root Directory to `/server`.
3. Railway automatically detects [server/Dockerfile](file:///q:/MY%20Projects/AttendX/server/Dockerfile).
4. Configure variables in Railway Variables dashboard (`PORT=5000`, `NODE_ENV=production`, `SUPABASE_*`).
5. Configure custom domain with automatic SSL certification.

### Option C: Self-Hosted Multi-Stage Docker Container
Build and run the production container locally or on any cloud VM (AWS EC2, GCP Compute Engine, DigitalOcean Droplet):

```bash
# Build multi-stage optimized image
cd server
docker build -t attendx-api:latest .

# Run container with production environment file
docker run -d \
  --name attendx-api \
  --restart unless-stopped \
  -p 5000:5000 \
  --env-file .env.production \
  attendx-api:latest

# Verify health status
curl -f http://localhost:5000/api/health
```

---

## 3. Supabase Production Settings & Hardening

1. **Connection Pooling & PgBouncer**:
   - For serverless or high-concurrency environments, connect via Supabase's **Transaction Connection Pooler** on port `6543` rather than direct port `5432` to prevent connection starvation.
   - Set `pool_mode = transaction`.
2. **SSL Enforcement**:
   - Ensure all database connections mandate SSL: `sslmode=require`.
3. **Database Security & RLS**:
   - Row-Level Security (RLS) is active across all 12 tables (`profiles`, `academic_years`, `semesters`, `courses`, `course_enrollments`, `lecturer_course_assignments`, `laboratory_rooms`, `laboratory_sessions`, `qr_tokens`, `attendance_records`, `attendance_verification_attempts`, `attendance_audit_logs`).
   - The `handle_new_user` trigger enforces role default to `'student'`. Privilege escalation to `'admin'` or `'lecturer'` requires administrative DB execution.
4. **Auth Email Rate Limits & SMTP**:
   - Replace default Supabase email service with institutional custom SMTP (e.g., Amazon SES or SendGrid) configured for `@nsbm.ac.lk` and `@students.nsbm.ac.lk` domains.
   - Set rate limit to 30 password reset emails per hour per IP.
5. **Backups & Point-in-Time Recovery (PITR)**:
   - Enable Supabase **Point-In-Time Recovery (PITR)** (available on Pro/Team plans) providing 7 to 30 days of granular, second-level point-in-time recovery.

---

## 4. React Web Dashboard Deployment (Vercel / Netlify)

The web dashboard is an optimized single-page React application configured with client-side routing.

### Option A: Vercel Deployment
The repository includes [web/vercel.json](file:///q:/MY%20Projects/AttendX/web/vercel.json):
1. Import repository into [Vercel](https://vercel.com).
2. Configure project settings:
   - **Framework Preset**: Vite
   - **Root Directory**: `web`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Add Environment Variables:
   - `VITE_API_URL`: Production backend URL (e.g. `https://api.attendx.nsbm.ac.lk/api`)
   - `VITE_SUPABASE_URL`: Supabase project URL
   - `VITE_SUPABASE_ANON_KEY`: Supabase anon public key
4. Deploy. Vercel automatically routes all paths (`/*`) to `/index.html` and applies institutional security headers.

### Option B: Netlify Deployment
The repository includes [web/netlify.toml](file:///q:/MY%20Projects/AttendX/web/netlify.toml):
1. Import repository into [Netlify](https://netlify.com).
2. Base directory: `web`.
3. Build command: `npm run build`.
4. Publish directory: `web/dist`.
5. Netlify applies 200 rewrite rules for client-side routing and cache controls.

---

## 5. Flutter Mobile Release Build (Android APK & AAB)

### 1. Release Keystore Generation
Generate an institutional upload keystore using Java `keytool`:

```bash
keytool -genkey -v -keystore attendx-upload-keystore.jks \
  -alias attendx-release-key \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -dname "CN=NSBM AttendX, OU=IT, O=NSBM Green University, L=Pitipana, ST=Western, C=LK"
```

### 2. Configure Keystore Credentials
Copy [mobile/android/key.properties.example](file:///q:/MY%20Projects/AttendX/mobile/android/key.properties.example) to `mobile/android/key.properties`:

```properties
storePassword=YOUR_STRONG_STORE_PASSWORD
keyPassword=YOUR_STRONG_KEY_PASSWORD
keyAlias=attendx-release-key
storeFile=/absolute/path/to/attendx-upload-keystore.jks
```

### 3. Build Google Play App Bundle (AAB)
```bash
cd mobile

# Clean and resolve dependencies
flutter clean
flutter pub get

# Build production Android App Bundle with injected production API URL and code obfuscation
flutter build appbundle --release \
  --dart-define=API_BASE_URL=https://api.attendx.nsbm.ac.lk/api \
  --obfuscate \
  --split-debug-info=build/app/outputs/symbols
```
*Output: `build/app/outputs/bundle/release/app-release.aab`*

### 4. Build Standalone Universal / Architecture-Split APKs
For direct university distribution or Firebase App Distribution:

```bash
# Architecture-split APKs (arm64-v8a, armeabi-v7a, x86_64)
flutter build apk --release \
  --split-per-abi \
  --dart-define=API_BASE_URL=https://api.attendx.nsbm.ac.lk/api

# Universal APK
flutter build apk --release \
  --dart-define=API_BASE_URL=https://api.attendx.nsbm.ac.lk/api
```
*Output: `build/app/outputs/flutter-apk/app-release.apk`*

---

## 6. Production Environment Variables Reference

| Variable Name | Component | Scope / Visibility | Purpose & Example Value |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Backend | Server Private | Environment mode: `production` |
| `PORT` | Backend | Server Private | HTTP server listening port: `5000` |
| `CORS_ORIGIN` | Backend | Server Private | Allowed web client origins: `https://attendx.nsbm.ac.lk,https://attendx-web.vercel.app` |
| `SUPABASE_URL` | Backend & Web | Public / Server | Supabase project endpoint: `https://xyzcompany.supabase.co` |
| `SUPABASE_ANON_KEY` | Backend & Web | Public Client Safe | Supabase anonymous API key for client-side Auth |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend | Server Secret ONLY | Supabase administrative bypass key; **NEVER** expose to web/mobile |
| `JWT_SECRET` | Backend | Server Private | Optional Supabase JWT secret for offline signature verification |
| `VITE_API_URL` | Web | Injected at Build | Backend API base URL: `https://api.attendx.nsbm.ac.lk/api` |
| `API_BASE_URL` | Mobile | Injected at Build | Backend API URL passed via `--dart-define=API_BASE_URL=...` |

---

## 7. HTTPS, SSL Termination, & CORS Architecture

1. **Strict Transport Security (HSTS)**:
   - Backend Helmet middleware enforces `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`.
2. **CORS Security**:
   - The backend checks incoming `Origin` headers against the validated list in `CORS_ORIGIN`.
   - Wildcards (`*`) with credentials (`credentials: true`) are explicitly disallowed in [server/src/app.ts](file:///q:/MY%20Projects/AttendX/server/src/app.ts).
3. **Security Headers**:
   - Both Web and Server enforce:
     - `X-Content-Type-Options: nosniff`
     - `X-Frame-Options: DENY`
     - `Referrer-Policy: strict-origin-when-cross-origin`

---

## 8. Database Migrations & Version Control Pipeline

Execute PostgreSQL migrations sequentially in order against the production Supabase instance:

```bash
# Using Supabase CLI
supabase db push

# Or using psql directly via connection string:
psql "$SUPABASE_DB_URL" -f database/migrations/00001_initial_schema.sql
psql "$SUPABASE_DB_URL" -f database/migrations/00002_create_profiles.sql
psql "$SUPABASE_DB_URL" -f database/migrations/00003_fix_rls_and_constraints.sql
psql "$SUPABASE_DB_URL" -f database/migrations/00004_fix_profile_trigger.sql

# Optional initial institutional seed data (Admin, Academic Years, Semesters, Rooms):
psql "$SUPABASE_DB_URL" -f database/seeds/00001_seed_initial_data.sql
```

### Safe Migration Rules:
- Never drop a column in production without a preceding deprecation cycle.
- Add new columns as `NULL` or with safe default values.
- Table indexes should use `CREATE INDEX CONCURRENTLY` in live production environments.

---

## 9. Backup and Disaster Recovery Strategy

### Recovery Objectives
- **RPO (Recovery Point Objective)**: < 1 hour (Data loss window limited to maximum 1 hour via continuous WAL archiving).
- **RTO (Recovery Time Objective)**: < 30 minutes (Full service restoration from cold backup or standby instance).

### Daily Cold Backup Runbook (`cron` scheduled)
```bash
#!/usr/bin/env bash
# attendx_db_backup.sh - Daily automated encrypted backup to Cloud Storage
set -euo pipefail

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/var/backups/attendx"
BACKUP_FILE="${BACKUP_DIR}/attendx_dump_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

# Perform compressed pg_dump of relational schema and data
pg_dump -h "$SUPABASE_DB_HOST" -p 5432 -U postgres -d postgres -F p | gzip > "$BACKUP_FILE"

# Encrypt backup with OpenSSL AES-256
openssl enc -aes-256-cbc -salt -pbkdf2 -in "$BACKUP_FILE" -out "${BACKUP_FILE}.enc" -pass env:BACKUP_ENCRYPTION_KEY
rm "$BACKUP_FILE"

# Upload to secure cold storage (AWS S3 / Google Cloud Storage)
aws s3 cp "${BACKUP_FILE}.enc" "s3://nsbm-attendx-backups/database/${TIMESTAMP}/"

# Retain local backups for 7 days
find "$BACKUP_DIR" -type f -name "*.enc" -mtime +7 -delete

echo "Backup completed successfully at ${TIMESTAMP}"
```

### Disaster Recovery Restoration Runbook
1. Provision standby Supabase / PostgreSQL instance.
2. Download and decrypt latest backup:
   ```bash
   openssl enc -d -aes-256-cbc -pbkdf2 -in attendx_dump_latest.sql.gz.enc -out attendx_dump.sql.gz -pass env:BACKUP_ENCRYPTION_KEY
   gunzip attendx_dump.sql.gz
   ```
3. Restore database schema and records:
   ```bash
   psql -h "$NEW_DB_HOST" -U postgres -d postgres -f attendx_dump.sql
   ```
4. Update `SUPABASE_URL` and `SUPABASE_*` credentials in backend hosting environment.
5. Trigger redeployment of the backend API service.
