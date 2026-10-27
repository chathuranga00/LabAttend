# NSBM Green University AttendX - Comprehensive API Reference

## 1. Overview & System Principles
AttendX is an enterprise-grade attendance and laboratory management API server built for NSBM Green University with **Node.js, Express, and TypeScript**, backed by **Supabase Auth & PostgreSQL**.

### System Architecture
- **Stateless Authentication**: Validated against Supabase Auth cryptographic JWT signatures on every request.
- **Role-Based Access Control (RBAC)**: Authoritative roles (`student`, `lecturer`, `admin`) and account status (`active`, `suspended`, `inactive`) are queried from database profiles.
- **Dynamic 30-Second QR Tokens**: Short-lived, high-entropy tokens rotating every 30 seconds to prevent proxy attendance.
- **Server-Authoritative Clock**: All session windows, expirations, and attendance countdowns are derived strictly from server time.
- **Haversine Geofencing**: Server-side distance calculations against canonical laboratory coordinates.

---

## 2. Authentication & Authorization
All secured endpoints require an HTTP `Authorization` header with a valid Supabase access token:
```http
Authorization: Bearer <SUPABASE_ACCESS_TOKEN>
```

### Roles & Access Scopes
| Role | Allowed Operations |
| :--- | :--- |
| **`admin`** | Full university administration: users, terms, semesters, courses, rooms, enrollments, lecturer assignments, global audit ledgers, university-wide reports & exports. |
| **`lecturer`** | Manage assigned courses, schedule/open/close/cancel laboratory sessions, project rotating QR codes, view live rosters, perform audited corrections, and export session/course reports. |
| **`student`** | View personal dashboard, timetable, course attendance summaries, paginated attendance history, and mark attendance by scanning dynamic QR codes. Strictly isolated to own data. |

---

## 3. Standard Response Envelopes

### Success Response
```json
{
  "success": true,
  "data": {},
  "message": "Optional human-readable confirmation message"
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [],
  "total": 100,
  "page": 1,
  "limit": 20,
  "totalPages": 5
}
```

### Standard Error Response
```json
{
  "success": false,
  "message": "Human-readable error explanation",
  "code": "SPECIFIC_ERROR_CODE"
}
```

---

## 4. Complete API Route Catalog

### A. Health Check
- **`GET /api/health`**
  - Public endpoint returning API server status, node environment, version, and server timestamp.

### B. Authentication (`/api/auth`)
- **`GET /api/auth/me`**: Returns the verified user's profile, role, and permissions.
- **`POST /api/auth/logout`**: Terminates the active session.

---

### C. Student Endpoints (`/api/student`)
*Strictly restricted to users with role `student`. All requests query only the authenticated student's records (`req.profile.id`).*

