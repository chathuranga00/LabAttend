# LabAttend - Production Deployment Manual & Operations Runbook

This runbook provides complete, step-by-step instructions for deploying **LabAttend** to production cloud environments with zero hardcoded credentials, automated database migrations, multi-stage containerization, and secure client-side routing.

---

## 1. Production Architecture Overview

```
                                      [ Global CDN / Edge Layer ]
                                      (Cloudflare / Vercel Edge / Netlify)
                                                   │
                                                   │ HTTPS (TLS 1.3)
                                                   ▼
                                      ┌─────────────────────────┐
                                      │  Frontend Web Client    │
                                      │  (Vercel or Netlify)    │
                                      │  - React 18 + Vite      │
                                      │  - Tailwind CSS         │
                                      │  - html5-qrcode Scanner │
                                      │  - SPA Routing Fallback │
                                      └────────────┬────────────┘
                                                   │
                                                   │ HTTPS REST API
                                                   │ (CORS Restricted, Bearer JWT)
                                                   ▼
                                      ┌─────────────────────────┐
                                      │  Backend API Engine     │
                                      │  (Render / Railway /    │
                                      │   Fly.io / Docker)      │
                                      │  - Spring Boot 3.3.5    │
                                      │  - Java 21 JRE (Alpine) │
                                      │  - Flyway Migrations    │
                                      │  - Structured Logging   │
                                      │  - Rate Limiting Shield │
                                      │  - Health: /api/health  │
                                      └────────────┬────────────┘
                                                   │
                                                   │ Encrypted PostgreSQL (TLS)
                                                   │ (Pooled or Direct JDBC)
                                                   ▼
                                      ┌─────────────────────────┐
                                      │   Supabase PostgreSQL   │
                                      │   - 12 Relational Tables│
                                      │   - Immutable Audit Logs│
                                      │   - ACID Transactions   │
                                      └─────────────────────────┘
```

---

## 2. Supabase PostgreSQL Connection Architecture

When deploying Spring Boot with HikariCP to connect to Supabase PostgreSQL, choosing the correct connection endpoint is critical to prevent connection starvation and DNS resolution errors.

### Direct Connection vs. Connection Pooler

| Feature | Direct Connection | Session Mode Pooler | Transaction Mode Pooler |
| :--- | :--- | :--- | :--- |
| **Endpoint Format** | `db.<ref>.supabase.co:5432` | `aws-0-<region>.pooler.supabase.com:5432` | `aws-0-<region>.pooler.supabase.com:6543` |
| **Port** | `5432` | `5432` | `6543` |
| **IP Routing** | **IPv6 only** (unless IPv4 add-on purchased) | **IPv4 & IPv6 supported** | **IPv4 & IPv6 supported** |
| **Prepared Statements** | Supported natively | Supported natively | Requires `prepareThreshold=0` |
| **Recommended For** | Dedicated VMs with IPv6 egress | **Spring Boot on Render / Railway / Fly.io** | Serverless / AWS Lambda / Vercel Edge |

### Which Connection Should You Use?

> **RECOMMENDATION**: For cloud hosts like **Render**, **Railway**, and **Fly.io**, use the **Supabase Session Mode Pooler** (Port `5432`) or **Transaction Mode Pooler** (Port `6543`) with `prepareThreshold=0`.
> 
> **Why?** Many shared cloud hosts do not support outbound IPv6 networking on standard tiers. Supabase's direct connection (`db.<ref>.supabase.co`) is strictly IPv6 on modern Supabase tiers. The Supabase Pooler endpoint (`aws-0-<region>.pooler.supabase.com`) provides full IPv4 routing.

#### 1. Session Mode Pooler (Port 5432) — *Recommended for Spring Boot*
```
jdbc:postgresql://aws-0-<region>.pooler.supabase.com:5432/<database_name>?sslmode=require
```

#### 2. Transaction Mode Pooler (Port 6543) — *Alternative*
If using port 6543, you MUST append `prepareThreshold=0` because PgBouncer/Supavisor transaction pooling does not maintain server-side prepared statement caches between transactions:
```
jdbc:postgresql://aws-0-<region>.pooler.supabase.com:6543/<database_name>?sslmode=require&prepareThreshold=0
```

---

## 3. Backend Deployment (Render / Railway / Fly.io)

