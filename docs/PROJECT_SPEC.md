# LabAttend - Smart Laboratory Attendance System Specification

> **NSBM Green University - Department of Computer Science & Software Engineering**  
> *Authoritative System Specification & Architectural Reference*  
> *Target Architecture*: Spring Boot (Java 17+), React 18+ (Vite, Tailwind CSS), PostgreSQL (Supabase / Flyway)

---

## 1. Project Overview & Scope [Updated 2026-11]

**LabAttend** is an enterprise-grade laboratory attendance tracking and session governance system designed for NSBM Green University. The system streamlines laboratory attendance administration, mitigates proxy attendance, supports flexible lab workstation partitioning into lab groups, and provides authoritative institutional reporting and audits.

### Core Architectural Principles
- **Zero-Trust Role Enforcement**: All authorization boundaries (`ADMIN`, `LECTURER`, `STUDENT`) are enforced strictly on the Spring Boot backend via cryptographically verified JWT claims. Client-submitted roles are never trusted.
- **Student Portal Model [Updated 2026-11]**: Students have a dedicated read-only web portal (`/frontend-student`) where they can view **only their own** profile, attendance counts, attendance percentage, per-module breakdown, and attendance history. Students cannot mark attendance, view other students, or access any staff data.
- **Admin-Controlled QR Badge Generation [Updated 2026-10]**: QR code generation is exclusively managed by the `ADMIN`. Each student receives an individual QR code with an opaque, high-entropy, unpredictable token mapping 1-to-1 to their record, containing **zero personal data (PII)**.
- **Hardware-Free Webcam/Mobile Camera Scanning**: Lecturers utilize `html5-qrcode` within their web browser on any standard laptop, tablet, or smartphone to scan physical or digital student QR badges.
- **Batch & Lab Group Partitioning [Updated 2026-10]**: Academic batches are partitioned into physical lab groups (e.g. Group A, Group B, Group C) to respect lab room capacity limits. Sessions can target an entire batch or a specific lab group.
- **Controlled Cross-Group Attendance [Updated 2026-10]**: Students from the same batch attending an alternate lab group's session are accepted and permanently flagged as `is_cross_group = true`, while students outside the batch are strictly rejected.
- **Definitive Session Finalization**: Unmarked students are **never** auto-marked absent prior to explicit session closure. Absence is computed and recorded atomically upon session finalization.
- **Strict DTO Encapsulation**: JPA entities are never exposed across HTTP controllers. All requests and responses utilize Data Transfer Objects (DTOs).

---

## 2. User Roles & Permissions [Updated 2026-11]

The system defines exactly **three** authenticated roles:

```
+-----------------------------------------------------------------------------------------------+
|                                        USER ROLES                                             |
+---------------------------+---------------------------+---------------------------------------+
|          ADMIN            |          LECTURER         |             STUDENT                   |
+---------------------------+---------------------------+---------------------------------------+
| Manage Degrees, Batches   | View assigned modules &   | View own profile                      |
| Manage Lab Groups         |   lab groups              | View own overall attendance count &   |
| Student Roster Mgmt &     | Schedule & manage lab     |   percentage (FINALIZED only)         |
|   CSV Import              |   sessions                | View own per-module attendance        |
| Create & manage student   | Conduct sessions & scan   | View own attendance history           |
|   accounts & activation   |   QR badges               |   (FINALIZED sessions only)           |
| Generate & Regen QR Tokens| Real-time visual scan     | CANNOT mark attendance                |
| View & Download QR (PNG)  |   confirmation            | CANNOT view other students            |
| Bulk Download QRs (ZIP)   | Accept cross-group        | CANNOT view lecturer notes            |
| Assign Lecturers to       |   attendance (same batch) | CANNOT view audit logs or             |
|   Modules & Groups        | Submit justified          |   correction reasons                  |
| Full System Analytics &   |   corrections             | CANNOT see QR token                   |
|   Global Audits           | Finalize sessions         | CANNOT view ACTIVE or CANCELLED       |
| Global Attendance         | View & export session     |   sessions in statistics              |
|   Adjustments (Audit)     |   reports                 |                                       |
|                           | CANNOT generate or        |                                       |
|                           |   download QR codes       |                                       |
+---------------------------+---------------------------+---------------------------------------+
```

