# LabAttend - Smart Laboratory Attendance System Specification

> **NSBM Green University - Department of Computer Science & Software Engineering**  
> *Authoritative System Specification & Architectural Reference*  
> *Target Architecture*: Spring Boot (Java 17+), React 18+ (Vite, Tailwind CSS), PostgreSQL (Supabase / Flyway)

---

## 1. Project Overview & Scope [Updated 2026-10]

**LabAttend** is an enterprise-grade laboratory attendance tracking and session governance system designed for NSBM Green University. The system streamlines laboratory attendance administration, mitigates proxy attendance, supports flexible lab workstation partitioning into lab groups, and provides authoritative institutional reporting and audits.

### Core Architectural Principles
- **Zero-Trust Role Enforcement**: All authorization boundaries (`ADMIN`, `LECTURER`) are enforced strictly on the Spring Boot backend via cryptographically verified JWT claims. Client-submitted roles are never trusted.
- **Student Database-Record-Only Model**: Students do **not** have login credentials, mobile applications, or self-attendance portals. They exist strictly as authoritative database records.
- **Admin-Controlled QR Badge Generation [Updated 2026-10]**: QR code generation is exclusively managed by the `ADMIN`. Each student receives an individual QR code with an opaque, high-entropy, unpredictable token mapping 1-to-1 to their record, containing **zero personal data (PII)**.
- **Hardware-Free Webcam/Mobile Camera Scanning**: Lecturers utilize `html5-qrcode` within their web browser on any standard laptop, tablet, or smartphone to scan physical or digital student QR badges.
- **Batch & Lab Group Partitioning [Updated 2026-10]**: Academic batches are partitioned into physical lab groups (e.g. Group A, Group B, Group C) to respect lab room capacity limits. Sessions can target an entire batch or a specific lab group.
- **Controlled Cross-Group Attendance [Updated 2026-10]**: Students from the same batch attending an alternate lab group's session are accepted and permanently flagged as `is_cross_group = true`, while students outside the batch are strictly rejected.
- **Definitive Session Finalization**: Unmarked students are **never** auto-marked absent prior to explicit session closure. Absence is computed and recorded atomically upon session finalization.
- **Strict DTO Encapsulation**: JPA entities are never exposed across HTTP controllers. All requests and responses utilize Data Transfer Objects (DTOs).

---

## 2. User Roles & Permissions [Updated 2026-10]

The system defines exactly two authenticated roles:

```
+-----------------------------------------------------------------------------------+
|                                 USER ROLES                                        |
+-----------------------------------------+-----------------------------------------+
|                ADMIN                    |                LECTURER                 |
+-----------------------------------------+-----------------------------------------+
| - Manage Degrees, Batches, Modules      | - View assigned modules & lab groups    |
| - Manage Lab Groups (Create/Edit)       | - Schedule & manage lab sessions        |
| - Student Roster Management & CSV Import| - Conduct sessions & scan QR badges     |
| - Generate & Regenerate Student QR Tokens| - Real-time visual scan confirmation   |
| - View & Download Single QR (PNG)       | - Accept cross-group attendance (batch) |
| - Bulk Download QRs (ZIP by batch/group)| - Submit justified attendance corrections|
| - Assign Lecturers to Modules & Groups  | - Finalize sessions (absentee compute)  |
| - Full System Analytics & Global Audits | - View & export session attendance reports|
| - Global Attendance Adjustments (Audit) | - CANNOT generate or download QR codes  |
+-----------------------------------------+-----------------------------------------+
| STUDENTS: Database records only. No login accounts. No self-marking.              |
+-----------------------------------------------------------------------------------+
```

### 1. `ADMIN` (Institutional Administrator) [Updated 2026-10]
- Manage academic structure: faculties, degree programmes, academic years, batches, and modules.
- Divide batches into lab groups (e.g., Group A, Group B, Group C) and manage student group enrollments.
- Student roster management: create, update, deactivate students, and import rosters via CSV.
- **QR Code Management**:
  - Generate and regenerate individual student QR code tokens.
  - View rendered QR codes in the admin interface.
  - Download individual student QR codes as high-resolution PNG images.
  - Bulk download QR codes as a structured ZIP archive filtered by Academic Batch or specific Lab Group.