The backend includes a production-grade multi-stage [Dockerfile](file:///q:/MY%20Projects/Lab%20Attend/backend/Dockerfile) utilizing Eclipse Temurin OpenJDK 21 on Alpine Linux, running as an unprivileged non-root user (`appuser`).

### Option A: Render (Web Service)

1. Sign in to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository: `https://github.com/<your-username>/LabAttend`.
4. Configure service parameters:
   - **Name**: `labattend-backend`
   - **Region**: Select the region closest to your Supabase instance (e.g., `Singapore` or `Frankfurt`).
   - **Root Directory**: `backend`
   - **Environment**: `Docker`
   - **Dockerfile Path**: `Dockerfile` (relative to the `backend` root)
   - **Instance Type**: `Starter` (0.5 CPU, 512 MB RAM or higher)
5. Add the **Environment Variables** (see Section 5 below).
6. Configure the Health Check:
   - **Health Check Path**: `/api/health`
7. Click **Create Web Service**.
8. Render will build the Docker container and automatically deploy it.

---

### Option B: Railway (Container Service)

1. Sign in to [Railway](https://railway.app).
2. Click **New Project** -> **Deploy from GitHub repo**.
3. Select the `LabAttend` repository.
4. In the service settings:
   - Go to **Settings** -> **Source Directory** -> set to `/backend`.
   - Railway automatically detects `backend/Dockerfile`.
5. Go to **Variables** tab and inject all required environment variables.
6. Under **Settings** -> **Networking** -> click **Generate Domain** (e.g., `labattend-backend.up.railway.app`).
7. Railway will build and launch the container on the allocated port.

---

### Option C: Fly.io

1. Install Fly CLI: `powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"`.
2. Authenticate: `fly auth login`.
3. In terminal, navigate to the `backend/` directory:
   ```bash
   cd backend
   fly launch --no-deploy
   ```
4. Configure `fly.toml`:
   - Set internal port: `internal_port = 8080`.
   - Set health check path: `/api/health`.
5. Set production secrets in Fly:
   ```bash
   fly secrets set \
     SPRING_PROFILES_ACTIVE=prod \
     SPRING_DATASOURCE_URL="jdbc:postgresql://aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require" \
     SPRING_DATASOURCE_USERNAME="postgres.<project-ref>" \
     SPRING_DATASOURCE_PASSWORD="<supabase-db-password>" \
     JWT_SECRET="<your-generated-256bit-secret>" \
     CORS_ALLOWED_ORIGINS="https://labattend.vercel.app"
   ```
6. Deploy: `fly deploy`.

---

## 4. Frontend Deployment (Vercel / Netlify)

The React frontend requires single-page application (SPA) rewrite rules so that deep links (`/admin/dashboard`, `/lecturer/sessions/active`) do not result in HTTP 404 errors when reloaded.

The repository includes pre-configured fallback configurations:
- **Vercel**: [vercel.json](file:///q:/MY%20Projects/Lab%20Attend/frontend/vercel.json)
- **Netlify**: [netlify.toml](file:///q:/MY%20Projects/Lab%20Attend/frontend/netlify.toml) & [public/_redirects](file:///q:/MY%20Projects/Lab%20Attend/frontend/public/_redirects)

### Option A: Vercel (Recommended)

1. Sign in to [Vercel](https://vercel.com).
2. Click **Add New...** -> **Project**.
3. Import your `LabAttend` GitHub repository.
4. In the configuration modal:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click edit and select `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Expand **Environment Variables** and add:
   - `VITE_API_BASE_URL`: `https://<your-backend-host>/api` (e.g., `https://labattend-backend.onrender.com/api`)
6. Click **Deploy**.
7. Vercel automatically deploys with edge caching, asset compression, and SPA rewrite rules.

---

### Option B: Netlify

1. Sign in to [Netlify](https://www.netlify.com).
2. Click **Add new site** -> **Import an existing project**.
3. Select GitHub and pick the `LabAttend` repository.
4. Configure Build settings:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/dist`
5. Under **Environment variables**, add:
   - `VITE_API_BASE_URL`: `https://<your-backend-host>/api`
6. Click **Deploy site**.
7. Netlify detects `public/_redirects` and routes all traffic to `index.html` with HTTP 200.

---

## 5. Production Environment Variables Reference

> [!CAUTION]
> Never commit actual credentials, database passwords, or JWT secrets to Git. Always inject them via the cloud provider's dashboard or CLI secret manager.

### Backend Environment Variables (`backend`)

| Variable Name | Required | Default / Example Value | Description |
| :--- | :---: | :--- | :--- |
| `SPRING_PROFILES_ACTIVE` | **YES** | `prod` | Activates production profile with structured logging and hardened security. |
| `PORT` or `SERVER_PORT` | Auto | `8080` | Port bound by the cloud provider (Render/Railway inject `PORT` automatically). |
| `SPRING_DATASOURCE_URL` | **YES** | `jdbc:postgresql://aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require` | Supabase JDBC connection URL with SSL enabled. |
| `SPRING_DATASOURCE_USERNAME` | **YES** | `postgres.<project-ref>` (pooler) or `postgres` | Supabase database username. |
| `SPRING_DATASOURCE_PASSWORD` | **YES** | `(your-secret-password)` | Supabase PostgreSQL user password. |
| `JWT_SECRET` | **YES** | `(64-char hex or base64 string)` | Cryptographic secret key (minimum 256 bits) for signing JJWT tokens. |
| `JWT_EXPIRATION_MS` | NO | `86400000` (24 hours) | Token validity lifetime in milliseconds. |
| `CORS_ALLOWED_ORIGINS` | **YES** | `https://labattend.vercel.app,https://labattend.netlify.app` | Comma-separated list of allowed production frontend domains. |
| `SPRING_FLYWAY_ENABLED` | NO | `true` | Automatically applies pending database migrations on startup. |
| `DB_POOL_MAX` | NO | `10` | Maximum HikariCP database connections in pool. |
| `DB_POOL_MIN` | NO | `2` | Minimum idle connections maintained in pool. |
| `INITIAL_ADMIN_EMAIL` | NO | `admin@labattend.local` | Email for initial administrator bootstrap (if database is empty). |
| `INITIAL_ADMIN_PASSWORD` | NO | `Admin@Secure2026!` | Password for initial administrator bootstrap. |
| `INITIAL_ADMIN_NAME` | NO | `System Administrator` | Full name for initial administrator account. |

### Frontend Environment Variables (`frontend`)

| Variable Name | Required | Example Value | Description |
| :--- | :---: | :--- | :--- |
| `VITE_API_BASE_URL` | **YES** | `https://labattend-backend.onrender.com/api` | Public base URL of the Spring Boot backend REST API. Must include `/api` with no trailing slash. |
| `VITE_APP_NAME` | NO | `LabAttend` | Application branding title displayed in page headers. |

---

## 6. Mobile QR Camera Scanner & HTTPS Strict Requirements

To scan physical student badge QR codes using `html5-qrcode` in mobile browsers (e.g. Chrome on Android, Safari on iOS):

1. **HTTPS Enforcement**:
   - Modern mobile operating systems (iOS WebKit and Android Chromium) strictly enforce the **Secure Context API**.
   - `navigator.mediaDevices.getUserMedia` will **fail silently or throw an error** if the frontend is served over unencrypted HTTP (unless on `localhost`).
   - The production frontend MUST be accessed via `https://` (provided automatically by Vercel and Netlify).

2. **Camera Permissions**:
   - On the first scan attempt, the browser displays a standard permission dialog: *"labattend.vercel.app wants to use your camera"*.
   - Instruct lecturers to tap **Allow**.
   - If accidentally blocked, navigate to browser site settings -> Permissions -> Camera -> set to **Allow**.

---

## 7. Post-Deployment Verification Checklist

Execute this checklist immediately after deploying to verify system integrity:

- [ ] **1. HTTPS Certificate & Security Headers**:
  - Open the deployed frontend URL (`https://labattend.vercel.app`) in a browser.
  - Confirm the browser padlock icon shows a valid TLS certificate with zero mixed content warnings.

- [ ] **2. Health Check Endpoint**:
  - Run: `curl -i https://<backend-url>/api/health`
  - Verify HTTP `200 OK` response with JSON body:
    ```json
    {
      "success": true,
      "message": "LabAttend System Health Status: UP",
      "data": {
        "status": "UP",
        "database": "CONNECTED",
        "version": "1.0.0",
        "environment": "prod"
      }
    }
    ```

- [ ] **3. Flyway Database Migrations**:
  - Inspect backend startup logs (in Render / Railway dashboard).
  - Verify Flyway logged: `Successfully applied 5 migration(s) to schema "public"`.
  - Confirm all 12 tables exist in Supabase Table Editor.

- [ ] **4. Administrator Authentication**:
  - Navigate to `https://<frontend-url>/login`.
  - Sign in using `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD`.
  - Verify redirection to `/admin/dashboard` with summary cards and real database metrics.

- [ ] **5. Lecturer Authentication**:
  - Sign in as an authorized lecturer account.
  - Verify redirection to `/lecturer/dashboard`.
  - Confirm assigned modules and lab sessions appear correctly.

- [ ] **6. Real Mobile Phone Camera QR Scanning**:
  - Open `https://<frontend-url>` on a physical mobile phone (iPhone or Android).
  - Log in as lecturer and launch an active lab session scanner.
  - Allow camera access and point the device at a sample student badge QR token.
  - Verify instant green audio-visual confirmation card with student name, registration number, and timestamp.
  - Rescan the exact same badge to verify rejection with yellow *"Already Marked Present"* card.

- [ ] **7. SPA Routing Fallback**:
  - While on `/admin/dashboard` or `/lecturer/sessions`, press browser Refresh (F5).
  - Confirm the page reloads cleanly without throwing an HTTP 404 error.

- [ ] **8. Security & Secret Exposure Audit**:
  - Verify `git status` and Git history: confirm `.env`, `.env.production`, database passwords, and JWT secret keys have zero commits in the repository.
