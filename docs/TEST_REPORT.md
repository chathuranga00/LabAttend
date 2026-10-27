# LabAttend - Comprehensive Testing & Security Hardening Report (Step 16 Update)

**System Name**: LabAttend — Laboratory & Lecture Attendance Management System  
**Date**: October 27, 2026  
**Status**: VERIFIED & PASSING  
**Branch**: `feature/group-testing-hardening`  
**Quality Assurance Gate**: Step 16 Complete (Lab Groups, Admin QR Generation, Cross-Group Attendance, Group-Aware Analytics & Reports)

---

## 1. Executive Summary

This report documents the end-to-end testing verification and security hardening conducted for **Step 16** of the **LabAttend** project. Testing was executed across both the Spring Boot 3 Java backend and the React + Vite frontend in accordance with the updated project specifications, covering:
1. **Academic Lab Groups**: Dynamic partitioning, auto-split algorithms, lecturer group assignments, and group-scoped lab sessions.
2. **Admin QR Generation & Bulk Downloads**: Cryptographic opaque tokens, HMAC-SHA256 signatures, single PNG download, token regeneration with automatic invalidation of obsolete badges, and bulk ZIP and printable A4 PDF sticker sheet exports.
3. **Cross-Group Attendance**: Real-time cross-group visitor recognition (`CROSS_GROUP_MARKED`), visual badge confirmation, isolation from regular attendance percentages and expected rosters, and foreign batch rejections.
4. **Group-Aware Analytics & Reports**: Filter hierarchy (`batch -> group -> module -> date range`), group attendance breakdown metrics, cross-group visitor counters, and the dedicated Cross-Group Attendance Audit Report (`ReportType.CROSS_GROUP`).
5. **Canonical 100-Student Benchmark Scenario**: Full cohort execution verifying mathematical integrity across session summaries, analytics, and CSV exports.

### Key Metrics
- **Backend Test Suites**: 21 test classes | **137 automated tests** | **100% Pass Rate (0 failures, 0 errors, 0 skipped)**
- **Frontend Test Suites**: 6 test files | **27 automated tests** | **100% Pass Rate (0 failures, 0 skipped)**
- **Build Status**: Maven backend `BUILD SUCCESS` | Vite frontend `npm run build` cleanly compiled (0 errors)
- **Canonical E2E Benchmark (100 Students)**: Batch 24.1 partitioned into Group A (34), Group B (33), Group C (33); bulk ZIP verified (100 valid PNGs); Group A session (30 present, 4 absent, 88.2% turnout); Group B session (28 regular present, 1 Group A visitor, 5 absent, 84.8% turnout); foreign batch student rejected; all exports verified.

---

## 2. Test Execution & Coverage Matrix

### 2.1 Backend Automated Tests (JUnit 5 + Spring Boot Test)

