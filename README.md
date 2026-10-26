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

- **Frontend (`/frontend`)**:
  - React 18 + Vite 5 + Tailwind CSS + React Router v6
  - Centralized Axios client with JWT request interceptors and 401 token expiry handling
  - `html5-qrcode` for high-performance webcam and mobile camera QR badge scanning
  - Lucide Icons & Recharts for interactive analytics visualizations
  - Vitest + React Testing Library for component & integration testing
  - Pre-configured SPA client-side routing fallback (`vercel.json`, `netlify.toml`, `public/_redirects`)

- **Backend (`/backend`)**:
  - Java 21 (Temurin) & Spring Boot 3.3.5
  - Spring Web, Spring Data JPA, Spring Security, Spring Validation
  - Flyway database migration engine (V1..V5 schemas auto-applied on startup)
  - JJWT (JSON Web Token) with HMAC-SHA256 signing and BCrypt password encryption
  - Thread-safe token bucket rate limiters protecting authentication (10 req/min) and scan endpoints (120 req/min)
  - Apache POI (Excel `.xlsx`), OpenPDF (Vector `.pdf`), and CSV report streaming engines
  - Multi-stage containerization ([Dockerfile](file:///q:/MY%20Projects/Lab%20Attend/backend/Dockerfile)) running on Alpine Linux as a non-root user

- **Database (`Supabase PostgreSQL via JDBC`)**:
  - 12 normalized relational tables with foreign keys and cascade constraints
  - Relational unique constraint `(session_id, student_id)` preventing concurrent duplicate scans
  - Append-only immutable `attendance_audit_logs` tracking all session finalizations and medical/administrative adjustments

---

## Core System Principles (Non-Negotiable)

1. **Only Two Roles**: Authenticated roles are strictly `ADMIN` and `LECTURER`.
2. **Students Are Records Only**: Students have database profiles only; no student accounts, logins, or mobile student portals.
3. **No QR Generation**: The platform contains no QR generation, badge printing, or export modules. It strictly scans pre-existing student physical badges.
4. **Zero-Trust Client**: Roles and authorizations are derived exclusively from verified JWT claims in Spring Boot. Roles sent from the client are never trusted.
5. **Session Finalization Rules**: Unmarked students are never prematurely marked absent during active sessions. Absent records are calculated and committed only upon explicit session closure by the lecturer.
6. **Historical Data Preservation**: Historical attendance records remain immutable even when course assignments or student batches change.
7. **No Hardcoded Secrets**: All database connection URLs, credentials, and cryptographic keys are injected exclusively via environment variables.

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

### 3. Frontend Setup & Run

```bash
cd frontend

# 1. Create environment configuration
cp .env.example .env

# 2. Install dependencies
npm install

# 3. Launch Vite development server
npm run dev
```

The frontend launches on `http://localhost:5173`. Open your browser and log in with the administrator credentials above.

---

## Automated Test Suites

### Backend Tests (105+ Tests, JUnit 5 + Spring Boot Test)
```bash
cd backend
mvn clean test
```
Verifies authentication, student management, session lifecycle, Section 29 canonical benchmark (40 students, 35 present, 5 absent, 87.5% turnout), multi-threaded concurrent scan deduplication, role escalation defense, cross-lecturer isolation, and rate limiters.

### Frontend Tests (Vitest + React Testing Library)
```bash
cd frontend
npm test
```
Verifies login form validation, protected route guards, role redirection, and camera scanner feedback outcome cards.

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
