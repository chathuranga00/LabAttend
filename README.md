# LabAttend

**LabAttend** is a laboratory and lecture attendance management platform designed for universities and academic institutions. It provides a secure, role-restricted environment for lecturers to conduct sessions and scan student credentials while giving administrators institutional oversight.

---

## Architecture Overview

- **Frontend (`/frontend`)**:
  - React + Vite + Tailwind CSS + React Router
  - Axios for centralized API integration with JWT bearer authorization
  - Recharts for analytics and visual reporting
  - Lucide React for consistent iconography
  - `html5-qrcode` for webcam/device camera student badge scanning
- **Backend (`/backend`)**:
  - Java 17+ & Spring Boot
  - Spring Web, Spring Data JPA, Spring Security, Spring Validation
  - Maven build tool
  - BCrypt password hashing & JWT token generation / validation
  - Data Transfer Object (DTO) pattern for request/response contracts
- **Database (`/backend/src/main/resources/db/migration`)**:
  - Supabase PostgreSQL accessed via JDBC
  - Flyway migrations for schema management and version control
- **Documentation (`/docs`)**:
  - Architecture specifications, database ERDs, and API documentation

---

## Core System Principles

1. **Strict Roles**: Only two authenticated roles exist: `ADMIN` and `LECTURER`.
2. **Students Are Records Only**: Students do not possess user accounts, passwords, or logins.
3. **No QR Generation**: The platform contains no QR code generation, sticker management, or printing features; it strictly scans pre-existing student badges.
4. **Zero-Trust Client**: All authentication, role authorization, and validation rules are enforced exclusively in Spring Boot. Roles received from the frontend are never trusted.
5. **Session Attendance Finalization**: Unmarked students are not prematurely marked absent. Absentee records are calculated and committed only when the lecturer explicitly closes/finalizes a session.
6. **Data Immutability**: Historical attendance records remain immutable even when student rosters or profiles are modified.
7. **No Secrets in Code**: All sensitive credentials, database connection strings, and keys are provided via environment variables.

---

## Setup & Installation (Placeholder)

> *Detailed setup instructions will be updated as each implementation phase completes.*

### Prerequisites
- Java 17 or higher
- Apache Maven 3.8+
- Node.js 18+ & npm
- A Supabase PostgreSQL database instance

### Backend Setup
```bash
cd backend
# 1. Copy the environment template
cp .env.example .env
# 2. Configure database credentials and JWT secret in .env
# 3. Build and run Spring Boot
mvn clean spring-boot:run
```

### Frontend Setup
```bash
cd frontend
# 1. Copy the environment template
cp .env.example .env
# 2. Install dependencies
npm install
# 3. Run development server
npm run dev
```

---

## Development Phases

- [x] **Phase 0: Project Initialization & Architectural Rules**
- [ ] **Phase 1: Database Schema & Flyway Migrations**
- [ ] **Phase 2: Spring Boot Backend Foundation & Security (JWT, DTOs, Auditing)**
- [ ] **Phase 3: Core API Services (Course, Roster, Session, Attendance)**
- [ ] **Phase 4: Frontend Application Foundation (Vite, Tailwind, Auth & Routing)**
- [ ] **Phase 5: Lecturer Session & QR Scanning (`html5-qrcode`) Flow**
- [ ] **Phase 6: Admin Dashboard & Reports (Recharts)**
- [ ] **Phase 7: End-to-End Verification & Final Review**
