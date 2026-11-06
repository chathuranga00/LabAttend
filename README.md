# LabAttend - Laboratory & Lecture Attendance Management System

**LabAttend** is an enterprise-grade academic laboratory and lecture attendance management platform. It empowers lecturers to conduct lab sessions and scan physical student badges using device cameras, while providing department administrators with real-time analytics, institutional rosters, multi-format reports, and immutable audit logs.

[![CI Pipeline](https://github.com/chathuranga00/LabAttend/actions/workflows/ci.yml/badge.svg)](https://github.com/chathuranga00/LabAttend/actions/workflows/ci.yml)
![Java](https://img.shields.io/badge/Java-21%20%7C%2017+-orange?logo=openjdk)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.3.5-brightgreen?logo=springboot)
![React](https://img.shields.io/badge/React-18-blue?logo=react)
![Vite](https://img.shields.io/badge/Vite-5.4-purple?logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwindcss)
![PostgreSQL](https://img.shields.io/badge/Database-Supabase%20PostgreSQL-3ECF8E?logo=supabase)

---

## Architecture & Technology Stack

- **Frontends (Two Independent SPAs)**:
  - **Staff Portal (`/frontend-staff`)**: React 18 + Vite 5 + Tailwind CSS + React Router v6 + `html5-qrcode` (Port 5173). Admin & Lecturer management, webcam/camera QR scanning, lab session scheduling, rosters, attendance adjustments, and analytics reports.
  - **Student Portal (`/frontend-student`)**: Mobile-first React 18 + Vite 5 + Tailwind CSS + Recharts + Lucide Icons (Port 5174). Read-only student personal attendance turnout, module progress, attendance history, low attendance advisory alerts, PWA offline app shell. No administrative code, no scanner, no QR badges.

- **Backend (`/backend`)**:
  - Java 21 (Temurin) & Spring Boot 3.3.5
  - Spring Web, Spring Data JPA, Spring Security, Spring Validation
  - Flyway database migration engine (V1..V21 schemas auto-applied on startup)
  - JJWT (JSON Web Token) with HMAC-SHA256 signing and BCrypt password encryption
  - Separate login authentication endpoints (`/api/auth/staff/login` and `/api/auth/student/login`) with non-enumerating generic 401 defense
  - Rate limiting with token bucket per endpoint and IP
  - Apache POI (Excel `.xlsx`), OpenPDF (Vector `.pdf`), and CSV report streaming engines
  - Multi-stage containerization ([Dockerfile](file:///q:/MY%20Projects/Lab%20Attend/backend/Dockerfile)) running on Alpine Linux as a non-root user

- **Database (`Supabase PostgreSQL via JDBC`)**:
  - Normalized relational tables with foreign keys and cascade constraints
  - Relational unique constraint `(session_id, student_id)` preventing concurrent duplicate scans
  - Append-only immutable `attendance_audit_logs` tracking all session finalizations and medical/administrative adjustments
  - `account_activation_tokens` storing cryptographically hashed single-use tokens for student account activation and password resets

---

## Core System Principles (Non-Negotiable)

1. **Three Roles**: Authenticated roles are strictly `ADMIN`, `LECTURER`, and `STUDENT`.
2. **Student Identity Derived Strictly from Token**: In the Student Portal (`/api/student/**`), student identity is derived exclusively from validated JWT claims in Spring Security. No student ID appears in any URL path, query string, or request body, completely preventing Insecure Direct Object References (IDOR).
3. **Login Endpoint Separation**:
   - `POST /api/auth/staff/login`: Exclusively for `ADMIN` and `LECTURER`.
   - `POST /api/auth/student/login`: Exclusively for `STUDENT`.
   - Mismatched credentials belong to the wrong portal return the same generic 401 error as an incorrect password: `"Email or password is incorrect."`
   - Neither frontend portal site links to the other site's login page.
4. **Admin QR Generation & Bulk Export**: The `ADMIN` can generate opaque cryptographic student QR tokens, preview/download individual student QR badges (PNG), and bulk export QR codes by batch or lab group (ZIP archive and printable A4 sticker PDF). `LECTURER` retains a scanner-only role and cannot generate or download QR tokens. Students have no access to QR tokens.
5. **Zero-Trust Client**: Roles and authorizations are derived exclusively from verified JWT claims in Spring Boot. Roles sent from the client are never trusted.
6. **Session Finalization Rules**: Unmarked students are never prematurely marked absent during active sessions. Absent records are calculated and committed only upon explicit session closure by the lecturer.
7. **Lab Groups & Cross-Group Attendance**: Batches can be partitioned into physical lab groups. Sessions target either a whole batch or a specific lab group. Students in the same batch attending another group's session are accepted and audited as cross-group visitors without distorting regular attendance percentages or home-group expected rosters.
8. **Student Portal Read-Only Integrity**: The student portal cannot mark attendance, mutate lab sessions, modify rosters, or access other students' records. Only `FINALIZED` sessions count in statistics; `ACTIVE` sessions are never shown as absences, and `CANCELLED` sessions are excluded.
9. **No Hardcoded Secrets**: All database connection URLs, credentials, and cryptographic keys (`JWT_SECRET`, `QR_HMAC_SECRET`) are injected exclusively via environment variables.

---

## Quick Start: Local Setup & Running

### Prerequisites
- **Java**: OpenJDK 17 or 21 (`java -version`)
- **Maven**: 3.8+ (`mvn -version`)
- **Node.js**: 18+ or 20+ & npm (`node -v`, `npm -v`)
- **PostgreSQL**: Local PostgreSQL 15+ or a free [Supabase](https://supabase.com) project

---

### 1. Database Setup
Create a PostgreSQL database (e.g. `labattend_db`) or spin up a new Supabase project.

---

### 2. Backend Setup & Run

```bash
cd backend

# 1. Create environment configuration from template
cp .env.example .env

# 2. Configure environment variables in .env (or export them):
#    SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/labattend_db
#    SPRING_DATASOURCE_USERNAME=postgres
#    SPRING_DATASOURCE_PASSWORD=postgres
#    JWT_SECRET=404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970
#    QR_HMAC_SECRET=c7b9e1a84f30d25e89a1c6b5d4e3f2a1087654321fedcba0123456789abcdef0
#    CORS_ALLOWED_ORIGINS=http://localhost:5173

# 3. Build and launch Spring Boot
mvn clean spring-boot:run
```

The backend starts on `http://localhost:8080`.
- Flyway automatically runs database migrations on startup.
- If the database is empty, the first administrator account is bootstrapped automatically:
  - **Email**: `admin@labattend.local`
  - **Password**: `Admin@123456`
- System health status is available at: `http://localhost:8080/api/health`.

---

### 3. Frontend Setup & Run (Staff & Student Portals)

LabAttend has two separate frontend portals:
1. **Staff Portal (`/frontend-staff`)**: Admin and Lecturer dashboard, scanner, rosters, reports (`http://localhost:5173`).
2. **Student Portal (`/frontend-student`)**: Read-only student attendance dashboard, module breakdown, history (`http://localhost:5174`).

#### Running the Staff Portal (Port 5173)
```bash
cd frontend-staff
cp .env.example .env
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

#### Running the Student Portal (Port 5174)
```bash
cd frontend-student
cp .env.example .env
npm install
npm run dev
```
Open `http://localhost:5174` in your browser.

---

## Automated Test Suites (264 Tests Total — 100% Passing)

### Backend Tests (200 Tests, JUnit 5 + Spring Boot Test)
```bash
cd backend
mvn clean test
```

### Staff Frontend Tests (51 Tests, Vitest)
```bash
cd frontend-staff
npm test
```

### Student Frontend Tests (13 Tests, Vitest)
```bash
cd frontend-student
npm test
```

### Running All Frontend & Backend Verification in One Command
```bash
# Root npm scripts
npm run test:staff    # Run staff portal vitest suite (51 tests)
npm run test:student  # Run student portal vitest suite (13 tests)
npm run build:staff   # Compile staff portal production bundle
npm run build:student # Compile student portal production bundle
```

---

## Production Deployment

Detailed, step-by-step instructions for deploying to cloud hosts are available in [docs/DEPLOYMENT.md](file:///q:/MY%20Projects/Lab%20Attend/docs/DEPLOYMENT.md).

### Summary:
1. **Backend**:
   - Host on **Render**, **Railway**, or **Fly.io** using [backend/Dockerfile](file:///q:/MY%20Projects/Lab%20Attend/backend/Dockerfile).
   - Set `SPRING_PROFILES_ACTIVE=prod`.
   - Connect to Supabase using the **Session Mode Pooler** (`aws-0-<region>.pooler.supabase.com:5432`) or Transaction Mode Pooler (`:6543?sslmode=require&prepareThreshold=0`).
   - Configure health check at `/api/health`.
2. **Frontend**:
   - Host on **Vercel** or **Netlify** pointing root directory to `frontend`.
   - Set environment variable `VITE_API_BASE_URL=https://<your-backend-domain>/api`.
   - Single-Page Application (SPA) routing is pre-configured via `vercel.json` and `public/_redirects`.

---

## Progressive Web App (PWA): Install on Your Phone

LabAttend is a certified Progressive Web App (PWA) with native-like mobile execution, responsive camera layout, and offline app shell caching.

### How to Install
- **Android (Chrome / Edge)**: Visit the deployed HTTPS site. Tap the **"Install LabAttend"** prompt banner at the bottom or open browser menu (`⋮`) -> **"Install app"** / **"Add to Home screen"**.
- **iPhone & iPad (Safari)**: Open the site in Safari, tap the **Share** button (`[↑]`) -> scroll down and tap **"Add to Home Screen"** -> tap **Add**.
- **Desktop (Chrome / Edge)**: Click the **Install** icon in the browser address bar omnibar or select **"Install LabAttend"** from the user menu.

### Troubleshooting
- **Camera Blocked**: In Android Chrome, tap the lock/tune icon left of the address bar -> Permissions -> Camera -> Allow. In iOS Safari, open Settings -> Safari -> Camera -> Allow, or tap `aA` in the URL bar -> Website Settings -> Camera -> Allow.
- **Old Version Cached**: When a new version deploys, tap **"Refresh Now"** on the update prompt toast. To force-clear, unregister the service worker in Chrome DevTools -> Application -> Service Workers.
- **Install Button Not Showing**: The install button is hidden if already running in standalone mode or served over insecure HTTP. iOS Safari does not support `beforeinstallprompt` (use Share -> Add to Home Screen).

---

## Post-Deployment Verification Checklist

Execute this checklist immediately after deploying to your live production URLs:

- [ ] **1. HTTPS Validation**: Both frontend and backend URLs load over valid SSL/TLS certificates with zero mixed content errors.
- [ ] **2. Health Check**: `GET https://<backend-url>/api/health` returns `200 OK` with `"status": "UP"` and `"database": "CONNECTED"`.
- [ ] **3. Flyway Migrations**: Verify all 5 migrations (V1..V5) applied cleanly during backend container startup.
- [ ] **4. Admin Login**: Log in as administrator at `https://<frontend-url>/login`; confirm dashboard metrics and rosters load from PostgreSQL.
- [ ] **5. Lecturer Login & Session**: Log in as lecturer; launch an active lab session.
- [ ] **6. Real Mobile Phone Camera Scan**: Open the active session scanner on a real mobile device (iPhone/Android) over HTTPS; allow camera permissions and scan a student QR badge. Confirm real-time green success card and instant duplicate scan prevention.
- [ ] **7. SPA Deep Link Refresh**: Refresh the browser while on `/admin/dashboard` or `/lecturer/sessions`; verify no 404 Not Found error.
- [ ] **8. Secret Exposure Verification**: Confirm zero secrets or `.env` files are tracked in Git.

---

## License

This project is licensed under the MIT License for institutional use.
