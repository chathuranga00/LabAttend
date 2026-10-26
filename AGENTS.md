# LabAttend - Non-Negotiable Project Rules & Architecture Guidelines

> **IMPORTANT**: This file defines the binding architectural constraints, security principles, and development workflows for the **LabAttend** project. Every phase of development MUST adhere to these rules without exception.

---

## 1. Technology Stack

### Frontend
- **Framework & Tooling**: React, Vite, Tailwind CSS
- **Routing**: React Router (v6+)
- **Networking**: Axios (centralized client with JWT interceptors)
- **Visuals & UI**: Lucide Icons, Recharts (analytics & reports)
- **Scanning**: `html5-qrcode` (webcam/camera QR scanning)

### Backend
- **Platform & Language**: Java 17+, Maven
- **Core Framework**: Spring Boot (Spring Web, Spring Data JPA, Spring Security, Spring Validation)
- **Authentication & Cryptography**: BCrypt password hashing, JJWT / Spring Security JWT
- **Database Migrations**: Flyway

### Database
- **Provider**: Supabase PostgreSQL accessed via JDBC
- **Schema Management**: Flyway migration scripts (strict version control in `backend/src/main/resources/db/migration`)

---

## 2. Roles & Permissions (Zero Trust Client)

- **Only Two Roles**:
  - `ADMIN`: Institution/department admin managing courses, student rosters, lecturer assignments, and global audits.
  - `LECTURER`: Lab instructor conducting sessions, scanning student badges/cards, adjusting session attendance, and finalizing rosters.
- **Students**:
  - Students are **database records only**.
  - **No student logins, no student accounts, no student mobile apps or portals.**
- **Role Verification**:
  - **NEVER trust a role sent from the React frontend.**
  - All role authorization (`hasRole('ADMIN')`, `hasRole('LECTURER')`) is derived exclusively from validated JWT claims in Spring Boot Security filters.
- **Security Authority**:
  - All security checks, authorization rules, and data validation MUST occur in Spring Boot.
  - Frontend route guards and conditional UI rendering are for user experience only, never for security enforcement.

---

## 3. QR Scope & Hard Constraints

- **Strict Scanner Only**:
  - The system utilizes `html5-qrcode` in the frontend strictly for scanning existing student badges / identifiers.
- **Forbidden Features**:
  - **NO QR code generation.**
  - **NO QR printing or export.**
  - **NO QR downloading or batch generation.**
  - **NO sticker or badge management modules.**

---

## 4. Attendance Rules & Data Integrity

- **Session Attendance Finalization**:
  - **Do NOT auto-mark students absent before session finalization.**
  - During an active session, unmarked students remain in an unrecorded / pending state.
  - Absent status is computed and recorded **only upon explicit session closure/finalization by the lecturer**.
- **Historical Attendance Preservation**:
  - When student records, rosters, or course enrollments change, **historical attendance records must remain strictly immutable and preserved**.
  - Any manual corrections to finalized sessions require justification reasons and immutable audit log entries.

---

## 5. API & Backend Architecture Best Practices

- **DTO Encapsulation**:
  - **Always use Data Transfer Objects (DTOs)** for request payloads and response bodies.
  - **NEVER expose JPA entities** directly in controller endpoints or responses.
- **No Mock or Hardcoded Data**:
  - Zero tolerance for fake APIs, mock JSON responses in production code, or hardcoded dashboard metrics.
  - All data must flow from the PostgreSQL database through JPA/Hibernate queries and service business logic.
- **Secrets & Configuration**:
  - **NO secrets, credentials, or keys in source code.**
  - All sensitive parameters (database connection URLs, credentials, JWT secrets) must be injected via environment variables.

---

## 6. Development Workflow & Methodology

- **Phase-Driven Delivery**:
  - Development must proceed in sequential phases.
  - **Stop after each phase for user review and approval before proceeding.**
  - No application code is written until prerequisites and architectural setup are reviewed.