### 1. `ADMIN` (Institutional Administrator) [Updated 2026-10]
- Manage academic structure: faculties, degree programmes, academic years, batches, and modules.
- Divide batches into lab groups (e.g., Group A, Group B, Group C) and manage student group enrollments.
- Student roster management: create, update, deactivate students, and import rosters via CSV.
- **Student Account Management [Updated 2026-11]**: Create student login accounts with university email. Trigger activation link (one-time, expiring) to student's registered university email. Deactivate or reactivate accounts.
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

### 3. `STUDENT` (Authenticated Read-Only Portal) [Updated 2026-11]
- Students have a **dedicated read-only web portal** (`/frontend-student`) accessed via university email and password.
- Student accounts are **created and activated by the Admin** (not self-registered).
- **A student can ONLY view their own data.** The backend always derives student identity from the authenticated JWT token — no student endpoint accepts a student ID as a URL or query parameter.
- **Permitted views** (FINALIZED sessions only; CANCELLED and ACTIVE sessions are excluded from statistics):
  - Own profile (name, student ID, batch, lab group).
  - Overall attendance count and percentage across all modules.
  - Per-module attendance breakdown.
  - Chronological attendance history (session date, module, status, lab group — no cross-group reasons, no correction notes, no lecturer remarks, no QR token).
- **Strictly prohibited**:
  - Marking or modifying attendance in any way.
  - Viewing other students' records or lists.
  - Viewing audit logs, correction reasons, justification notes, or lecturer remarks.
  - Viewing or accessing their own QR token or QR image.
  - Accessing any `/api/admin/**` or `/api/lecturer/**` endpoint.

---

## 3. Technology Stack & Repository Architecture [Updated 2026-11]

> **ONE Spring Boot backend. ONE Supabase PostgreSQL database. TWO separate React frontends.**

```
Lab Attend Workspace
├── backend/                             # Spring Boot 3.x / Java 17+ Enterprise REST API
│   ├── src/main/java/com/labattend/
│   │   ├── config/                      # SecurityFilterChain, JWT, CORS, Flyway config
│   │   ├── controller/
│   │   │   ├── admin/                   # /api/admin/** (ADMIN only)
│   │   │   ├── lecturer/                # /api/lecturer/** (LECTURER only)
│   │   │   ├── student/                 # /api/student/** (STUDENT only)  [Updated 2026-11]
│   │   │   └── auth/                    # /api/auth/staff/login, /api/auth/student/login
│   │   ├── dto/                         # Request & Response Data Transfer Objects
│   │   ├── entity/                      # JPA Hibernate Entities
│   │   ├── repository/                  # Spring Data JPA Repositories
│   │   ├── security/                    # JwtTokenProvider, UserPrincipal, AuthFilters
│   │   └── service/                     # Business Logic, QR Service, Attendance Service
│   └── src/main/resources/
│       ├── application.yml              # Profile configs & env var interpolation
│       └── db/migration/                # Version-controlled Flyway SQL scripts
│
├── frontend-staff/                      # Staff Portal: React 18+ SPA (Vite) [Updated 2026-11]
│   │                                    # (renamed from /frontend)
│   ├── src/
│   │   ├── components/                  # Layouts, ThemeToggle, ScannerModal, Modals
│   │   ├── context/                     # AuthContext (staff only), ThemeContext
│   │   ├── pages/
│   │   │   ├── admin/                   # Dashboard, Batches, Groups, Students, Modules, Audits
│   │   │   ├── lecturer/                # Dashboard, Sessions, Scanner, Roster, Reports
│   │   │   └── StaffLoginPage.jsx       # Staff-only login (ADMIN & LECTURER) — no link to student login
│   │   └── services/                    # Centralized Axios API clients with JWT interceptor
│   └── package.json
│
├── frontend-student/                    # Student Portal: React 18+ SPA (Vite) [Updated 2026-11]
│   ├── src/
│   │   ├── components/                  # Layouts, navigation
│   │   ├── context/                     # AuthContext (student only)
│   │   ├── pages/
│   │   │   ├── StudentLoginPage.jsx     # Student-only login — no link to staff login
│   │   │   ├── StudentDashboard.jsx     # Overall attendance summary
│   │   │   ├── StudentModulesPage.jsx   # Per-module attendance breakdown
│   │   │   └── StudentHistoryPage.jsx   # Chronological attendance history
│   │   └── services/                    # Axios API client targeting /api/student/**
│   └── package.json
│
└── docs/                                # Authoritative documentation & architecture records
    ├── PROJECT_SPEC.md                  # This specification document
    ├── ASSUMPTIONS.md                   # Architectural decisions & design rationale
    └── api.md                           # API endpoint reference
```

