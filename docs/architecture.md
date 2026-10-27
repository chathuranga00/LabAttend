# AttendX System Architecture Blueprints

This document details the architectural design, component interactions, network topology, trust boundaries, and state machines of **AttendX**—the smart university attendance management system for NSBM Green University.

---

## 1. High-Level System Architecture

AttendX employs a multi-tier, zero-trust client architecture. Client applications (the Flutter mobile application for students and the React web dashboard for lecturers and administrators) authenticate against **Supabase Auth**, obtain short-lived cryptographic JWT tokens, and interact with the authoritative Node.js/Express API Gateway. The backend coordinates all business logic, Haversine proximity calculations, dynamic QR lifecycle rotation, and writes to a relational **PostgreSQL** database hosted on Supabase with Row-Level Security (RLS).

```mermaid
graph TB
    subgraph Client Tier
        Mobile[Flutter Student Mobile App<br/>Android / iOS - Material 3]
        Web[React Web Dashboard<br/>Lecturers & Administrators - Tailwind]
    end

    subgraph Identity Tier
        SupabaseAuth[Supabase Auth<br/>Cryptographic JWT & User Registry]
    end

    subgraph Application Tier
        API[Node.js + Express API Engine<br/>TypeScript / Supabase Client SDK]
        AuthMW[Auth & Role Guard Middleware]
        RateMW[Global, Submission & Export Rate Limiters]
        Engine[Attendance Verification Engine<br/>Haversine GPS + 30s QR Token]
        AuditSvc[Immutable Audit Logging Service]
        ReportSvc[Export Engine: PDF / CSV / XLSX]
    end

    subgraph Data Tier
        Postgres[(PostgreSQL Database on Supabase)]
        ProfilesTable[(profiles)]
        SessionsTable[(laboratory_sessions)]
        TokensTable[(qr_tokens)]
        AttTable[(attendance_records)]
        AttemptsTable[(attendance_verification_attempts)]
        AuditTable[(attendance_audit_logs)]
    end

    Mobile -->|Obtain JWT Access Token| SupabaseAuth
    Web -->|Obtain JWT Access Token| SupabaseAuth
    Mobile -->|HTTPS Bearer JWT| RateMW
    Web -->|HTTPS Bearer JWT| RateMW
    RateMW --> API
    API --> AuthMW
    AuthMW --> Engine
    Engine --> Postgres
    AuditSvc --> AuditTable
    ReportSvc --> Postgres
    Postgres -.-> ProfilesTable
    Postgres -.-> SessionsTable
    Postgres -.-> TokensTable
    Postgres -.-> AttTable
    Postgres -.-> AttemptsTable
```

---

## 2. Component Directory Mapping

- [mobile/](file:///q:/MY%20Projects/AttendX/mobile): Flutter mobile application exclusively for students (Android/iOS) to scan dynamic QR codes, track personal attendance history, inspect module statistics, and verify exam eligibility against the 80% threshold.
- [web/](file:///q:/MY%20Projects/AttendX/web): React + TypeScript + Vite + Tailwind CSS dashboard for lecturers (to schedule sessions, project live 30-second rotating QR codes, inspect live rosters, and export reports) and administrators (to manage users, courses, terms, rooms, enrollments, and university-wide audit ledgers).
- [server/](file:///q:/MY%20Projects/AttendX/server): Node.js + Express + TypeScript API engine providing zero-trust validation, cryptographic QR token rotation, Haversine GPS proximity checking, and multi-format report generation.
- [database/](file:///q:/MY%20Projects/AttendX/database): PostgreSQL migrations, relational schemas, check constraints, foreign keys, and Row-Level Security (RLS) policies.
- [docs/](file:///q:/MY%20Projects/AttendX/docs): System specifications, architectural blueprints, database schemas, API references, security models, and testing manuals.

---

## 3. Session Lifecycle State Machine

A laboratory attendance session transitions through a deterministic state machine managed by assigned lecturers:

```mermaid
stateDiagram-v2
    [*] --> scheduled : Lecturer Schedules Session
    scheduled --> active : Lecturer Opens Attendance Window
    scheduled --> cancelled : Lecturer / Admin Cancels Session
    active --> closed : Lecturer Closes Window (Cutoff Reached)
    active --> cancelled : Emergency Cancellation
    closed --> [*] : Absentees Computed & Finalized
    cancelled --> [*] : Omitted from Attendance Calculations
```

- **`scheduled`**: Session created with course, room coordinates, and planned time window. Students cannot mark attendance.
- **`active`**: Attendance window opened. Dynamic QR token generation activated (rotating every 30s). Students can submit attendance.
- **`closed`**: Window closed. All remaining dynamic tokens are revoked immediately. The system computes absent records for enrolled students who failed to submit attendance.
- **`cancelled`**: Session cancelled due to holiday or scheduling changes. Omitted from attendance quota formulas.

---

## 4. Attendance Submission & Verification Pipeline

When a student scans the projected QR code from the mobile client, the backend executes a rigorous 16-step verification pipeline:

```mermaid
sequenceDiagram
    autonumber
    actor S as Student (Mobile App)
    participant GW as Express API Gateway
    participant MW as Auth & Rate Limiters
    participant VE as Attendance Verification Engine
    participant DB as PostgreSQL Database
    actor L as Lecturer (Web Dashboard)

    L->>GW: POST /api/lecturer/sessions/:id/qr-token
    GW->>DB: Store SHA-256 hash of 30s token
    GW-->>L: Return rotating QR payload { sessionId, token, expiresAt }
    L->>S: Projects dynamic QR code on screen

    S->>GW: POST /api/attendance/mark { token, sessionId, location }
    GW->>MW: Check rate limits & verify Supabase JWT signature
    MW->>VE: Extract authenticated student UUID
    VE->>DB: Verify active account status & course enrollment
    VE->>DB: Query session state (must be 'active' & within window)
    VE->>DB: Lookup token SHA-256 hash (must match & not expired)
    VE->>DB: Check unique constraint (session_id, student_id)
    alt Geofencing Configured
        VE->>VE: Evaluate Haversine distance <= room radius
    end
    VE->>DB: Atomic INSERT into attendance_records
    VE->>DB: Log attempt into attendance_verification_attempts
    VE-->>S: Return outcome envelope { success: true, status: 'present'|'late' }
    GW-->>L: Live roster reflects checked-in student
```

---

## 5. Security & Trust Boundaries

1. **Client Untrusted**: All data originating from mobile devices (including GPS coordinates, timestamps, and tokens) are treated as untrusted input. The server derives the student's ID strictly from the verified Supabase JWT claim.
2. **Ephemeral QR Lifespan**: Dynamic tokens expire in 30 seconds, preventing proxy attendance via static photographs.
3. **Double-Scan Prevention**: Atomic database unique constraints `UNIQUE(session_id, student_id)` reject concurrent or replay submissions.
4. **Proximity Assurance**: Server-side Haversine calculations enforce maximum distance thresholds without exposing raw room coordinates to client devices.