- Assign lecturers to modules and optionally scope assignments to specific lab groups.
- Perform audited attendance corrections across all finalized sessions with mandatory justification logging.
- Access institutional attendance analytics, audit ledgers, and university-wide exports.

### 2. `LECTURER` (Lab Instructor) [Updated 2026-10]
- Access only modules and lab groups assigned by the administrator.
- Create and schedule laboratory sessions (scoped to the entire batch OR a specific lab group).
- Open active attendance sessions and conduct live scanning using `html5-qrcode` webcam/camera input.
- **Real-Time Visual Confirmation**: View student photo/avatar, full name, student ID, and lab group immediately after each scan.
- **Cross-Group Ingestion**: System accepts same-batch cross-group scans with a visible "Cross-Group" alert badge.
- Manually toggle attendance status or add remarks prior to session finalization.
- Finalize sessions (atomically computes absentees and locks ordinary scanner access).
- Perform justified post-finalization attendance corrections on own sessions (audited).
- View session analytics and export official attendance reports (CSV, Excel/XLSX, PDF).
- **Hard Restriction**: Lecturers **cannot** generate, view, export, or download student QR codes.

### 3. `STUDENT` (Database Record Only) [Updated 2026-10]
- Students have **no login accounts**, no passwords, no web dashboards, and no mobile applications.
- Students present their physical ID card or university badge featuring their administrator-issued QR code.
- Students cannot mark their own attendance or alter any system state.

---

## 3. Technology Stack & Monorepo Architecture [Updated 2026-10]

```
Lab Attend Workspace
├── backend/                             # Spring Boot 3.x / Java 17+ Enterprise REST API
│   ├── src/main/java/com/attendx/
│   │   ├── config/                      # SecurityFilterChain, JWT, CORS, Flyway config
│   │   ├── controller/                  # REST Controllers (Admin, Lecturer, Auth, Reports)
│   │   ├── dto/                         # Request & Response Data Transfer Objects
│   │   ├── entity/                      # JPA Hibernate Entities
│   │   ├── repository/                  # Spring Data JPA Repositories
│   │   ├── security/                    # JwtTokenProvider, UserPrincipal, AuthFilters
│   │   └── service/                     # Business Logic, QR Service, Attendance Service
│   └── src/main/resources/
│       ├── application.yml              # Profile configs & env var interpolation
│       └── db/migration/                # Version-controlled Flyway SQL scripts
├── frontend/                            # React 18+ Single Page Application (Vite)
│   ├── src/
│   │   ├── assets/                      # Brand assets (NSBM Green University Town logo)
│   │   ├── components/                  # Layouts, ThemeToggle, ScannerModal, Modals
│   │   ├── context/                     # AuthContext, ThemeContext (light/dark mode)
│   │   ├── pages/
│   │   │   ├── admin/                   # Dashboard, Batches, Groups, Students, Modules, Audits
│   │   │   ├── lecturer/                # Dashboard, Sessions, Scanner, Roster, Reports
│   │   │   └── LoginPage.jsx            # Unified login portal
│   │   └── services/                    # Centralized Axios API clients with JWT interceptor
│   └── package.json
└── docs/                                # Authoritative documentation & architecture records
    ├── PROJECT_SPEC.md                  # This specification document
    └── ASSUMPTIONS.md                   # Architectural decisions & design rationale
```

---

## 4. Student Management & Lab Group Structure [Updated 2026-10]

### Academic Batch & Lab Group Hierarchy
1. **Academic Batch**: A cohort of students enrolled in a degree programme for a specific intake year (e.g. `Batch 22.1`, `CS-2026-A`).
2. **Lab Groups**:
   - To match laboratory workstation capacities (typically 30–40 seats), a batch can be divided into named lab groups (e.g., `Group A`, `Group B`, `Group C`).
   - A batch with small enrollment does not require lab groups; `lab_group_id` remains `NULL`.
3. **Student Assignment**:
   - Each student is assigned to exactly one academic batch.
   - Within that batch, the student may be assigned to one lab group (`students.lab_group_id` foreign key referencing `lab_groups.id`).
   - The Administrator can reassign students between lab groups or batches. Reassignments never alter or invalidate historical attendance records.