---

## 4. Authentication Architecture [Updated 2026-11]

### Two Separate Login Endpoints

| Login endpoint | Allowed roles | Used by |
|---|---|---|
| `POST /api/auth/staff/login` | `ADMIN`, `LECTURER` | `/frontend-staff` only |
| `POST /api/auth/student/login` | `STUDENT` | `/frontend-student` only |

**Security rule**: If valid credentials are presented at the **wrong** endpoint (e.g., a student authenticates at `/api/auth/staff/login`), the backend returns exactly the same response as a wrong password: `"Email or password is incorrect."` This prevents role enumeration.

### JWT Claims & Backend Enforcement
- Each JWT contains the authenticated user's role (`ADMIN`, `LECTURER`, or `STUDENT`).
- Spring Security `SecurityFilterChain` enforces:
  - `STUDENT` tokens are **rejected** on `/api/admin/**` and `/api/lecturer/**`.
  - `ADMIN` and `LECTURER` tokens are **rejected** on `/api/student/**`.
- Frontend route guards are UX conveniences only — the backend is the sole security authority.

### Student Account Activation [Updated 2026-11]
1. Admin creates a student account (email, student ID, name, batch, group).
2. System sends a **one-time, expiring activation link** to the student's registered university email.
3. Student clicks the link, sets their password, and account becomes active.
4. Passwords are **BCrypt hashed**. Plaintext passwords are never stored or logged.
5. Backend responses **never reveal** whether an email or student ID exists (generic error on login failure).

### Portal Separation
- Neither site links to the other site's login page.
- `StaffLoginPage.jsx` has no reference to the student portal URL.
- `StudentLoginPage.jsx` has no reference to the staff portal URL.

---

## 5. Student Management & Lab Group Structure [Updated 2026-11]

### Academic Batch & Lab Group Hierarchy
1. **Academic Batch**: A cohort of students enrolled in a degree programme for a specific intake year (e.g. `Batch 22.1`, `CS-2026-A`).
2. **Lab Groups**:
   - To match laboratory workstation capacities (typically 30–40 seats), a batch can be divided into named lab groups (e.g., `Group A`, `Group B`, `Group C`).
   - A batch with small enrollment does not require lab groups; `lab_group_id` remains `NULL`.
3. **Student Assignment**:
   - Each student is assigned to exactly one academic batch.
   - Within that batch, the student may be assigned to one lab group (`students.lab_group_id` foreign key referencing `lab_groups.id`).
   - The Administrator can reassign students between lab groups or batches. Reassignments never alter or invalidate historical attendance records.

