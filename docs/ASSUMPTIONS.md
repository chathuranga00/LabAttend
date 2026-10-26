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

---

## 5. Authentication Token Transport Decision & Security Trade-Offs

### Architectural Decision: Authorization Header (`Bearer <token>`)
For **LabAttend**, we employ the standard `Authorization: Bearer <jwt_token>` header transmitted with every authenticated Axios request, returned in the JSON payload of `POST /api/auth/login`.

### Security Trade-Off Analysis

1. **Authorization Header vs HttpOnly Cookies**:
   - **Cross-Site Request Forgery (CSRF)**:
     - *HttpOnly Cookies*: Vulnerable to CSRF attacks by default because browsers automatically attach cookies on cross-origin requests. Mitigating this requires CSRF tokens (SameSite=Strict, double-submit cookie, or Spring Security CSRF synchronizer token).
     - *Authorization Header*: Completely immune to standard CSRF attacks because browsers NEVER automatically attach custom `Authorization` request headers on cross-site requests or embedded links/forms. This allows a clean, stateless REST API architecture without CSRF token overhead.
   - **Cross-Site Scripting (XSS)**:
     - *HttpOnly Cookies*: Protects tokens from direct JavaScript `document.cookie` reading in the event of an XSS vulnerability.
     - *Authorization Header*: If stored in `localStorage`, a severe XSS vulnerability could allow reading the token. We mitigate this through:
       1. Strict React JSX escaping (default XSS prevention).
       2. Strict Content Security Policy (CSP) and CORS configuration restricted strictly to the authorized frontend domain (`http://localhost:5173` in development, institutional domain in production).
       3. Short token lifespan (`JWT_EXPIRATION_MS`, default 24h or configurable shorter sessions) with backend invalidation on role changes.
   - **Cross-Origin & Multi-Host Architecture**:
     - Modern deployments often separate the React client (e.g. Vercel, Netlify, or AWS S3/CloudFront) from the Spring Boot API (e.g. AWS EC2, Render, Railway, or institutional VM). Cookie management across different top-level domains or subdomains requires complex `SameSite=None; Secure` flags and third-party cookie permissions (which modern browsers increasingly partition or block).
     - The Authorization header works friction-free across decoupled cross-domain SPA/API environments while maintaining strict CORS boundaries.