### Admin Student Operations [Updated 2026-10]
- **Individual Student Registration**: Admin enters student matriculation ID (e.g. `NSBM2026001`), full name, university email, academic batch, and optional lab group.
- **CSV Batch Import**: Bulk import student rosters via CSV containing `student_id, full_name, email, batch_code, lab_group_name`.
- **QR Generation from Student Record**:
  - The Admin can click "Generate QR" on any student record.
  - The system generates an opaque cryptographic token, hashes it, stores it, and renders the QR code.
  - Admin can view the QR code in an interactive modal and click "Download PNG" (`<student_id>_QR.png`).
- **Bulk QR Download**:
  - Admin can select an entire batch or filter by a specific lab group and trigger "Bulk Download QRs".
  - The backend packages individual QR PNG images into a ZIP file with standardized filenames.

---

## 5. QR Code Architecture & Token Security [Updated 2026-10]

```
+-----------------------------------------------------------------------------------+
|                        QR CODE ARCHITECTURE & SECURITY                            |
+-----------------------------------------------------------------------------------+
| [Admin Generates Token]                                                           |
|       │                                                                           |
|       ▼                                                                           |
| 1. High-Entropy Opaque Token: "e5f2a1b9-8c3d-4e7f-b0a1-9c8d7e6f5a4b" (Zero PII)   |
| 2. SHA-256 Digest Computed:   SHA256(token) -> "a8b7...6f4e"                      |
| 3. Persisted in DB:           students.qr_token = token, qr_token_hash = digest   |
| 4. QR Image Rendered (PNG):   Contains ONLY the raw opaque token string           |
|                                                                                   |
| [Lecturer Scans Student Badge via html5-qrcode]                                   |
|       │                                                                           |
|       ▼                                                                           |
| Scanner submits: POST /api/lecturer/sessions/{id}/scan { qr_token: "e5f2a1b9..." }|
|       │                                                                           |
|       ▼                                                                           |
| Backend verifies token -> Resolves to EXACTLY ONE student record                  |
| Checks: Session Active? Student in same batch? Cross-group? Already marked?       |
|       │                                                                           |
|       ▼                                                                           |
| Response returns: { student_name, student_id, student_group, is_cross_group }      |
| Lecturer UI displays visual confirmation card immediately                         |
+-----------------------------------------------------------------------------------+
```

### Security & Privacy Constraints
1. **Opaque & Unpredictable**: Tokens are generated using `java.security.SecureRandom` or high-entropy UUIDv4. They are mathematically impossible to guess, predict, or brute-force.
2. **Zero Personal Data (PII)**: The QR payload **never** contains student names, student IDs, email addresses, or degree details. An eavesdropper scanning the QR badge obtains only an unindexed random hex/UUID string.
3. **1-to-1 Mapping Guarantee**: The database enforces `UNIQUE` constraints on `students.qr_token` and `students.qr_token_hash`. Exactly one student resolves from a valid token.
4. **Revocation & Regeneration**: If a student misplaces their physical badge, the Admin can regenerate the student's QR token. The old token is immediately invalidated and can no longer be used.

---

## 6. Session Creation & Lecturer Assignments [Updated 2026-10]

### Session Scoping
When a lecturer creates a lab session for an assigned module, they specify:
- **Module**: The academic module (e.g. `SE301 - Distributed Systems`).
- **Batch**: The target academic batch (e.g. `Batch 22.1`).
- **Target Audience Scope [Updated 2026-10]**:
  - **Whole Batch**: All students in the batch are eligible (`lab_sessions.lab_group_id IS NULL`).
  - **Specific Lab Group**: Only students belonging to the chosen group are expected (`lab_sessions.lab_group_id = <group_id>`), though cross-group attendance is permitted with flagging.
- **Date, Start Time, and End Time**.
- **Laboratory Room / Venue**: Physical room name (e.g. `Lab 04 - Software Engineering`).

### Decoupled Lecturer-Group Assignments [Updated 2026-10]
- Multiple lecturers can be assigned to the same module and batch, partitioned by lab group:
  - Lecturer A is assigned to `Group A`.
  - Lecturer B is assigned to `Group B`.
- This reflects realistic university operations where different lab instructors manage parallel lab cohorts.

---

## 7. Scanning Flow, Student Matching & Visual Confirmation [Updated 2026-10]

