# LabAttend - Phase 1 Assumptions & Design Rationale

This document records the foundational architectural decisions and technical assumptions established during Phase 1.

---

## 1. Student Identification & QR Token Resolution

### Context & Constraint
- The **LabAttend** system enforces a strict scanner-only model: **NO QR generation, batch exporting, downloading, or printing** exists within the system.
- Lecturers utilize their web browser / device camera via `html5-qrcode` to scan student identification badges presented during laboratory sessions.
- In university environments (e.g. NSBM / similar institutions), student badges are either:
  1. Pre-printed with standard barcodes/QR codes containing the student's unique academic matriculation number (e.g. `IT21001234`).
  2. Pre-printed with an institutionally issued cryptographic badge serial / opaque hash.

### Architectural Decision
- In the `students` table, we provide two lookup mechanisms:
  1. **`student_id` (VARCHAR(50), UNIQUE)**: The primary university-issued academic index/student ID. When standard institutional badges embed the direct student identifier in the QR payload, the system resolves the student in O(1) time via this unique indexed column.
  2. **`qr_token_hash` (VARCHAR(64), UNIQUE, NULLABLE)**: A SHA-256 hashed token representation. When institutional badges employ cryptographically obfuscated or serialized badge IDs, this column stores the SHA-256 digest of the badge payload.
- **Security & Integrity Benefit**:
  - Scanning logic resolves via `qr_token_hash` first (if non-null); if no match is found, it falls back to exact matching on `student_id`.
  - Raw unhashed tokens are never persisted in plain text if an opaque token scheme is used.
  - No mobile app or student portal exists; students cannot alter or tamper with these records.

---

## 2. Attendance State Finalization & Immutability

### Finalization Semantics
- Prior to session closure, unmarked students are **never** auto-marked as absent.
- The `attendance_records` table only contains records explicitly generated:
  - During the session via `QR_SCAN` (marked as `PRESENT` or `LATE`).
  - Or upon session closure (`CLOSED`), where the backend finalization transaction identifies all enrolled `session_students` without an attendance record and bulk-inserts them with `status = 'ABSENT'` and `method = 'MANUAL'`.
- A database-level unique constraint `UNIQUE(session_id, student_id)` on both `session_students` and `attendance_records` mathematically guarantees that duplicate attendance records cannot be created for a single student in a session.

---

## 3. Database Migration Strategy (Flyway)

- All schema definitions are strictly version-controlled in `backend/src/main/resources/db/migration/V1__initial_schema.sql`.
- Hibernate DDL auto-generation is locked to `validate` (`spring.jpa.hibernate.ddl-auto=validate`) across all profiles.
- Automatic creation or alteration of tables by JPA/Hibernate is forbidden.

---

## 4. Zero Trust Authorization Boundary

- The React frontend manages token persistence in browser memory/storage for user convenience only.
- Spring Boot's `SecurityFilterChain` independently verifies the HMAC-SHA256 signature and extracts the `role` (`ADMIN` or `LECTURER`) from the validated JWT claims on every HTTP request.
- Frontend request bodies or headers specifying user roles are ignored and rejected.