| Test Suite / Category | Class | Focus & Scenarios Verified | Tests | Status |
| :--- | :--- | :--- | :---: | :---: |
| **Authentication & RBAC** | `AuthIntegrationTest` | Admin/Lecturer login, invalid credentials, deactivated account blocking, JWT claims extraction, unauthenticated `/api/auth/me` blocking, role enforcement. | 9 | **PASSED** |
| **Security Hardening** | `SecurityHardeningTest` | Role escalation prevention, cross-lecturer scan/finalize isolation, unauthenticated endpoint protection, scan endpoint rate limiting (HTTP 429), bulk QR endpoint rate limiting (HTTP 429), lecturer blocked from QR generation/bulk downloads. | 12 | **PASSED** |
| **Academic Master Data** | `AcademicStructureIntegrationTest` | Degree programmes, batches, modules, laboratory halls, module-lecturer assignments, unique constraint enforcement, cascade restrictions. | 14 | **PASSED** |
| **Student & Lecturer Admin** | `StudentLecturerTest` | Student creation, duplicate ID validation, batch mismatch detection, student update, lecturer creation with temporary password, status toggling. | 8 | **PASSED** |
| **Student/Lecturer Service** | `StudentLecturerServiceTest` | Business service validation, entity mapping, audit logging triggers for user management. | 3 | **PASSED** |
| **Lab Session Lifecycle** | `LabSessionIntegrationTest` | Session creation, time window validation, hall double-booking prevention, unauthorized module assignment, transition to `ACTIVE`, lecturer isolation. | 9 | **PASSED** |
| **Lab Session Service** | `LabSessionServiceTest` | Service layer state machine, code generation formatting, schedule validation. | 5 | **PASSED** |
| **QR Attendance Flow** | `AttendanceIntegrationTest` | `POST /api/lecturer/sessions/{id}/scan`, valid badge check-in, invalid QR rejection, manual attendance reason validation, expected roster queries. | 4 | **PASSED** |
| **Attendance Service** | `AttendanceServiceTest` | Unit verification of 7-step scan transaction, session ownership, draft/finalized session rejection, unassigned student rejection, data integrity conflict handling. | 10 | **PASSED** |
| **Concurrent Duplicate Scans** | `ConcurrentAttendanceScanTest` | Multi-threaded race condition test (10 concurrent threads scanning the exact same student token simultaneously; exactly 1 `SUCCESS`, 9 `ALREADY_MARKED`, 0 unhandled exceptions). | 1 | **PASSED** |
| **Session Finalization & Audit** | `SessionFinalizationTest` | Pessimistic locking, auto-marking unmarked students `ABSENT`, turnout formula calculation (`N/A` when expected = 0), double-finalize rejection, post-finalization auditable corrections. | 7 | **PASSED** |
| **Section 29 Canonical E2E** | `Section29EndToEndTest` | Full university session lifecycle with 40 students cohort: 35 scanned present, 5 absent on finalization, 87.5% turnout, audit log generation, post-finalization medical correction to 90.0%. | 1 | **PASSED** |
| **Attendance Analytics** | `AnalyticsIntegrationTest` | Admin and lecturer analytics endpoints, module trends, low-attendance thresholds, date range filtering, lecturer data boundary enforcement. | 5 | **PASSED** |
| **Analytics Service** | `AnalyticsServiceTest` | Aggregate SQL calculations, finalized-only rule, cancelled-excluded rule, batch change immunity. | 7 | **PASSED** |
| **Reports & Multi-Format Export**| `ReportServiceTest` | 9 report types (`SESSION`, `DAILY`, `STUDENT_HISTORY`, `MODULE`, `BATCH`, `SEMESTER`, `LOW_ATTENDANCE`, `HALL`, `CROSS_GROUP`) streaming CSV, Excel (XLSX), and PDF. | 14 | **PASSED** |
| **Lab Group Service** | `LabGroupServiceTest` | Unique group name per batch constraint, group must belong to student's batch, lecturer restricted from creating sessions for unassigned groups, auto-split algorithm validation. | 5 | **PASSED** |
| **Admin QR Generation** | `QrCodeServiceTest` | HMAC token determinism, token uniqueness between students, regeneration increments version and invalidates old token, scan resolution with new/old tokens, zero PII in QR matrix, bulk ZIP and PDF sticker exports. | 7 | **PASSED** |
| **Cross-Group Attendance** | `CrossGroupAttendanceTest` | Same group scan marked PRESENT, cross-group scan marked CROSS_GROUP_MARKED with home group tagged, foreign batch rejected, duplicate visitor scan blocked, absent calculation excludes visitors, turnout rate isolates visitors, concurrent visitor safety, session summary counts. | 8 | **PASSED** |
| **Group-Aware Analytics** | `GroupAwareAnalyticsTest` | Group-wise breakdown (expected, present regular, absent, percentage, visitors received, outgoing visits), student attendance home-group session isolation, cross-group attendance audit report, lecturer scope isolation. | 5 | **PASSED** |
| **Step 16 E2E Benchmark** | `GroupAwareEndToEndBenchmarkTest` | Comprehensive 100-student benchmark across Groups A, B, C: bulk ZIP generation, Group A & B active sessions, cross-group scan, foreign batch rejection, session finalization, group analytics breakdown, and cross-group CSV export. | 1 | **PASSED** |
| **Health Controller** | `HealthControllerTest` | System health check (`/api/health`) and uptime verification. | 2 | **PASSED** |
| **Total Backend Verification** | **21 Test Classes** | **Complete Server Verification** | **137** | **100% PASSED** |

### 2.2 Frontend Automated Tests (Vitest + React Testing Library)