### Step-by-Step Attendance Scanning Pipeline
```
[Student Presents QR Badge]
           │
           ▼
[Lecturer Camera (html5-qrcode) Captures Token]
           │
           ▼
[HTTP Request: POST /api/lecturer/sessions/{id}/scan]
Payload: { "qr_token": "7c9e6679-7425-40de-944b-e07fc1f90ae7" }
           │
           ▼
[Spring Boot Verification Engine]
 ├─ 1. Verify Lecturer JWT & Session Ownership (or Admin override)
 ├─ 2. Verify Session Status == 'ACTIVE' (Reject if 'SCHEDULED' or 'FINALIZED')
 ├─ 3. Resolve QR Token -> Single Active Student Record
 │      └─ Not found? Return 404 NOT_FOUND ("Invalid QR token")
 ├─ 4. Batch Boundary Validation:
 │      └─ student.batch_id == session.batch_id?
 │         - NO: Return 403 FORBIDDEN ("Student belongs to a different batch")
 │         - YES: Proceed
 ├─ 5. Duplicate Check:
 │      └─ Record exists in attendance_records for (session_id, student_id)?
 │         - YES: Return 409 CONFLICT ("Attendance already marked")
 ├─ 6. Lab Group & Cross-Group Evaluation:
 │      └─ session.lab_group_id != NULL AND student.lab_group_id != session.lab_group_id?
 │         - YES: Set is_cross_group = TRUE (Cross-Group Attendance)
 │         - NO:  Set is_cross_group = FALSE (Regular Attendance)
 ├─ 7. Punctuality Evaluation:
 │      └─ now() > session.start_time + 15 mins?
 │         - YES: status = 'LATE'
 │         - NO:  status = 'PRESENT'
 └─ 8. Atomic Insert into attendance_records:
        Enforces UNIQUE(session_id, student_id)
           │
           ▼
[HTTP 200 Response Payload]
{
  "student_id": "NSBM2026042",
  "student_name": "Kasun Perera",
  "student_group": "Group B",
  "session_group": "Group A",
  "is_cross_group": true,
  "status": "PRESENT",
  "marked_at": "2026-10-27T10:15:32"
}
           │
           ▼
[Lecturer Web UI Real-Time Visual Confirmation Card]
 ├─ Displays Student Name & Student ID
 ├─ Displays Student's Assigned Lab Group
 └─ Renders High-Visibility "CROSS-GROUP ATTENDANCE" Alert Badge
```

### Visual Confirmation Safeguards
The immediate on-screen presentation of the student's name, matriculation ID, and lab group enables the lecturer to glance at the student standing at the laboratory door and confirm their identity, mitigating badge pass-off or unauthorized proxy attempts.

---

## 8. Cross-Group Attendance Governance [Updated 2026-10]

### Business Logic & Rules
1. **Permitted Cross-Group Attendance**:
   - A student enrolled in `Batch 22.1`, assigned to `Group B`, who attends a `Group A` lab session of `Batch 22.1` is **accepted**.
   - The attendance record is stored with `status = 'PRESENT'` (or `'LATE'`) and `is_cross_group = true`.
2. **Strict Batch Enclosure**:
   - A student from `Batch 21.2` or `Batch 23.1` presenting their QR badge at a `Batch 22.1` session is **strictly rejected** with HTTP 403 (`STUDENT_NOT_IN_BATCH`).
3. **Audited Transparency**:
   - Cross-group attendance is highlighted across all system views:
     - **Lecturer Live Roster**: Marked with an amber "Cross-Group" pill badge.
     - **Session Summary**: Displays breakdown: `Total Attendees = Regular + Cross-Group`.
     - **Analytics**: Compares regular attendance vs cross-group migration trends.
     - **Exports**: Reports contain dedicated columns `Assigned Group` and `Cross-Group: YES/NO`.

---

## 9. Anti-Cheating & Data Integrity Safeguards [Updated 2026-10]

1. **Unpredictable Opaque Token Cryptography**:
   - Tokens generated via cryptographically secure pseudo-random number generators prevent badge forgery.
   - Zero plain-text student details are stored inside the QR code.
2. **Real-Time Visual Corroboration**:
   - Lecturer UI renders the scanned student's identity immediately, exposing impersonation attempts.