### Admin Student Operations [Updated 2026-11]
- **Individual Student Registration**: Admin enters student matriculation ID (e.g. `NSBM2026001`), full name, university email, academic batch, and optional lab group.
- **CSV Batch Import**: Bulk import student rosters via CSV containing `student_id, full_name, email, batch_code, lab_group_name`.
- **Student Account Creation & Activation [Updated 2026-11]**: After registration, Admin triggers an activation email. Student sets their own password via the one-time link.
- **QR Generation from Student Record**:
  - The Admin can click "Generate QR" on any student record.
  - The system generates an opaque cryptographic token, hashes it, stores it, and renders the QR code.
  - Admin can view the QR code in an interactive modal and click "Download PNG" (`<student_id>_QR.png`).
- **Bulk QR Download**:
  - Admin can select an entire batch or filter by a specific lab group and trigger "Bulk Download QRs".
  - The backend packages individual QR PNG images into a ZIP file with standardized filenames.

---

## 6. QR Code Architecture & Token Security [Updated 2026-10]

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
5. **Student portal cannot access QR token**: The `/api/student/**` endpoints never return `qr_token`, `qr_token_hash`, or `qr_generated_at` fields.

---

## 7. Session Creation & Lecturer Assignments [Updated 2026-10]

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

## 8. Scanning Flow, Student Matching & Visual Confirmation [Updated 2026-10]

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

## 9. Cross-Group Attendance Governance [Updated 2026-10]

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

## 10. Anti-Cheating & Data Integrity Safeguards [Updated 2026-10]

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

## 11. Analytics & Reporting Subsystem [Updated 2026-10]

### Operational Dashboards
- **Lecturer Dashboard**:
  - Assigned modules, active sessions, and upcoming sessions.
  - Session attendance metrics: total students expected, attended, absent, and cross-group count.
- **Admin Institutional Dashboard**:
  - Department-wide attendance statistics, faculty breakdown, active sessions, and audit activity.
  - Lab group utilization analytics: average group attendance rates across Groups A, B, and C.
- **Student Dashboard [Updated 2026-11]**:
  - Overall attendance summary (present, absent, percentage) across all enrolled modules.
  - Per-module attendance breakdown (FINALIZED sessions only; CANCELLED and ACTIVE excluded).
  - Session-by-session history. No staff data, no other students' data.

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

## 12. Database Schema Specification (Supabase PostgreSQL) [Updated 2026-11]

