# AttendX Security Architecture & Threat Analysis

## 1. Zero-Trust Architecture & Security Principles

AttendX is engineered under a strict **Zero-Trust Model** regarding client devices. Submissions from client applications—including the student Flutter mobile app and lecturer/admin React web dashboards—are treated as untrusted and verified authoritatively against server-side business rules.

```
       [ Student Mobile App ]               [ Lecturer Web Client ]
                 │                                     │
                 │ (Raw GPS Coords, Opaque QR Token)   │ (Session Parameters)
                 ▼                                     ▼
        ┌────────────────────────────────────────────────────────┐
        │             AttendX Express API Gateway                │
        │  ────────────────────────────────────────────────────  │
        │  1. Cryptographic JWT Verification (Supabase Auth)     │
        │  2. Dual RBAC: Role Claim + DB Account Status Check    │
        │  3. Server-Side Geofence Distance (Haversine Formula)  │
        │  4. Ephemeral 30s QR Token Lookup & SHA-256 Validation │
        │  5. Global, Export & Submission Rate Limiters          │
        │  6. Database Constraints (uq_session_student_attendance)│
        │  7. Immutable Audit Logs & Verification Telemetry      │
        └────────────────────────────────────────────────────────┘
                                   │ (Service Role Secret)
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │           PostgreSQL Database (Supabase)               │
        │  ────────────────────────────────────────────────────  │
        │  1. Row-Level Security (RLS) on all 12 tables          │
        │  2. Privilege Escalation Trigger (profiles protection) │
        │  3. Zero Client Access to qr_tokens & audit_logs       │
        └────────────────────────────────────────────────────────┘
```

---

## 2. Core Security Controls

1. **Cryptographic Identity Verification**: All protected endpoints require a valid Supabase JWT. Student and lecturer identities are derived exclusively from verified claims, never accepted from request payloads.
2. **Dynamic 30-Second Token Rotation**: Ephemeral QR tokens rotate every 30 seconds and are stored as SHA-256 hashes. Static screenshots become obsolete in under 30 seconds.
3. **Compound Key Duplication Prevention**: Database unique constraint `(session_id, student_id)` prevents duplicate records at the database engine level. Concurrency races are safely trapped and returned as `409 ALREADY_MARKED`.
4. **On-Demand Location Verification**: GPS coordinates are inspected only at the instant of scanning against configured room geofences. High uncertainty readings are flagged as `needs_review` rather than blindly accepted or rejected.
5. **Role-Based Access Control (RBAC)**: Enforced through Express middleware (`authenticate`, `requireRole`) and PostgreSQL Row-Level Security (RLS).
6. **Immutable Audit Trails**: All verification attempts (accepted, rejected, review) and lecturer corrections are recorded with timestamps, actor IDs, previous/new states, and audit justifications.

---

## 3. Security Audit Findings & Remediations