3. **Hardware-Level Unique Database Constraints**:
   - `UNIQUE(session_id, student_id)` on `attendance_records` mathematically prevents duplicate check-ins even under concurrent network requests.
4. **Strict Batch Partitioning**:
   - Cross-batch attendance is blocked at the database and service layer.
5. **No Auto-Absence Before Finalization**:
   - Unmarked students remain in an unrecorded state during active sessions. Absent records are bulk-inserted only upon explicit session closure by the lecturer.
6. **Immutable Audit Trail**:
   - Any manual attendance status corrections after finalization require a mandatory justification note and are permanently logged in `audit_logs`.

---

## 10. Analytics & Reporting Subsystem [Updated 2026-10]

### Operational Dashboards
- **Lecturer Dashboard**:
  - Assigned modules, active sessions, and upcoming sessions.
  - Session attendance metrics: total students expected, attended, absent, and cross-group count.
- **Admin Institutional Dashboard**:
  - Department-wide attendance statistics, faculty breakdown, active sessions, and audit activity.
  - Lab group utilization analytics: average group attendance rates across Groups A, B, and C.

### Official Institutional Reports & Exports [Updated 2026-10]
Every exported document (CSV, Excel XLSX, PDF) includes:
1. **Institutional Header**: Official NSBM Green University Town banner and branding (`#006A4E` forest green / `#15803D`).
2. **Session Context**: Module Code, Module Title, Academic Batch, Assigned Lab Group (or "Whole Batch"), Room Venue, Date, Time.
3. **Lecturer Details**: Assigned Instructor Full Name and Staff ID.
4. **Structured Student Table**:
   - Student Identification Number
   - Full Name
   - University Email
   - Assigned Lab Group
   - Cross-Group Flag (`Yes` / `No`)
   - Attendance Status (`PRESENT`, `LATE`, `ABSENT`)
   - Marked Timestamp & Method (`QR_SCAN`, `MANUAL_CORRECTION`)
5. **Summary Metric Block**:
   - Total Enrolled in Scope
   - Total Attended (Regular + Cross-Group)
   - Regular Attendees Count
   - Cross-Group Attendees Count
   - Absent Count
   - Effective Attendance Percentage (%)

---

## 11. Database Schema Specification (Supabase PostgreSQL) [Updated 2026-10]