```sql
-- 1. Users Table (System Administrators, Lecturers, and Students) [Updated 2026-11]
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'LECTURER', 'STUDENT')),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    -- Student-specific fields (NULL for ADMIN/LECTURER rows) [Updated 2026-11]
    activation_token VARCHAR(128) UNIQUE,         -- One-time activation token
    activation_token_expires_at TIMESTAMP WITH TIME ZONE, -- Expiry of activation link
    activated_at TIMESTAMP WITH TIME ZONE,        -- When student set their password
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. Batches Table
CREATE TABLE batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL, -- e.g. '22.1', 'CS-2026-A'
    name VARCHAR(150) NOT NULL,
    intake_year INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 3. Lab Groups Table [Updated 2026-10]
CREATE TABLE lab_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL, -- e.g. 'Group A', 'Group B', 'Group C'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_batch_group_name UNIQUE (batch_id, name)
);

-- 4. Students Table [Updated 2026-11]
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL, -- Link to portal login account [Updated 2026-11]
    student_id VARCHAR(50) UNIQUE NOT NULL,       -- Academic Matriculation Number
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,           -- University email (matches users.email when activated)
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE RESTRICT,
    lab_group_id UUID REFERENCES lab_groups(id) ON DELETE SET NULL, -- Nullable if batch has no groups
    qr_token VARCHAR(64) UNIQUE,                  -- Opaque unpredictable token
    qr_token_hash VARCHAR(64) UNIQUE,             -- SHA-256 digest of opaque token
    qr_generated_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 5. Modules Table
CREATE TABLE modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(30) UNIQUE NOT NULL, -- e.g. 'SE301'
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 6. Lecturer Module Assignments Table [Updated 2026-10]
CREATE TABLE lecturer_module_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lecturer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    lab_group_id UUID REFERENCES lab_groups(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_lecturer_module_batch_group UNIQUE (lecturer_id, module_id, batch_id, lab_group_id)
);

-- 7. Lab Sessions Table [Updated 2026-10]
CREATE TABLE lab_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE RESTRICT,
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE RESTRICT,
    lab_group_id UUID REFERENCES lab_groups(id) ON DELETE RESTRICT, -- NULL for entire batch session
    lecturer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    venue VARCHAR(100) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'SCHEDULED' NOT NULL CHECK (status IN ('SCHEDULED', 'ACTIVE', 'FINALIZED', 'CANCELLED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    finalized_at TIMESTAMP WITH TIME ZONE,
    finalized_by UUID REFERENCES users(id)
);

-- 8. Attendance Records Table [Updated 2026-10]
CREATE TABLE attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES lab_sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL CHECK (status IN ('PRESENT', 'LATE', 'ABSENT')),
    is_cross_group BOOLEAN DEFAULT FALSE NOT NULL,
    method VARCHAR(30) NOT NULL CHECK (method IN ('QR_SCAN', 'MANUAL_ENTRY', 'FINALIZED_ABSENCE')),
    marked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_corrected BOOLEAN DEFAULT FALSE NOT NULL,
    corrected_at TIMESTAMP WITH TIME ZONE,
    corrected_by UUID REFERENCES users(id),
    previous_status VARCHAR(20),
    justification_notes TEXT,                      -- NOT exposed to STUDENT role
    CONSTRAINT uq_session_student UNIQUE (session_id, student_id)
);

-- 9. Audit Logs Table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(50) NOT NULL,
    actor_id UUID NOT NULL REFERENCES users(id),
    target_entity VARCHAR(50) NOT NULL,
    target_id UUID NOT NULL,
    details JSONB,
    justification TEXT,
    ip_address VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
```

---

## 13. Authoritative API Endpoints [Updated 2026-11]