| Test Suite | File | Focus & Scenarios Verified | Tests | Status |
| :--- | :--- | :--- | :---: | :---: |
| **Authentication & Login** | `src/test/auth_login.test.jsx` | Form input rendering, required field validation, invalid email format validation, failed login error display, role-based navigation redirect to `/admin/dashboard` or `/lecturer/dashboard`. | 6 | **PASSED** |
| **Route Protection** | `src/test/protected_route.test.jsx` | Unauthenticated redirect to `/login`, role-based route guard (`ADMIN` vs `LECTURER`), unauthorized role cross-redirect, loading state spinner. | 5 | **PASSED** |
| **Scanner Result Feedback** | `src/test/scanner_feedback.test.jsx` | Initial empty state, `SUCCESS` card with student details and `QR_SCAN` badge, `ALREADY_MARKED` warning card with prior scan time, `ERROR` card with exact Section 25 copy. | 6 | **PASSED** |
| **Cross-Group Feedback** | `src/test/cross_group_feedback.test.jsx` | Regular scan rendering, cross-group scan visual confirmation with "Cross-Group Visitor" badge, Home Group display ("Home Group: Group A"), duplicate visitor scan warning. | 3 | **PASSED** |
| **Student QR & Bulk Export** | `src/test/student_qr.test.jsx` | Single student QR view modal, PNG download action, token regeneration with mandatory reason validation, bulk QR modal with batch selection, group filtering, and ZIP/PDF format selection. | 4 | **PASSED** |
| **Group Analytics & Reports** | `src/test/group_analytics_reports.test.jsx` | Dynamic group dropdown filtering by selected batch, Cross-Group Attendance Audit Report option in dropdown, group breakdown table rendering with visitors received and outgoing visits columns. | 3 | **PASSED** |
| **Total Frontend Verification**| **6 Test Files** | **Complete Client Verification** | **27** | **100% PASSED** |

---

## 3. Step 16 End-to-End Scenario Verification

The full university lifecycle benchmark required by Step 16 was implemented and verified in `GroupAwareEndToEndBenchmarkTest.java`:

### Scenario Parameters
- **Cohort**: 100 active students in **Batch 24.1** partitioned into:
  - **Group A**: 34 students (`STU0001` - `STU0034`)
  - **Group B**: 33 students (`STU0035` - `STU0067`)
  - **Group C**: 33 students (`STU0068` - `STU0100`)
- **Foreign Student**: 1 student from **Batch 23.2** (`STU9999`)
- **Lecturers & Sessions**:
  - Lecturer 1 conducts Session A (Group A, Lab Hall 1)
  - Lecturer 2 conducts Session B (Group B, Lab Hall 2)

### Verified Results

1. **Admin QR Generation & Bulk ZIP**:
   - Cryptographic tokens generated for all 100 students.
   - Admin downloads bulk ZIP for Batch 24.1.
   - Verified: Archive contains exactly 100 student PNG files, each starting with the valid PNG magic header `[0x89, 'P', 'N', 'G']`.
2. **Lecturer 1 Conducts Group A Session**:
   - 30 students from Group A scan in present (`isCrossGroup = false`, result `SUCCESS`).
   - 4 students in Group A remain unrecorded.
3. **Lecturer 2 Conducts Group B Session**:
   - 28 regular students from Group B scan in present (`isCrossGroup = false`, result `SUCCESS`).
   - **Cross-Group Scan**: Student 1 (`STU0001`, from Group A) scans into Group B's session.
     - System marks student `PRESENT` with result `CROSS_GROUP_MARKED`.
     - Flagged with `isCrossGroup = true` and `labGroupName = "Group A"`.
     - Cross-group visitor counter incremented to 1.
   - **Foreign Batch Scan**: Student from Batch 23.2 scans into Group B's session.
     - Strictly rejected with `BadRequestException`: `"Student Is Not Assigned to This Session"`.
