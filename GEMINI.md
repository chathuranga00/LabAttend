# LabAttend - Non-Negotiable Project Rules & Architecture Guidelines

> **IMPORTANT**: This file defines the binding architectural constraints, security principles, and development workflows for the **LabAttend** project. Every phase of development MUST adhere to these rules without exception.
> See also [AGENTS.md](file:///q:/MY%20Projects/Lab%20Attend/AGENTS.md).

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

## 2. Roles & Permissions (Zero Trust Client) [Updated 2026-10]

- **Only Two Roles**:
  - `ADMIN`: Institution/department admin managing courses, student rosters, lab groups, lecturer assignments, global audits, generating student QR tokens, viewing/downloading individual student QR codes (PNG), and bulk downloading QR codes by batch or lab group.
  - `LECTURER`: Lab instructor conducting sessions, scanning student badges/QR codes, reviewing scanned student details (name, ID, group) for visual confirmation, accepting cross-group attendance for students in the same batch, adjusting session attendance, and finalizing rosters. Lecturers CANNOT generate or download QR codes.
- **Students**:
  - Students are **database records only**.
  - **No student logins, no student accounts, no student mobile apps or portals, and no self-marking of attendance.**
- **Role Verification**:
  - **NEVER trust a role sent from the React frontend.**
  - All role authorization (`hasRole('ADMIN')`, `hasRole('LECTURER')`) is derived exclusively from validated JWT claims in Spring Boot Security filters.
- **Security Authority**:
  - All security checks, authorization rules, and data validation MUST occur in Spring Boot.
  - Frontend route guards and conditional UI rendering are for user experience only, never for security enforcement.

---

## 3. QR Architecture & Scope [Updated 2026-10]

- **Admin QR Generation & Download Permitted**:
  - The `ADMIN` can generate each student's QR code from the student record, view it, download it as a PNG image, and bulk download QR codes as a ZIP file partitioned by batch or lab group.
  - `LECTURER` has scanner-only capabilities and is strictly forbidden from generating or downloading QR codes.
  - Students have no login and cannot view or generate QR codes.
- **QR Token Security & Privacy Constraints**:
  - The QR content must be an **opaque, unpredictable token** (e.g., cryptographically secure high-entropy UUID or random token) that maps to exactly one student.
  - The QR payload must **NEVER contain personal data** (no plain names, student IDs, emails, NICs, or PII).
  - A scanned QR must resolve to exactly one student, and the backend must cryptographically verify that the token belongs to that student.
- **Scanner Flow & Visual Confirmation**:
  - The system utilizes `html5-qrcode` in the frontend strictly for webcam/camera scanning during active sessions.
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
