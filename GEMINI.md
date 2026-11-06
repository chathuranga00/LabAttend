# LabAttend - Non-Negotiable Project Rules & Architecture Guidelines

> **IMPORTANT**: This file defines the binding architectural constraints, security principles, and development workflows for the **LabAttend** project. Every phase of development MUST adhere to these rules without exception.
> See also [AGENTS.md](file:///q:/MY%20Projects/Lab%20Attend/AGENTS.md).

---

## 1. Technology Stack

### Frontends [Updated 2026-11]
Two separate React SPAs, one per role group:
- **`/frontend-staff`** — Admin & Lecturer portal (renamed from `/frontend`)
- **`/frontend-student`** — Student read-only portal

Both frontends share:
- **Framework & Tooling**: React, Vite, Tailwind CSS
- **Routing**: React Router (v6+)
- **Networking**: Axios (centralized client with JWT interceptors)
- **Visuals & UI**: Lucide Icons, Recharts (analytics & reports)

Staff-only:
- **Scanning**: `html5-qrcode` (webcam/camera QR scanning — staff portal only)

### Backend
- **Platform & Language**: Java 17+, Maven
- **Core Framework**: Spring Boot (Spring Web, Spring Data JPA, Spring Security, Spring Validation)
- **Authentication & Cryptography**: BCrypt password hashing, JJWT / Spring Security JWT
- **Database Migrations**: Flyway

### Database
- **Provider**: Supabase PostgreSQL accessed via JDBC (ONE database, shared by both frontends)
- **Schema Management**: Flyway migration scripts (strict version control in `backend/src/main/resources/db/migration`)

---

## 2. Roles & Permissions (Zero Trust Client) [Updated 2026-11]

- **Three Roles**:
  - `ADMIN`: Institution/department admin managing courses, student rosters, lab groups, lecturer assignments, global audits, generating student QR tokens, viewing/downloading individual student QR codes (PNG), bulk downloading QR codes by batch or lab group, and managing student portal accounts (activation).
  - `LECTURER`: Lab instructor conducting sessions, scanning student badges/QR codes, reviewing scanned student details (name, ID, group) for visual confirmation, accepting cross-group attendance for students in the same batch, adjusting session attendance, and finalizing rosters. Lecturers CANNOT generate or download QR codes.
  - `STUDENT`: Read-only portal user. Can view ONLY their own profile, overall attendance counts and percentage, per-module attendance, and attendance history (FINALIZED sessions only). CANNOT mark attendance, view other students, view audit logs, correction reasons, justification notes, or their own QR token.

- **Students (portal login) [Updated 2026-11]**:
  - Student accounts are **created by the ADMIN**. Activation uses a one-time, expiring link to the student's university email.
  - Passwords are BCrypt hashed.
  - Students log in at `POST /api/auth/student/login` only.
  - **Backend always derives student identity from the JWT token.** No `/api/student/**` endpoint accepts a student ID as a URL path variable or query parameter — this prevents horizontal privilege escalation.

- **Login Endpoint Separation [Updated 2026-11]**:
  - `POST /api/auth/staff/login` — ADMIN and LECTURER only.
  - `POST /api/auth/student/login` — STUDENT only.
  - If valid credentials belong to the **wrong role for the endpoint**, return the same generic error as a wrong password: `"Email or password is incorrect."` Never reveal which role the account has.
  - Neither portal site links to the other site's login page.

- **Role Verification**:
  - **NEVER trust a role sent from any React frontend.**
  - All role authorization (`hasRole('ADMIN')`, `hasRole('LECTURER')`, `hasRole('STUDENT')`) is derived exclusively from validated JWT claims in Spring Boot Security filters.

- **Security Authority**:
  - All security checks, authorization rules, and data validation MUST occur in Spring Boot.
  - Frontend route guards and conditional UI rendering are for user experience only, never for security enforcement.
  - Spring Security enforces:
    - `STUDENT` tokens → **403** on `/api/admin/**` and `/api/lecturer/**`
    - `ADMIN` / `LECTURER` tokens → **403** on `/api/student/**`

---

## 3. QR Architecture & Scope [Updated 2026-10]

- **Admin QR Generation & Download Permitted**:
  - The `ADMIN` can generate each student's QR code from the student record, view it, download it as a PNG image, and bulk download QR codes as a ZIP file partitioned by batch or lab group.
  - `LECTURER` has scanner-only capabilities and is strictly forbidden from generating or downloading QR codes.
  - Students CANNOT view or access their own QR token through the student portal.
- **QR Token Security & Privacy Constraints**:
  - The QR content must be an **opaque, unpredictable token** (e.g., cryptographically secure high-entropy UUID or random token) that maps to exactly one student.
  - The QR payload must **NEVER contain personal data** (no plain names, student IDs, emails, NICs, or PII).
  - A scanned QR must resolve to exactly one student, and the backend must cryptographically verify that the token belongs to that student.
  - Student portal response DTOs must **NEVER include** `qr_token`, `qr_token_hash`, or `qr_generated_at`.
- **Scanner Flow & Visual Confirmation**:
  - The system utilizes `html5-qrcode` in the **staff frontend** strictly for webcam/camera scanning during active sessions.
  - The lecturer UI must display the student's **name, student ID, and lab group** immediately after each scan for real-time visual confirmation.

---

## 4. Lab Groups & Attendance Rules [Updated 2026-10]

- **Lab Groups Structure**:
  - A batch can be divided into lab groups (e.g., Group A, Group B, Group C).
  - Each student belongs to one lab group within their batch (nullable for batches without groups).
  - A lab session can be scheduled for the whole batch OR for one specific lab group.
  - Different lecturers can be assigned to different groups of the same module and batch.
- **Cross-Group Attendance**:
  - A student from the same batch but a different lab group MAY be marked present in another group's session.
  - Such attendance must be clearly flagged (`is_cross_group = true` / "Cross-Group") and visible in the lecturer UI, session summary, analytics, and every report/export.
  - Students from a different batch, or not enrolled in the batch, are strictly rejected.
- **Session Attendance Finalization**:
  - **Do NOT auto-mark students absent before session finalization.**
  - During an active session, unmarked students remain in an unrecorded / pending state.
  - Absent status is computed and recorded **only upon explicit session closure/finalization by the lecturer**.
- **Historical Attendance Preservation**:
  - When student records, rosters, lab groups, or course enrollments change, **historical attendance records must remain strictly immutable and preserved**.
  - Any manual corrections to finalized sessions require justification reasons and immutable audit log entries.
- **Student Portal Session Filtering [Updated 2026-11]**:
  - Only `FINALIZED` sessions count in student-facing statistics and history.
  - `CANCELLED` sessions are excluded entirely.
  - `ACTIVE` sessions are never shown as absences in the student portal.

---

## 5. API & Backend Architecture Best Practices [Updated 2026-11]

- **DTO Encapsulation**:
  - **Always use Data Transfer Objects (DTOs)** for request payloads and response bodies.
  - **NEVER expose JPA entities** directly in controller endpoints or responses.
  - Student-facing DTOs must **exclude**: `qr_token`, `qr_token_hash`, `qr_generated_at`, `justification_notes`, `corrected_by`, `previous_status`, `is_corrected`, and all other students' personal data.
- **Student Identity from JWT Only [Updated 2026-11]**:
  - Every `/api/student/**` service method resolves the calling student from `SecurityContextHolder` only.
  - No student ID, UUID, matriculation number, or any other student identifier may be accepted as a URL path variable or request parameter in `/api/student/**` endpoints.
- **No Student Attendance Mutation [Updated 2026-11]**:
  - There must be **no endpoint under `/api/student/**`** that creates, updates, or deletes attendance records, QR tokens, or any system state.
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