4. **Finalization & Session Summary Numbers**:
   - **Session A**:
     - Expected = **34**
     - Present = **30**
     - Cross-Group Visitors = **0**
     - Absent = **4**
     - Turnout Percentage = **88.2%** ($30 / 34 \times 100 = 88.23\%$)
   - **Session B**:
     - Expected = **33** (strictly Group B expected roster)
     - Present Regular = **28**
     - Cross-Group Visitors = **1** (`STU0001` from Group A)
     - Absent = **5** ($33 - 28 = 5$. The visitor from Group A does *not* reduce Group B's absent count)
     - Turnout Percentage = **84.8%** ($28 / 33 \times 100 = 84.84\%$, computed strictly on regular expected attendees)
5. **Analytics Verification**:
   - `getGroupAttendanceAnalytics` for Batch 24.1 returns:
     - Group A: Expected 34, Present 30, Absent 4, Rate **88.2%**, Visitors Received **0**, Outgoing Visits **1**.
     - Group B: Expected 33, Present 28, Absent 5, Rate **84.8%**, Visitors Received **1**, Outgoing Visits **0**.
     - Group C: Expected 0, Present 0, Absent 0, Rate **N/A**, Visitors Received **0**, Outgoing Visits **0**.
6. **Cross-Group Attendance Audit Report Export**:
   - Report generated and exported as CSV:
   - Contains exactly 1 audited row: `STU0001`, Student 1, Home Group: Group A, Session Group: Group B, Lecturer: Prof. Lecturer Two.

---

## 4. Security Review & Hardening Audit

### 4.1 Role-Based Access Control (Zero Trust Client)
- **Admin-Only QR Endpoints**:
  - `GET /api/admin/students/{id}/qr`
  - `POST /api/admin/students/{id}/qr/regenerate`
  - `GET /api/admin/students/qr/bulk`
  - Protected at the class level by `@PreAuthorize("hasRole('ADMIN')")` in `AdminStudentController` and enforced at the filter chain level by `.requestMatchers("/api/admin/**").hasRole("ADMIN")` in `SecurityConfig`.
  - Verified by tests: Lecturer accessing any QR generation or download endpoint is strictly rejected with **HTTP 403 Forbidden**.
- **Lecturer Scanner-Only Capabilities**:
  - Lecturers have scanner and session finalization capabilities only for sessions assigned to them.
  - Cross-lecturer scanning or finalizing into another lecturer's session is blocked.

### 4.2 Cryptographic Token Integrity & Zero Personal Data
- **Token Generation**: Uses HMAC-SHA256 with a high-entropy secret (`QR_HMAC_SECRET`) injected via environment variables.
- **Payload Privacy**: Decoded QR payload contains strictly an opaque, cryptographically signed token. Zero student names, student IDs, emails, NICs, or PII appear in the matrix (verified by ZXing barcode decoder tests).
- **Token Invalidation on Regeneration**:
  - When an admin regenerates a student's QR code, `qr_version` is incremented.
  - The previous token hash is replaced in the database.
  - Scans using the old token are immediately rejected with `"Invalid QR Code — Student Not Found"`.
  - The new token is immediately recognized.

### 4.3 Rate Limiting Defense
Rate limiting is enforced at the network filter level (`RateLimitingFilter`) and service level (`RateLimiterService`):
1. **Login Endpoint (`POST /api/auth/login`)**: Sliding window limit of 10 requests per minute per IP. Excess requests return HTTP 429 Too Many Requests.
2. **Scan Endpoint (`POST /api/lecturer/sessions/{id}/scan`)**: Limit of 120 scans per minute per session/IP to prevent replay attacks or camera looping. Excess scans return HTTP 429.
3. **Bulk QR Endpoint (`GET /api/admin/students/qr/bulk`)**: Limit of 30 bulk export requests per minute per IP to prevent resource exhaustion from massive ZIP/PDF generation. Excess requests return HTTP 429.

### 4.4 Mandatory Audit Logging
Every sensitive administrative action is immutably logged into `attendance_audit_logs`:
- `QR_DOWNLOAD`: Single student QR badge view or download.
- `QR_REGENERATE`: QR token invalidation and regeneration with mandatory justification reason.
- `BULK_QR_DOWNLOAD`: Bulk ZIP archive export with student count and batch/group metadata.
- `BULK_QR_PDF_DOWNLOAD`: Bulk printable sticker sheet export.
- `SESSION_FINALIZED`: Session finalization and auto-generated absents.
- `ATTENDANCE_CORRECTION`: Post-finalization manual adjustments with mandatory justification reason.

---

## 5. Codebase Review: Removed Rules & Assumptions

1. **"No QR Generation" Rule**:
   - The removed rule in `README.md` ("3. No QR Generation: The platform contains no QR generation, badge printing...") was identified and replaced with the updated principle: **"Admin QR Generation & Bulk Export"**.
   - All references to "scanner-only" were updated to clarify that it applies strictly to the `LECTURER` role.
2. **Whole Batch Session Assumption**:
   - Verified that `LabSessionService`, `AttendanceService`, and `CreateLabSessionPage.jsx` correctly handle both whole batch sessions (`lab_group_id = NULL`) and group-scoped sessions (`lab_group_id != NULL`).
   - Verified that students are enrolled based on their assigned group when a group session is created, and whole batch when `lab_group_id` is null.
   - Cross-group logic strictly verifies batch enrollment and applies cross-group flags only to group sessions.

---

## 6. Conclusion

Step 16 testing and hardening is complete. All 137 backend tests and 27 frontend tests pass cleanly with zero failures and zero regressions. All security constraints, rate limiters, cryptographic token invalidation, role isolation, and canonical 100-student benchmark metrics are fully verified and grounded in production code without mock or hardcoded data.
