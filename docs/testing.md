# NSBM Green University AttendX - Automated Testing Guide & Strategy

## 1. Overview & Testing Philosophy
AttendX enforces an automated testing strategy guaranteeing cryptographic security, strict role-based access control (RBAC), privacy-preserving geofencing, responsive mobile scanning workflows, and accurate academic metric calculation without requiring external cloud connectivity during automated test runs.

### Core Testing Technologies
- **Backend Test Runner**: [Vitest](https://vitest.dev/) (fast, native TypeScript compilation, integrated mocking).
- **Backend HTTP Agent**: [Supertest](https://github.com/ladjs/supertest) (simulates authentic HTTP requests through the compiled Express app).
- **Web Test Runner & Component Testing**: [Vitest](https://vitest.dev/) + [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) + [jsdom](https://github.com/jsdom/jsdom).
- **Mobile Test Runner**: Flutter Test Framework (`flutter test` / `package:flutter_test`).
- **Hermetic Mocking Strategy**: Hermetic spies on `supabaseAdmin`, repositories, and cryptographic generators to ensure 100% repeatable, deterministic test runs without external network dependencies.

---

## 2. Test Suite Architecture & Coverage Matrix

### 2.1 Backend API Engine (`server/`)
10 hermetic test suites covering 111 automated tests verifying every aspect of server-side operations:

| Test Suite | File | Focus & Scenarios Verified | Tests | Status |
| :--- | :--- | :--- | :--- | :--- |
| **System Health** | `server/tests/health.test.ts` | Service health status, environment mode, server timestamp. | 2 | Passed |
| **Authentication & RBAC** | `server/tests/auth.test.ts` | JWT verification, profile lookup, role boundaries (`student`, `lecturer`, `admin`), inactive/suspended account blocking. | 8 | Passed |
| **Admin Master Data** | `server/tests/admin.test.ts` | Academic calendar, courses, venues/rooms, student enrollments, lecturer assignments, account status toggles, unique constraints. | 8 | Passed |
| **Lecturer Sessions** | `server/tests/lecturer.test.ts` | Session lifecycle state transitions (`scheduled` -> `active` -> `closed` / `cancelled`), room double-booking prevention, lecturer assignment checks. | 16 | Passed |
| **Dynamic QR Tokens** | `server/tests/qrToken.test.ts` | Crypto random bytes (entropy), SHA-256 zero-knowledge hashing, 30s TTL expiry, issuance revocation, session termination auto-revocation, cleanup jobs. | 13 | Passed |
| **Attendance Verification** | `server/tests/attendance.test.ts` | 16-step verification pipeline, Haversine server-side proximity evaluation, accuracy & freshness filters, 15m late policy, atomic concurrency locking. | 13 | Passed |
| **Auditing & Corrections** | `server/tests/auditAndCorrection.test.ts` | Lecturer status corrections with mandatory justification, before/after audit metadata, post-close absentee computation, immutable admin audit log queries. | 11 | Passed |
| **Reports & Multi-Format Exports** | `server/tests/reportsAndExports.test.ts` | Attendance formula edge cases (cancelled omitted, excused deducted, late weighted 1.0, 80% threshold), student isolation, lecturer/admin reports, CSV/XLSX/PDF export buffers. | 20 | Passed |
| **Security Regression** | `server/tests/securityRegression.test.ts` | Privilege escalation prevention, multi-tenant session token isolation, rate limiting on exports/QR, CSV formula injection neutralization, standardized error sanitization, parameter validation. | 7 | Passed |
| **End-to-End Lifecycle** | `server/tests/e2eIntegration.test.ts` | Full university attendance flow (admin setup -> lecturer session -> QR token -> student scan -> live roster -> student history -> report export) + edge cases. | 13 | Passed |
| **Subtotal (Backend)** | **10 Test Suites** | **Complete Server Verification** | **111** | **All Passed** |

---

### 2.2 Frontend Web Dashboard (`web/`)
6 component, routing, and workflow test suites covering 39 automated tests with Vitest and React Testing Library:

| Test Suite | File | Focus & Scenarios Verified | Tests | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Common Components** | `web/src/test/common_components.test.tsx` | Status badges, error banners, stat cards, empty states, and loading skeletons. | 8 | Passed |
| **Auth & Protected Routes** | `web/src/test/auth_routing.test.tsx` | Login form validation, role-based route protection, session redirection, and logout workflows. | 6 | Passed |
| **Lecturer Live QR** | `web/src/test/lecturer_live_qr.test.tsx` | Rotating dynamic QR display, 30s countdown timer, live check-in roster table, and manual close button. | 6 | Passed |
| **Admin Dashboard & CRUD** | `web/src/test/admin_dashboard.test.tsx` | Administrative data tables, search/filter controls, creation/edit modals, account status toggling, and confirmation dialogs. | 8 | Passed |
| **Attendance Reports** | `web/src/test/attendance_reports.test.tsx` | Filter controls, Recharts visual attendance trends, absent student lists, attendance correction modal with mandatory justification, and CSV/XLSX/PDF export buttons. | 3 | Passed |
| **Security & Sanitization** | `web/src/test/security_hardening.test.tsx` | XSS sanitization, CSV formula escape validation, role boundary enforcement, and safe error message display. | 8 | Passed |
| **Subtotal (Web)** | **6 Test Suites** | **Complete Web App Verification** | **39** | **All Passed** |

---

### 2.3 Student Mobile App (`mobile/`)
8 widget, model, and state test suites covering 54 automated tests with Flutter Test:

| Test Suite | File | Focus & Scenarios Verified | Tests | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Login & Validation** | `mobile/test/login_form_validation_test.dart` | Form field validation (empty email, invalid email domain, minimum 6-character password, whitespace trimming), show/hide password toggle, button loading spinner, and inline error banner rendering. | 8 | Passed |
| **Dashboard States** | `mobile/test/dashboard_states_test.dart` | Loading spinner (`CircularProgressIndicator`), authoritative student identity header, today's sessions list, next session highlight card, 80% quota meter, recent records, empty states when no sessions or records exist, and error state retry button. | 13 | Passed |
| **Scanner & Outcomes** | `mobile/test/scanner_and_outcome_test.dart` | QR payload parsing (raw string tokens, structured JSON `{ token, session_id }`, and malformed fallback), `AttendanceOutcomeDialog` verification cards (`Present Verified`, `Late Attendance Marked`, `QR_EXPIRED` rescan prompt, `OUT_OF_RANGE` location discrepancy, `ALREADY_MARKED` duplicate rejection, `NOT_ENROLLED`, and `SESSION_CLOSED`). | 5 | Passed |
| **Attendance History** | `mobile/test/attendance_history_test.dart` | Filter modal dialog (status dropdown, date pickers, reset filters, apply filter callback), record card presentation (course code, session title, room, status badges), empty states, and pagination controls. | 5 | Passed |
| **Student Profile** | `mobile/test/profile_screen_test.dart` | Read-only credential display (registration number with lock icon, full name, email, degree programme, faculty), academic summary card, and error state retry. | 4 | Passed |
| **Settings & Security** | `mobile/test/settings_screen_test.dart` | Camera and location permission information, privacy principles, diagnostics base URL, and secure logout dialog with token clearance. | 13 | Passed |
| **Models & Policies** | `mobile/test/models_and_policies_test.dart` | Course 80% attendance quota threshold (`isEligibleForExam`), overall percentage calculation, `UserModel` role/status boundaries, `AttendanceFilterCriteria` parameter serialization, `AttendanceRecord` status flags, and `AppException` error mapping. | 5 | Passed |
| **Core Widgets** | `mobile/test/widget_test.dart` | Reusable `AppButton`, `AppCard`, `EmptyStateWidget`, and `ErrorStateWidget`. | 1 | Passed |
| **Subtotal (Mobile)** | **8 Test Suites** | **Complete Mobile App Verification** | **54** | **All Passed** |

---

## 3. Running Test Commands (Verified)

Every command documented below has been verified by direct execution in this repository.

### Backend (`server/`)
```bash
# 1. Run all 10 backend test suites (111 tests)
cd server
npm test

# 2. Run backend tests in watch mode
npm run test:watch

# 3. Type check & build backend TypeScript
npm run build
```

### Web Dashboard (`web/`)
```bash
# 1. Run all 6 web test suites (39 tests)
cd web
npm test

# 2. Type check & build web production bundle
npm run build
```

### Mobile App (`mobile/`)
```bash
# 1. Run all 8 mobile test suites (54 tests)
cd mobile
flutter test

# 2. Run Flutter static analysis
flutter analyze
```

---

## 4. Continuous Integration (CI) Verification Standards
Every build and pull request must satisfy:
1. **Zero Test Failures**: 111 backend tests, 39 web tests, and 54 mobile tests (total 204 tests) must pass.
2. **Zero TypeScript Errors**: Both `server` and `web` builds must compile cleanly (`npm run build`).
3. **Zero Lint Warnings**: `npm run lint` and `flutter analyze` must exit with code 0.
4. **Append-Only Auditing**: Tests enforce that audit log records cannot be updated or deleted.