| ID | Severity | Category | Description | Remediation Applied |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | **Critical** | Privilege Escalation (CWE-269) | `handle_new_user` trigger previously read `raw_user_meta_data->>'role'`, allowing self-registered users to elevate themselves to `admin` or `lecturer`. | Patched trigger in [00002_create_profiles.sql](file:///q:/MY%20Projects/AttendX/database/migrations/00002_create_profiles.sql) to force default role strictly to `'student'`. Role upgrades require explicit administrator action. |
| **SEC-02** | **Critical** | Dependency Vulnerability (CWE-1321) | Prototype pollution in `tinypool` (transitive dev dependency via test runner). | Mitigated via test isolation; identified for clean lockfile upgrade. |
| **SEC-03** | **High** | Multi-Tenant Data Purge / IDOR (CWE-284) | `lecturerService.cleanupExpiredTokens` called repository without `sessionId`, purging expired tokens globally across all lecturers and courses. | Added explicit `sessionId` scoping in [lecturer.repository.ts](file:///q:/MY%20Projects/AttendX/server/src/repositories/lecturer.repository.ts) and [lecturer.service.ts](file:///q:/MY%20Projects/AttendX/server/src/services/lecturer.service.ts). |
| **SEC-04** | **High** | Denial of Service (CWE-400) | Document export endpoints (PDF/XLSX generation) lacked rate limits, leaving the server vulnerable to CPU/memory exhaustion attacks. | Implemented `exportRateLimiter` (30 exports per 15 minutes per user/IP) in [rateLimiter.ts](file:///q:/MY%20Projects/AttendX/server/src/middleware/rateLimiter.ts). |
| **SEC-05** | **High** | Rate Limiting (CWE-770) | General API endpoints and QR token generation lacked throttling. | Implemented `globalApiRateLimiter` and `qrTokenRateLimiter` in [rateLimiter.ts](file:///q:/MY%20Projects/AttendX/server/src/middleware/rateLimiter.ts) and [app.ts](file:///q:/MY%20Projects/AttendX/server/src/app.ts). |
| **SEC-06** | **Medium** | CSV Formula Injection (CWE-1236) | Exported CSV files did not escape formula characters (`=`, `+`, `-`, `@`, `\t`, `\r`), risking command execution in spreadsheet viewers. | Updated `escapeCSV` in [exportEngine.ts](file:///q:/MY%20Projects/AttendX/server/src/utils/exportEngine.ts) to prepend a single quote `'` to neutralize formula operators. |
| **SEC-07** | **Medium** | CORS Misconfiguration (CWE-942) | Permissive CORS configuration permitted credentials with wildcard origin. | Enforced `credentials: false` whenever wildcards are present in [app.ts](file:///q:/MY%20Projects/AttendX/server/src/app.ts), and restricted origin checks. |
| **SEC-08** | **Medium** | Missing Input Validation (CWE-20) | Admin reporting, session cancellation, and lecturer export routes accepted raw, unvalidated query/body values. | Added and enforced Zod schemas (`attendanceReportQuerySchema`, `adminSessionsQuerySchema`, `adminCancelSessionSchema`, `exportFormatQuerySchema`) in [admin.controller.ts](file:///q:/MY%20Projects/AttendX/server/src/controllers/admin.controller.ts) and [lecturer.controller.ts](file:///q:/MY%20Projects/AttendX/server/src/controllers/lecturer.controller.ts). |
| **SEC-09** | **Medium** | User Enumeration (CWE-204) | Login failure directly surfaced raw Supabase error messages, facilitating account enumeration. | Standardized sign-in failure responses to `'Invalid email or password'` (`INVALID_CREDENTIALS`) in [auth.controller.ts](file:///q:/MY%20Projects/AttendX/server/src/controllers/auth.controller.ts). |
| **SEC-10** | **Low** | Dependency Bounds Check (CWE-1285) | Transitive dependency `uuid` (<11.1.1) in `exceljs` had missing buffer bounds check. | Validated usage and verified no arbitrary buffer inputs are passed. |

---

## 4. Inherent Physical & Hardware Limitations

While AttendX employs state-of-the-art cryptographic and procedural security, physical and hardware constraints impose theoretical boundaries:

### 4.1 Limitations of Dynamic QR Code Rotation

1. **Real-Time Video Streaming / Proxy Scanning**:
   - *Threat*: A student attending physically can stream the projected QR code in real-time over Discord, FaceTime, or WhatsApp to an absent student off-campus. Because the video latency is often < 1-2 seconds, the remote student can scan the token within its 20-30 second window.
   - *Mitigation*: GPS geofencing provides a second, independent factor. Even if the QR code is streamed, the remote student's GPS location will fail the proximity check unless location spoofing is also employed.
2. **Visual Angle & Projection Artifacts**:
   - Large lecture theaters with high-resolution projectors can introduce moiré patterns, screen glare, or rolling shutter artifacts on mobile phone cameras, requiring reasonable token presentation times (20-30 seconds).
3. **Screen Capture vs. Physical Attendance**:
   - Short TTLs (30s) eliminate static photo sharing, but cannot distinguish between a camera pointed at a projector screen vs. a camera pointed at a high-definition monitor streaming the projector.

### 4.2 Limitations of GPS & Geofencing Verification

1. **Indoor Attenuation & Multipath Degradation**:
   - *Threat*: GNSS (GPS/GLONASS/Galileo) satellite signals are significantly attenuated by reinforced concrete, metallic roofs, and subterranean multi-story academic buildings (typical of university laboratories).
   - *Consequence*: Devices indoors often report horizontal accuracy $> 30-50$ meters, or fall back to cellular tower / Wi-Fi BSSID triangulation, which can place a legitimately present student hundreds of meters away.
   - *Mitigation*: The AttendX validation engine checks `accuracy <= MAX_GPS_ACCURACY_METERS` (default 50m). When signals degrade, records are classified as `needs_review` rather than falsely marking students absent, allowing lecturer manual reconciliation.
2. **OS-Level Location Mocking (Root / Jailbreak / Developer Mode)**:
   - *Threat*: Both Android and iOS support developer mock location providers or rooted/jailbroken hook frameworks (e.g., Magisk modules, Frida, fake GPS apps) that inject artificial coordinates into the OS location manager.
   - *Mitigation*: Android `isFromMockProvider` flags, device fingerprinting, and cryptographic token rotation force an attacker to orchestrate both real-time token reception AND accurate coordinate injection simultaneously.
3. **Device Timestamp Manipulation**:
   - *Threat*: Malicious clients might attempt to forge `capturedAt` timestamps.
   - *Mitigation*: AttendX evaluates GPS freshness against authoritative server timestamps (`MAX_GPS_FRESHNESS_SECONDS <= 60s`), completely rejecting stale location readings.

---

## 5. Defense-in-Depth Layering

To counter the combined limitations of dynamic QR and GPS, AttendX relies on defense-in-depth:
1. **Layer 1: Ephemeral QR Token** (Proof of Temporal Proximity)
2. **Layer 2: GPS Geofence Check** (Proof of Spatial Proximity)
3. **Layer 3: Single-Device Attendance Constraint** (`uq_session_student_attendance`)
4. **Layer 4: Real-time Lecturer Presence Dashboard** (Immediate Visual Audit)
5. **Layer 5: Post-Cutoff Absentee Finalization** (Deterministic Reconciliation)
6. **Layer 6: Tamper-Evident Audit Logging** (Accountability for Manual Adjustments)