```sql
-- 1. Users Table (System Administrators & Lecturers)
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'LECTURER')),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. Batches Table
CREATE TABLE batches (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL, -- e.g. '22.1', 'CS-2026-A'
    name VARCHAR(150) NOT NULL,
    intake_year INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 3. Lab Groups Table [Updated 2026-10]
CREATE TABLE lab_groups (
    id BIGSERIAL PRIMARY KEY,
    batch_id BIGINT NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL, -- e.g. 'Group A', 'Group B', 'Group C'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_batch_group_name UNIQUE (batch_id, name)
);

-- 4. Students Table [Updated 2026-10]
CREATE TABLE students (
    id BIGSERIAL PRIMARY KEY,
    student_id VARCHAR(50) UNIQUE NOT NULL, -- Academic Matriculation Number
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    batch_id BIGINT NOT NULL REFERENCES batches(id) ON DELETE RESTRICT,
    lab_group_id BIGINT REFERENCES lab_groups(id) ON DELETE SET NULL, -- Nullable if batch has no groups
    qr_token VARCHAR(64) UNIQUE, -- Opaque unpredictable token
    qr_token_hash VARCHAR(64) UNIQUE, -- SHA-256 digest of opaque token
    qr_generated_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 5. Modules Table
CREATE TABLE modules (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(30) UNIQUE NOT NULL, -- e.g. 'SE301'
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 6. Lecturer Module Assignments Table [Updated 2026-10]
CREATE TABLE lecturer_module_assignments (
    id BIGSERIAL PRIMARY KEY,
    lecturer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    module_id BIGINT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    batch_id BIGINT NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    lab_group_id BIGINT REFERENCES lab_groups(id) ON DELETE SET NULL, -- Scoped assignment
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_lecturer_module_batch_group UNIQUE (lecturer_id, module_id, batch_id, lab_group_id)
);

-- 7. Lab Sessions Table [Updated 2026-10]
CREATE TABLE lab_sessions (
    id BIGSERIAL PRIMARY KEY,
    module_id BIGINT NOT NULL REFERENCES modules(id) ON DELETE RESTRICT,
    batch_id BIGINT NOT NULL REFERENCES batches(id) ON DELETE RESTRICT,
    lab_group_id BIGINT REFERENCES lab_groups(id) ON DELETE RESTRICT, -- NULL for entire batch session
    lecturer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    venue VARCHAR(100) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'SCHEDULED' NOT NULL CHECK (status IN ('SCHEDULED', 'ACTIVE', 'FINALIZED', 'CANCELLED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    finalized_at TIMESTAMP WITH TIME ZONE,
    finalized_by BIGINT REFERENCES users(id)
);

-- 8. Attendance Records Table [Updated 2026-10]
CREATE TABLE attendance_records (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL REFERENCES lab_sessions(id) ON DELETE CASCADE,
    student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL CHECK (status IN ('PRESENT', 'LATE', 'ABSENT')),
    is_cross_group BOOLEAN DEFAULT FALSE NOT NULL, -- [Updated 2026-10]
    method VARCHAR(30) NOT NULL CHECK (method IN ('QR_SCAN', 'MANUAL_ENTRY', 'FINALIZED_ABSENCE')),
    marked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_corrected BOOLEAN DEFAULT FALSE NOT NULL,
    corrected_at TIMESTAMP WITH TIME ZONE,
    corrected_by BIGINT REFERENCES users(id),
    previous_status VARCHAR(20),
    justification_notes TEXT,
    CONSTRAINT uq_session_student UNIQUE (session_id, student_id)
);

-- 9. Audit Logs Table
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    action VARCHAR(50) NOT NULL,
    actor_id BIGINT NOT NULL REFERENCES users(id),
    target_entity VARCHAR(50) NOT NULL,
    target_id BIGINT NOT NULL,
    details JSONB,
    justification TEXT,
    ip_address VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
```

---

## 12. Authoritative API Endpoints [Updated 2026-10]

### Authentication Endpoints (`/api/auth`)
- `POST /api/auth/login`: Authenticate with username/password. Returns JWT token, role, full name, and avatar.
- `GET /api/auth/me`: Returns verified identity and role claims.

### Admin Management Endpoints (`/api/admin`) [Updated 2026-10]
- **Batches & Lab Groups**:
  - `GET /api/admin/batches`: List all academic batches.
  - `POST /api/admin/batches`: Create a new batch.
  - `GET /api/admin/batches/{batchId}/groups`: List lab groups for a batch.
  - `POST /api/admin/batches/{batchId}/groups`: Create a new lab group (e.g. Group A).
- **Student Roster & QR Management**:
  - `GET /api/admin/students`: Paginated student list with batch and group filters.
  - `POST /api/admin/students`: Register student (assign batch and optional lab group).
  - `POST /api/admin/students/import`: Bulk CSV roster import.
  - `POST /api/admin/students/{id}/qr/generate`: Generate/regenerate opaque QR token.
  - `GET /api/admin/students/{id}/qr`: Retrieve student QR token and metadata.
  - `GET /api/admin/students/{id}/qr/download`: Download individual student QR PNG image.
  - `GET /api/admin/batches/{batchId}/qr/bulk-download?groupId=`: Bulk export ZIP archive of student QR codes.
- **Lecturer Assignments**:
  - `GET /api/admin/assignments`: List module-batch-group assignments.
  - `POST /api/admin/assignments`: Assign lecturer to module, batch, and optional lab group.
- **Audits & Global Attendance Adjustments**:
  - `GET /api/admin/audit-logs`: Query immutable audit ledgers.
  - `PATCH /api/admin/attendance/{recordId}/correct`: Audited attendance correction with mandatory reason.

### Lecturer Endpoints (`/api/lecturer`) [Updated 2026-10]
- **Assigned Modules & Sessions**:
  - `GET /api/lecturer/modules`: List assigned modules and accessible lab groups.
  - `GET /api/lecturer/sessions`: List sessions filtered by status/module.
  - `POST /api/lecturer/sessions`: Create new session specifying batch and optional `lab_group_id`.
  - `POST /api/lecturer/sessions/{id}/open`: Open session (`SCHEDULED` -> `ACTIVE`).
  - `POST /api/lecturer/sessions/{id}/finalize`: Finalize session (`ACTIVE` -> `FINALIZED`), bulk insert absentees.
