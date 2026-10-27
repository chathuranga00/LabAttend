# LabAttend - Phase 1 Assumptions & Design Rationale

This document records the foundational architectural decisions and technical assumptions established during Phase 1.

---

## 1. Student Identification, Admin QR Generation & Cryptographic Token Architecture [Updated 2026-10 - Step 13]

### Context & Constraint Shift
- Originally, the system assumed a strict scanner-only model where physical cards were issued externally and no QR generation occurred in-app.
- **Updated Requirement (Step 13)**: The institution requires the `ADMIN` to generate, view, download (individual PNG & print-ready sticker), regenerate, and bulk-download (ZIP of PNGs and printable 3x8 PDF sticker sheet by batch or lab group) student QR codes directly from student records.
- Lecturers retain a **scanner-only** role and are strictly prohibited from generating, downloading, or regenerating QR codes (enforced with HTTP 403 Forbidden).
- Students have **no login accounts**, no student portal, and cannot view, generate, or mark their own attendance.

### Cryptographic Token Design & Zero-PII Security Model
- **Token Generation Formula**:
  - Each student is issued an opaque, high-entropy cryptographic token derived via HMAC-SHA256:
    $$\text{token} = \text{Base64URL}(\text{HMAC-SHA256}(K_{\text{server}}, \text{student\_uuid} + \text{":"} + \text{qr\_version}))$$
  - Base64URL encoding is unpadded (~43 characters), making it compact and optimal for QR code density and high-speed optical scanning.
  - The server key $K_{\text{server}}$ (`QR_HMAC_SECRET`) is strictly injected via environment variables and never stored in source code.
- **Strict Zero Personal Data (PII) in QR**:
  - The QR code payload encodes **ONLY the opaque token**.
  - It contains **zero PII** (no student ID, no student name, no batch name, no email, no national identity number).
  - Anyone scanning the raw QR code with a commercial phone camera sees only an unreadable cryptographic hash string that cannot be reverse-engineered or spoofed without the server secret.
- **Database Tracking & Indexed Lookup**:
  - Schema additions in `students` table:
    - `qr_version` (INT NOT NULL DEFAULT 1): Tracks sticker generation lifecycle.
    - `qr_generated_at` (TIMESTAMPTZ): Records generation timestamp.
    - `qr_token_hash` (VARCHAR(64) UNIQUE, indexed with `idx_students_qr_token_hash`): Stores the SHA-256 hash of the generated token.
  - Plaintext tokens do not need to be stored in the database. When a QR is scanned, the backend hashes the incoming token with SHA-256 and performs an indexed $O(1)$ database lookup.
- **Version Invalidation & Token Regeneration**:
  - If a student loses their printed badge sticker, or if a QR code is suspected to be leaked, an Admin can regenerate the student's QR code (`POST /api/admin/students/{id}/qr/regenerate`).
  - Regeneration requires a non-empty `reason` string and increments `qr_version` ($v \to v + 1$).
  - Because the token formula binds $\text{student\_uuid}$ and $\text{qr\_version}$, incrementing the version immediately renders the old token and all physical prints using it **permanently invalid**.
  - Every regeneration event is written to `audit_logs` capturing previous version, new version, actor, and justification reason.
- **Scan Resolution & Verification Workflow**:
  1. The scanner sub-system transmits the scanned string payload to `POST /api/lecturer/sessions/{id}/scan`.
  2. The backend computes the SHA-256 hash of the token and queries `students` by `qr_token_hash`.
  3. If no student matches, or if the student is inactive, the backend immediately halts and returns `"Invalid QR Code — Student Not Found"`.
  4. The backend re-computes the expected HMAC-SHA256 token using the student's UUID and current `qr_version`, then verifies it using constant-time string comparison (`MessageDigest.isEqual`) to protect against timing attacks.
  5. If valid, the resolved student's details (`fullName`, `studentId`, `labGroupName`, `isCrossGroup`) are returned to the lecturer UI for real-time visual confirmation.
  6. Existing historical attendance records remain completely intact and unaffected by QR version changes or regenerations.

### Backend Endpoints (ADMIN Only)
- `GET /api/admin/students/{id}/qr`:
  - Returns a high-resolution PNG image generated via ZXing (`ErrorCorrectionLevel.H`).
  - Supports query parameter `?layout=sticker` (or `?sticker=true`) to return a print-ready sticker canvas (500x660 px) featuring the institutional badge header, centered QR code, full student name, monospace student ID pill, and academic batch/group metadata.
- `POST /api/admin/students/{id}/qr/regenerate`:
  - Requires `{ "reason": "Lost badge" }`. Increments `qr_version`, updates token hash and timestamp, logs audit event, and returns updated student DTO.
- `GET /api/admin/students/qr/bulk?batchId=&groupId=&format=`:
  - Supports exporting a ZIP archive of individual PNGs named `StudentID_Name.png`.
  - Supports exporting a printable PDF sticker sheet formatted for standard A4 paper (3 columns x 8 rows = 24 stickers per page) generated via OpenPDF.
  - Rate limited (30 requests/min) and capped at a maximum of 500 students per request to protect server resources.