#### 1. `GET /api/student/summary`
Returns the student's overall attendance rate across all enrolled courses and a per-course breakdown.
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "overall": {
        "totalCourses": 4,
        "totalSessionsHeld": 32,
        "attendedSessions": 28,
        "attendancePercentage": 87.5,
        "isEligible": true,
        "eligibilityThreshold": 80.0,
        "counts": { "present": 26, "late": 2, "absent": 4, "excused": 0, "cancelled": 2 }
      },
      "courses": [
        {
          "courseId": "uuid",
          "courseCode": "CS305",
          "courseName": "Distributed Systems",
          "faculty": "Computing",
          "credits": 4,
          "sessionsHeld": 8,
          "counts": { "present": 7, "late": 1, "absent": 0, "excused": 0, "cancelled": 1 },
          "attendancePercentage": 100.0,
          "isEligible": true,
          "eligibilityThreshold": 80.0
        }
      ]
    }
  }
  ```

#### 2. `GET /api/student/attendance-history`
Returns a paginated list of the student's individual attendance events.
- **Query Parameters**:
  - `page` (default: 1): Current page number
  - `limit` (default: 20, max: 100): Records per page
  - `courseId` (UUID, optional): Filter by specific course
  - `status` (`present` | `late` | `absent` | `excused`, optional): Filter by attendance status
  - `startDate` (YYYY-MM-DD, optional): Lower date boundary
  - `endDate` (YYYY-MM-DD, optional): Upper date boundary

---

### D. Attendance Marking (`/api/attendance`)
*Restricted to authenticated students.*

#### `POST /api/attendance/mark`
Processes dynamic QR code scan submissions through the 16-step verification pipeline.
- **Request Body**:
  ```json
  {
    "token": "64_character_hex_raw_dynamic_qr_token",
    "session_id": "optional_session_uuid",
    "location": {
      "latitude": 6.821325,
      "longitude": 80.041572,
      "accuracy": 12.5,
      "capturedAt": "2026-10-24T09:05:00.000Z"
    },
    "device_fingerprint": "optional_client_device_identifier"
  }
  ```
- **Response**: `201 Created`
  ```json
  {
    "success": true,
    "data": {
      "record_id": "uuid",
      "session_id": "uuid",
      "status": "present",
      "marked_at": "2026-10-24T09:05:01.000Z",
      "course_code": "CS305",
      "session_title": "Distributed Systems Lab 1"
    },
    "message": "Attendance marked successfully"
  }
  ```

---

### E. Lecturer Endpoints (`/api/lecturer`)
*Restricted to authenticated lecturers (`requireRole('lecturer')`). Lecturers can only access courses and sessions formally assigned to them.*

#### 1. Course & Roster Management
- **`GET /api/lecturer/courses`**: Lists courses assigned to the requesting lecturer.
- **`GET /api/lecturer/courses/:courseId/students`**: Lists enrolled students for an assigned course (`403` if unassigned).

#### 2. Session Lifecycle Management
- **`POST /api/lecturer/sessions`**: Schedules a laboratory session.
  ```json
  {
    "course_id": "uuid",
    "room_id": "uuid",
    "title": "Lab 01: Cloud Infrastructure",
    "session_type": "lab",
    "session_date": "2026-10-24",
    "start_time": "2026-10-24T09:00:00.000Z",
    "end_time": "2026-10-24T11:00:00.000Z",
    "attendance_window_minutes": 30,
    "notes": "Bring laptops"
  }
  ```
- **`GET /api/lecturer/sessions`**: Lists sessions created by lecturer (filterable by `courseId`, `status`, `sessionDate`).
- **`GET /api/lecturer/sessions/:id`**: Retrieves full session details and active roster.
- **`POST /api/lecturer/sessions/:id/open`**: Transitions session `scheduled` -> `active`.
- **`POST /api/lecturer/sessions/:id/close`**: Transitions session `active` -> `closed` and finalizes absentees.
- **`POST /api/lecturer/sessions/:id/cancel`**: Transitions session `scheduled`/`active` -> `cancelled` (terminal).

#### 3. Dynamic QR Rotation
- **`POST /api/lecturer/sessions/:sessionId/qr-token`**: Issues a new 30-second token and revokes older tokens.
- **`GET /api/lecturer/sessions/:sessionId/qr-tokens/expired`**: Inspects expired tokens.
- **`POST /api/lecturer/sessions/:sessionId/qr-tokens/cleanup`**: Purges expired tokens older than retention window.

#### 4. Attendance Corrections & Rosters
- **`GET /api/lecturer/sessions/:sessionId/attendance`**: Retrieves marked records and computed absentee list post-close.
- **`PATCH /api/lecturer/attendance/:attendanceId`**: Corrects attendance status with mandatory justification reason.
  ```json
  {
    "status": "excused",
    "reason": "Submitted valid university medical certificate approved by faculty",
    "notes": "Medical approved"
  }
  ```

#### 5. Dashboards & Reports
- **`GET /api/lecturer/dashboard`**: Overall operational stats for lecturer's assigned modules.
- **`GET /api/lecturer/reports/sessions/:sessionId`**: Granular attendance report with attendee list and summary stats.
- **`GET /api/lecturer/reports/courses/:courseId`**: Course-level attendance report across all sessions.
- **`GET /api/lecturer/reports/sessions/:sessionId/export?format=csv|xlsx|pdf`**: Exports official session report.
- **`GET /api/lecturer/reports/courses/:courseId/export?format=csv|xlsx|pdf`**: Exports course attendance report.

---

### F. Administrative Endpoints (`/api/admin`)
*Strictly restricted to users with role `admin` (`requireRole('admin')`).*

#### 1. User & Directory Management
- **`GET /api/admin/students`**: Paginated student profiles with search and enrollment counts.
- **`GET /api/admin/lecturers`**: Paginated lecturer profiles with assigned course counts.
- **`PATCH /api/admin/users/:id/status`**: Toggle user account status (`active`, `suspended`, `inactive`) with audit log.

#### 2. Academic Calendar
- **`GET /api/admin/academic-years`**, **`POST /api/admin/academic-years`**
- **`GET /api/admin/semesters`**, **`POST /api/admin/semesters`**

#### 3. Course & Venue Management
- **`GET /api/admin/courses`**, **`POST /api/admin/courses`**, **`PATCH /api/admin/courses/:id`**
- **`GET /api/admin/rooms`**, **`POST /api/admin/rooms`**, **`PATCH /api/admin/rooms/:id`**

#### 4. Enrollments & Teaching Assignments
- **`GET /api/admin/enrollments`**, **`POST /api/admin/enrollments`**, **`DELETE /api/admin/enrollments/:id`**
- **`GET /api/admin/assignments`**, **`POST /api/admin/assignments`**, **`DELETE /api/admin/assignments/:id`**

#### 5. System Audit Logs
- **`GET /api/admin/audit-logs`**: Immutable, append-only system audit log ledger (filterable by `actorId`, `sessionId`, `recordId`, `action`, date range).

#### 6. Institutional Dashboards & Reports
- **`GET /api/admin/dashboard`**: University-wide institutional metrics (total students, lecturers, courses, active semesters, overall attendance rate).
- **`GET /api/admin/reports/attendance`**: University-wide attendance queryable by `semesterId`, `courseId`, `startDate`, `endDate`, `status`.
- **`GET /api/admin/reports/export?format=csv|xlsx|pdf`**: Multi-format university export.

---

## 5. Attendance Percentage Formula & Rules
$$\text{Attendance Rate (\%)} = \left( \frac{\text{Present} + (\text{Late} \times \text{LATE\_SESSION\_WEIGHT})}{\text{Present} + \text{Late} + \text{Absent}} \right) \times 100$$

1. **Cancelled Sessions**: Excluded from both numerator and denominator.
2. **Excused Absences**: Excluded from denominator (no penalty).
3. **Late Sessions**: Weighted with factor $1.0$ (`lateSessionWeight`) towards 80% quota.
4. **Exam Eligibility Threshold**: $\ge 80.0\%$ per course.

---

## 6. Error Code Glossary
| HTTP Status | Error Code | Description |
| :--- | :--- | :--- |
| **400** | `VALIDATION_ERROR` | Request payload failed Zod schema validation. |
| **400** | `QR_INVALID` | Scanned token hash does not exist in `qr_tokens`. |
| **400** | `QR_EXPIRED` | Scanned token has expired past its 30-second window. |
| **400** | `QR_REVOKED` | Token was revoked due to session termination or rotation. |
| **400** | `SESSION_NOT_OPEN` | Session is not in `active` state. |
| **400** | `WINDOW_NOT_OPEN` | Current server time is before `attendance_opens_at`. |
| **400** | `SESSION_CLOSED` | Session is closed or past `attendance_closes_at`. |
| **400** | `LOCATION_REQUIRED`| GPS coordinates are mandatory for geofenced rooms. |
| **400** | `LOCATION_FAILED` | Student is outside the allowed room radius. |
| **401** | `NO_TOKEN` | Missing Bearer token in `Authorization` header. |
| **401** | `INVALID_TOKEN` | Supabase JWT signature invalid or expired. |
| **403** | `FORBIDDEN_ROLE` | Authenticated user lacks required role. |
| **403** | `ACCOUNT_INACTIVE`| Account status is `suspended` or `inactive`. |
| **403** | `NOT_ENROLLED` | Student is not actively enrolled in the course. |
| **403** | `UNAUTHORIZED_COURSE` | Lecturer is not assigned to the requested course. |
| **403** | `UNAUTHORIZED_SESSION` | Lecturer is not assigned to the requested session. |
| **404** | `NOT_FOUND` | Requested entity not found. |
| **409** | `ALREADY_MARKED` | Attendance already marked for this session. |
| **409** | `DUPLICATE_ENROLLMENT`| Student already enrolled in this course. |
| **409** | `DUPLICATE_ASSIGNMENT`| Lecturer already assigned to this course. |