### Authentication Endpoints (`/api/auth`) [Updated 2026-11]

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/staff/login` | Authenticate ADMIN or LECTURER. Returns JWT. If the credentials belong to a STUDENT role, return `"Email or password is incorrect."` |
| `POST` | `/api/auth/student/login` | Authenticate STUDENT. Returns JWT. If the credentials belong to ADMIN or LECTURER, return `"Email or password is incorrect."` |
| `GET`  | `/api/auth/me` | Returns verified identity and role claims from the validated JWT. |
| `POST` | `/api/auth/student/activate` | Student sets password via one-time activation token (unauthenticated). |
| `POST` | `/api/auth/student/resend-activation` | Admin-triggered re-send of activation link. |

### Admin Management Endpoints (`/api/admin/**`) — ADMIN role only [Updated 2026-11]
- **Batches & Lab Groups**:
  - `GET /api/admin/batches`: List all academic batches.
  - `POST /api/admin/batches`: Create a new batch.
  - `GET /api/admin/batches/{batchId}/groups`: List lab groups for a batch.
  - `POST /api/admin/batches/{batchId}/groups`: Create a new lab group (e.g. Group A).
- **Student Roster, Account & QR Management**:
  - `GET /api/admin/students`: Paginated student list with batch and group filters.
  - `POST /api/admin/students`: Register student record (assign batch and optional lab group).
  - `POST /api/admin/students/import`: Bulk CSV roster import.
  - `POST /api/admin/students/{id}/activate`: Trigger/re-trigger activation email to student. [Updated 2026-11]
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

### Lecturer Endpoints (`/api/lecturer/**`) — LECTURER role only [Updated 2026-10]
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

### Student Endpoints (`/api/student/**`) — STUDENT role only [Updated 2026-11]

> **Security constraint**: The backend always derives which student is making the request from the validated JWT claims (`sub` = user ID). **No endpoint in `/api/student/**` accepts a student ID as a path variable or query parameter.** Any attempt to pass a student identifier is ignored or rejected.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/student/me` | Own profile: name, student ID, batch, lab group. No QR token. |
| `GET` | `/api/student/attendance/summary` | Overall attendance counts and percentage across all enrolled modules (FINALIZED sessions only). |
| `GET` | `/api/student/attendance/modules` | Per-module attendance breakdown (FINALIZED sessions only). |
| `GET` | `/api/student/attendance/history` | Chronological session attendance history. Returns: date, module, session lab group, own status. Never returns: justification_notes, correction reasons, cross-group notes, QR data, or other students' data. |

---

## 14. User Interface (UI) Components & Workflows [Updated 2026-11]

### Staff Portal (`/frontend-staff`)

```
+-----------------------------------------------------------------------------------+
|                           ADMIN UI: STUDENT ROSTER & QR                           |
+-----------------------------------------------------------------------------------+
| Batches > Batch 22.1 > Lab Group B                                                |
| [ + Add Student ]  [ Bulk Import CSV ]  [ Bulk Download QRs (ZIP) ]               |
|                                                                                   |
| Name             Student ID      Lab Group   Portal Status  QR Status    Actions  |
| ───────────────────────────────────────────────────────────────────────────────── |
| Kasun Perera     NSBM2026042     Group B     Active         Generated    [QR] [...] |
| Dilani Silva     NSBM2026043     Group B     Pending Email  Generated    [QR] [...] |
| Nuwan Fernando   NSBM2026044     Group B     Not Activated  Pending      [Activate] |
+-----------------------------------------------------------------------------------+
```

```
+-----------------------------------------------------------------------------------+
|                         LECTURER UI: LIVE SCANNER VIEW                            |
+-----------------------------------------------------------------------------------+
| Module: SE301 - Lab Session 04 | Scope: Batch 22.1 (Group A)                      |
| [html5-qrcode Camera Viewfinder Feed]                                             |
|                                                                                   |
| ┌─────────────────────────────────────────────────────────────────────────────┐  |
| │ LAST SCANNED:                                                               │  |
| │ [Student Avatar]  KASUN PERERA  (ID: NSBM2026042)                           │  |
| │                   Assigned Group: Group B                                   │  |
| │                   [ ! CROSS-GROUP ATTENDANCE ! ]                            │  |
| │                   Status: PRESENT (Check-in: 10:15 AM)                      │  |
| └─────────────────────────────────────────────────────────────────────────────┘  |
|                                                                                   |
| Live Counts: Expected (Group A): 35 | Present: 28 | Cross-Group: 3 | Unmarked: 4  |
| [ Finalize Session & Mark Absentees ]                                             |
+-----------------------------------------------------------------------------------+
```

### Student Portal (`/frontend-student`) [Updated 2026-11]

```
+-----------------------------------------------------------------------------------+
|                         STUDENT PORTAL: ATTENDANCE DASHBOARD                      |
+-----------------------------------------------------------------------------------+
| Welcome, Kasun Perera  (NSBM2026042 · Group B · Batch 22.1)                      |
|                                                                                   |
| OVERALL ATTENDANCE          Sessions Attended: 18/22 (81.8%)                     |
|                                                                                   |
| MODULE BREAKDOWN:                                                                 |
| ───────────────────────────────────────────────────────────────────────────────── |
| SE301 - Distributed Systems   8/10 sessions (80.0%)  [View History]              |
| SE302 - Software Engineering  10/12 sessions (83.3%) [View History]              |
|                                                                                   |
| ⚠  Note: Statistics include only finalized lab sessions.                         |
+-----------------------------------------------------------------------------------+
```

**Student portal restrictions (UI enforced, backend authoritative)**:
- No link to staff login.
- No access to other students' records.
- No visibility of QR token, correction reasons, justification notes, or audit data.
- No buttons, forms, or controls for modifying attendance.
- Read-only display only.

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
   - Both portals use consistent branding but are deployed as separate SPAs.

---

## 15. Security Architecture [Updated 2026-11]

### Spring Security Filter Chain Rules

```
/api/auth/staff/login      → Public (no JWT required)
/api/auth/student/login    → Public (no JWT required)
/api/auth/student/activate → Public (uses one-time token, not JWT)
/api/auth/me               → Any authenticated role (ADMIN, LECTURER, STUDENT)

/api/admin/**              → hasRole('ADMIN') only
                             LECTURER and STUDENT tokens → 403 Forbidden

/api/lecturer/**           → hasRole('LECTURER') only
                             ADMIN and STUDENT tokens → 403 Forbidden

/api/student/**            → hasRole('STUDENT') only
                             ADMIN and LECTURER tokens → 403 Forbidden
```

### Role Enumeration Prevention
- Incorrect credentials at any login endpoint: `"Email or password is incorrect."` (identical message regardless of whether the email exists, whether the password is wrong, or whether the role is wrong for the endpoint).
- Student login at staff endpoint: same generic error.
- Staff login at student endpoint: same generic error.

### Student Data Isolation
- Every `/api/student/**` service method begins by resolving `CustomUserDetails.getId()` from the Security Context, then looking up the linked `students` record via `students.user_id`. No student identifier is accepted from the HTTP request.
- Response DTOs for student endpoints exclude: `qr_token`, `qr_token_hash`, `qr_generated_at`, `justification_notes`, `corrected_by`, `previous_status`, `is_corrected`, any other student's data.

---

## 16. Testing Strategy [Updated 2026-11]

### Backend Unit & Integration Tests
- Authentication tests: staff login rejects STUDENT role; student login rejects ADMIN/LECTURER role.
- Role boundary tests: STUDENT JWT rejected at `/api/admin/**` and `/api/lecturer/**` with 403.
- Student data isolation tests: student can only see own data; fabricated student IDs in URL/params rejected.
- Activation flow tests: token expiry, one-time use enforcement, password set.
- Session status filter tests: ACTIVE and CANCELLED sessions excluded from student statistics; only FINALIZED counted.

### Frontend Tests
- `/frontend-staff` login page has no link to student login.
- `/frontend-student` login page has no link to staff login.
- Student dashboard shows only own data.

---

## 17. Deployment Architecture [Updated 2026-11]

```
                     ┌─────────────────────────────┐
                     │    ONE Spring Boot Backend   │
                     │    (REST API — Java 17+)     │
                     │                              │
                     │  /api/auth/staff/login  ─┐  │
                     │  /api/auth/student/login ─┤  │
                     │  /api/admin/**          ─┤  │
                     │  /api/lecturer/**       ─┤  │
                     │  /api/student/**        ─┘  │
                     └──────────────┬──────────────┘
                                    │ JDBC
                     ┌──────────────▼──────────────┐
                     │   ONE Supabase PostgreSQL    │
                     │        Database              │
                     └─────────────────────────────┘
                              ▲             ▲
              ┌───────────────┘             └─────────────────┐
              │                                               │
 ┌────────────▼────────────┐                  ┌──────────────▼───────────────┐
 │   /frontend-staff       │                  │   /frontend-student           │
 │  (React + Vite)         │                  │  (React + Vite)               │
 │                         │                  │                               │
 │  Admin & Lecturer site  │                  │  Student portal (read-only)   │
 │  POST /api/auth/        │                  │  POST /api/auth/              │
 │    staff/login only     │                  │    student/login only         │
 │                         │                  │                               │
 │  No link to student     │                  │  No link to staff portal      │
 │  portal                 │                  │                               │
 └─────────────────────────┘                  └───────────────────────────────┘
```