- **Live Scanning & Visual Confirmation**:
  - `POST /api/lecturer/sessions/{id}/scan`:
    - **Request**: `{ "qr_token": "uuid-opaque-token" }`
    - **Response**: `{ "student_id": "...", "student_name": "...", "student_group": "Group B", "is_cross_group": true, "status": "PRESENT", "marked_at": "..." }`
- **Attendance Corrections & Reports**:
  - `GET /api/lecturer/sessions/{id}/attendance`: Full session roster with regular and cross-group tags.
  - `PATCH /api/lecturer/sessions/{id}/attendance/{recordId}`: Correct record with mandatory justification.
  - `GET /api/lecturer/sessions/{id}/export?format=csv|xlsx|pdf`: Download official session report.

---

## 13. User Interface (UI) Components & Workflows [Updated 2026-10]

```
+-----------------------------------------------------------------------------------+
|                           ADMIN UI: STUDENT ROSTER & QR                           |
+-----------------------------------------------------------------------------------+
| Batches > Batch 22.1 > Lab Group B                                                |
| [ + Add Student ]  [ Bulk Import CSV ]  [ Bulk Download QRs (ZIP) ]               |
|                                                                                   |
| Name             Student ID      Lab Group   QR Status    Actions                 |
| ───────────────────────────────────────────────────────────────────────────────── |
| Kasun Perera     NSBM2026042     Group B     Generated    [View QR] [Download PNG]|
| Dilani Silva     NSBM2026043     Group B     Generated    [View QR] [Download PNG]|
| Nuwan Fernando   NSBM2026044     Group B     Pending      [Generate QR]           |
+-----------------------------------------------------------------------------------+
```

```
+-----------------------------------------------------------------------------------+
|                         LECTURER UI: LIVE SCANNER VIEW                            |
+-----------------------------------------------------------------------------------+
| Module: SE301 - Lab Session 04 | Scope: Batch 22.1 (Group A)                      |
| [html5-qrcode Camera Viewfinder Feed]                                             |
|                                                                                   |
| ┌───────────────────────────────────────────────────────────────────────────────┐ │
| │ LAST SCANNED:                                                                 │ │
| │ [Student Avatar]  KASUN PERERA  (ID: NSBM2026042)                             │ │
| │                   Assigned Group: Group B                                     │ │
| │                   [ ! CROSS-GROUP ATTENDANCE ! ]                              │ │
| │                   Status: PRESENT (Check-in: 10:15 AM)                        │ │
| └───────────────────────────────────────────────────────────────────────────────┘ │
|                                                                                   |
| Live Counts: Expected (Group A): 35 | Present: 28 | Cross-Group: 3 | Unmarked: 4  |
| [ Finalize Session & Mark Absentees ]                                             |
+-----------------------------------------------------------------------------------+
```

### UI Specifications
1. **Admin Student QR Modal**:
   - Displays rendered QR code using standard canvas/SVG.
   - Shows student name, matriculation ID, batch, and group.
   - Action buttons: "Download PNG" (`<student_id>_QR.png`) and "Regenerate Token" with confirmation prompt.
2. **Admin Bulk QR Export**:
   - Dropdown selection for Batch and Lab Group (e.g. "All Groups in Batch 22.1" or "Only Group A").
   - Triggers background ZIP download with animated progress feedback.
3. **Lecturer Live Scanner Card**:
   - Prominently displays the scanned student's Full Name in bold typography.
   - Shows the student's assigned group side-by-side with the session group.
   - Cross-Group highlight: Bright amber badge with clear iconography (`AlertTriangle` / `Users`) indicating that the student is attending from another lab group of the same batch.
   - Success audio chime / visual green glow for regular check-ins; amber glow for cross-group; red buzz for rejected scans (different batch / already marked).
4. **Theme & Branding Consistency**:
   - Clean NSBM Green University branding (NSBM Emerald `#006A4E`, `#10B981`, white, and slate canvas).
   - Fully accessible light and dark mode toggle on all top navigation headers.