- **Zero Trust Security**:
  - Lecturers attempting to access any `/api/admin/students/.../qr*` endpoints are strictly rejected with HTTP 403 Forbidden.

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

---

## 6. Post-Finalization Attendance Corrections & Audit Authority

### Policy and Access Rules
1. **Authorized Actors**:
   - `ADMIN`: Institution/department administrator may correct any attendance record in any finalized session (e.g. for student appeals, official medical leave, administrative audits).
   - `LECTURER`: The assigned lecturer who conducted the session may correct attendance records for their own finalized sessions (e.g. if a student was marked absent due to temporary badge failure, or scanned accidentally). Lecturers cannot modify sessions belonging to other lecturers.
2. **Mandatory Justification Reason**:
   - Every attendance correction requires a non-empty, meaningful reason string (e.g., "Medical certificate verified by department", "Badge defective during session, manually confirmed present").
   - Requests without a reason or with blank whitespace are strictly rejected with HTTP 400.
3. **Immutable Audit Logging**:
   - Every correction is permanently recorded in `audit_logs` with action `ATTENDANCE_CORRECTION`.
   - The log captures the actor ID, student ID, session ID, previous status, new status, and justification reason.
   - The attendance record itself stores `is_corrected = true`, `corrected_at`, `corrected_by`, `previous_status`, and `justification_notes`.
4. **Ordinary Scans Stay Rejected**:
   - Once a session is `FINALIZED`, the QR scan endpoint (`POST /api/lecturer/sessions/{id}/scan`) remains strictly blocked. All subsequent changes must go through the auditable correction workflow.

---

## 7. Lab Groups Architecture & Lecturer Assignment [Updated 2026-10]

### Architectural Decisions
1. **Batch Partitioning into Lab Groups**:
   - Batches (e.g. `Batch 22.1`, `CS-2026-A`) often contain 60–120+ students, exceeding physical lab room computer workstation capacities (typically 30–40 seats).
   - Batches can be divided into named lab groups (e.g. `Group A`, `Group B`, `Group C`) linked via a dedicated `lab_groups` table with a foreign key to `batches`.
2. **Student Membership**:
   - Each student belongs to **at most one** lab group within their batch (`students.lab_group_id` foreign key referencing `lab_groups.id`).
   - For academic cohorts or batches that do not divide into lab groups, `lab_group_id` is nullable.
3. **Session Scoping**:
   - A lab session (`lab_sessions`) can be scheduled for:
     - The **whole batch** (`lab_sessions.lab_group_id IS NULL`), or
     - One **specific lab group** (`lab_sessions.lab_group_id = <group_id>`).
4. **Decoupled Lecturer-Group Assignments**:
   - Different lecturers can be assigned to different groups of the same module and batch.
   - For example, Lecturer X conducts Lab Group A sessions while Lecturer Y conducts Lab Group B sessions for the same module in parallel or at different times.

---

## 8. Cross-Group Attendance Semantics & Visual Confirmation [Updated 2026-10]

### Academic Context & Operational Necessity
- In university environments, students occasionally miss their scheduled lab group due to timetable conflicts, illness, or transport delays and obtain permission to attend an alternate lab group's session within the same academic batch.

### Architectural Decisions & Enforcement Rules
1. **Permitted Cross-Group Check-in**:
   - When a session is scoped to a specific lab group (e.g., Group A), and a student belonging to Group B of the **same batch** scans their QR badge, the system **accepts** the attendance.
   - The attendance record is stored with `status = 'PRESENT'` (or `'LATE'`) and explicitly marked with `is_cross_group = true`.
2. **Strict Batch Boundary**:
   - If a student belonging to a **different batch**, or not enrolled in the batch associated with the session, scans their QR badge, the backend strictly rejects the scan with an error (`403 STUDENT_NOT_IN_BATCH` / "Student does not belong to this academic batch").
3. **Real-Time Visual Confirmation in Lecturer UI**:
   - To prevent proxy badge pass-offs and provide transparency during high-throughput lab entries, the scanner interface must immediately display:
     - Student Full Name
     - Student Identification Number
     - Assigned Lab Group (e.g., `Group B`)
     - An unmistakable **"CROSS-GROUP" alert badge** (e.g. amber/orange badge) if the student belongs to a different group than the session target.
   - This empowers the lecturer to visually corroborate identity and approve cross-group admission on the spot.
4. **Holistic Visibility across Reporting & Analytics**:
   - Cross-group attendance is tracked separately in attendance statistics:
     - Session Summary: Total scanned, regular attendees count, cross-group attendees count.
     - Lecturer & Admin Dashboards: Filterable analytics showing cross-group migration trends.
     - Official Exports (CSV, Excel, PDF): Dedicated column indicating the student's assigned group and a `Cross-Group: Yes/No` status indicator.
