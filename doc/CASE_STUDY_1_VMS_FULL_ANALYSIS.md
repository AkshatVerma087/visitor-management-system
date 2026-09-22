# Case Study 1 — Visitor Management System  
## Complete Code Analysis, Workflow Map & Gap Report

> **Source problem statement:** `extra/LPU Frontend Case Studies.pdf` (Case Study #1 — Visitor Management System, pages 2–5)  
> **Codebase analysed:** `vms/` (React + Vite frontend, Node/Express + Prisma + PostgreSQL + Redis + Socket.io backend)  
> **Date:** September 2026  
> **Purpose of this document:** Explain how every part of the current implementation works, map it against the PDF requirements, and list concrete gaps / improvements.

---

## Table of Contents

1. [Problem Statement (from PDF)](#1-problem-statement-from-pdf)
2. [What We Built — High-Level Overview](#2-what-we-built--high-level-overview)
3. [Architecture & Tech Stack](#3-architecture--tech-stack)
4. [Database Model & Status Machine](#4-database-model--status-machine)
5. [Authentication & Roles](#5-authentication--roles)
6. [End-to-End Workflows (How Things Actually Work)](#6-end-to-end-workflows-how-things-actually-work)
7. [Real-Time Layer (Socket.io)](#7-real-time-layer-socketio)
8. [Redis Usage](#8-redis-usage)
9. [Background Jobs (Cron)](#9-background-jobs-cron)
10. [Frontend Surfaces by Role](#10-frontend-surfaces-by-role)
11. [Requirement Coverage Matrix (PDF vs Code)](#11-requirement-coverage-matrix-pdf-vs-code)
12. [Gaps — Critical / Functional / Technical Debt](#12-gaps--critical--functional--technical-debt)
13. [Bugs Found During Analysis](#13-bugs-found-during-analysis)
14. [Prioritised Improvement Plan](#14-prioritised-improvement-plan)
15. [File Inventory (Source of Truth)](#15-file-inventory-source-of-truth)

---

## 1. Problem Statement (from PDF)

The LPU Frontend Case Studies PDF defines **Case Study #1: Visitor Management System (VMS)** as a workplace security system that tracks visitors under strict access control. Required functional areas:

### I. Visitor Registration

Capture systematically:

| Field | Intent |
|---|---|
| Full name | Legal identification |
| Contact (mobile and/or email) | Communication & verification |
| Purpose of visit | Meeting, maintenance, interview, delivery, etc. |
| Host employee (name + department) | Who they are visiting |
| Company / organisation | Business affiliation |
| Check-in / check-out time | Automatic security logging |
| **Mandatory photo capture** | Identity verification at desk/kiosk |

**Process described in PDF:**

1. Security guard or **self-service kiosk** collects details + photo.
2. System **automatically sends a request to the host** for approval.
3. After approval, a **visitor badge (physical or digital QR)** is generated.

### II. Approval Workflow

Every visitor must be approved by the host.

1. **Real-time notification** to host (email, SMS, or app notification).
2. Host can **approve / reject** via mobile app, web portal, or IVR.
3. On approval → entry allowed + digital/printed pass issued.
4. On rejection → visitor denied; security notified.
5. **Approval history** kept for audit.

### III. Pre-Approval for Convenience

- Hosts schedule access for a **specific date + time window**.
- Pre-approved visitors get a **QR / e-pass via email or SMS** and scan on arrival to **bypass manual approval**.
- Unused passes **auto-expire** after the window.
- Admins can enforce limits (example: **max 5 visitors per employee per day**).

**Use cases called out:** client/vendor meetings in advance, fast-track frequent visitors (maintenance), reduce day-of host workload.

### IV. Evaluation Plus Points (PDF overall criteria)

Complexity estimation, UX feedback, error handling, performance, scalability, functionality completeness.

> **Note:** PDF Case Studies #2 (Vendor Cab) and #3 (Shuttle) are out of scope for this project. This document covers **#1 only**.

---

## 2. What We Built — High-Level Overview

We built a **full-stack VMS monorepo** with three personas:

| Persona | Entry point | Primary job |
|---|---|---|
| **Visitor** | Public `/kiosk` | Walk-in self-registration + webcam photo |
| **Host** | `/dashboard` (role Host) | Approve/reject pending visits; pre-register guests |
| **Security** | `/dashboard` (role Security) | Live front-desk board; manual check-in / check-out |
| **Admin** | `/dashboard` (role Admin) | **Placeholder only** (not a real product surface yet) |

**Happy path that works today:**

```
Kiosk walk-in → Visit(Pending)
     → Host Approve/Reject (with Approval audit + idempotency)
     → Security Check-In (Approved → CheckedIn)
     → Security Check-Out (CheckedIn → CheckedOut)
```

**Pre-approval path that partially works:**

```
Host creates Invite → Visit(Approved) + QR generated in UI
     → Daily limit enforced in Redis (max 5 invites/host/day)
     → QR is NOT emailed; kiosk has NO QR scanner
     → Security can still manually Check-In from dashboard
```

---

## 3. Architecture & Tech Stack

```
┌─────────────────────────────────────────────────────────────┐
│ Browser / Kiosk (React 18 + Vite + Tailwind + shadcn/ui)    │
│  /kiosk | /login | /register | /dashboard (role-routed)     │
└──────────────────────┬──────────────────────────────────────┘
                       │ REST + Socket.io-client
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ Express API (Node.js)                                       │
│  /api/auth  /api/employees  /api/visitors  /api/invites     │
│  Socket.io (same process)   node-cron (every minute)        │
└──────────────┬──────────────────────────┬───────────────────┘
               ▼                          ▼
        PostgreSQL (Prisma)            Redis (ioredis)
```

| Layer | Technology | Actual use in this repo |
|---|---|---|
| Frontend | React 18 + Vite | SPA |
| UI | Tailwind + shadcn-style primitives | Cards, buttons, inputs |
| Backend | Express | REST API |
| ORM / DB | Prisma → PostgreSQL | Source of truth |
| Cache | Redis (ioredis) | **Only** daily invite rate limit |
| Real-time | Socket.io | Security dashboard live updates |
| Jobs | node-cron | Overstay + auto-expire |
| QR | `qrcode` npm | Base64 data URL of visit UUID |
| Photo | `react-webcam` | Base64 JPEG stored in DB |
| Auth | JWT + bcryptjs | Stateless Bearer tokens |

**Important architecture doc vs reality:** `doc/ARCHITECTURE.md` mentions Nodemailer, Redis idempotency, JWT blacklist, and “JWT in memory.” The **running code does not** implement Nodemailer or Redis idempotency; the frontend stores JWT in **`localStorage`** (`vms_token`).

---

## 4. Database Model & Status Machine

Defined in `vms/backend/prisma/schema.prisma`.

### Models

```
Office 1──* Employee
Office 1──* Visit
Office 1──* Invite

Employee (host) 1──* Visit
Employee (host) 1──* Invite
Employee (decider) 1──* Approval

Invite 1──* Visit (optional invite_id)
Visit 1──* Approval
```

| Model | Purpose |
|---|---|
| **Office** | Multi-office tenant; seed creates one HQ |
| **Employee** | Internal users: Admin / Host / Security |
| **Invite** | Pre-registration container (event, date, time window) |
| **Visit** | One visitor instance (walk-in or invite guest) |
| **Approval** | Audit row for host decisions; unique `idempotency_key` |

### VisitStatus enum (as implemented)

```
Pending → Approved → CheckedIn → CheckedOut
              ↘ Rejected
CheckedIn → Overstay   (cron)
Approved  → Rejected   (cron uses Rejected as “Expired” proxy)
```

**Missing from schema (needed by PDF):** `Expired` status, dedicated QR/token table, notification log, guest profile reuse table, admin-configurable limit settings.

### Seed users (`prisma/seed.js`)

| Email | Role | Password |
|---|---|---|
| `admin@office.com` | Admin | `password123` |
| `host@office.com` | Host | `password123` |
| `security@office.com` | Security | `password123` |

Office: `HQ`, `123 Main St`.

---

## 5. Authentication & Roles

### Backend

| Endpoint | Auth | Behaviour |
|---|---|---|
| `POST /api/auth/register` | **Public** | Client chooses `role` (including Admin) — security hole |
| `POST /api/auth/login` | Public | bcrypt compare → JWT `{ id, role, office_id }` (1d) |
| `GET /api/auth/me` | `protect` | Returns **JWT payload only**, not full DB profile |

Middleware:

- `auth.middleware.js` → `protect` (Bearer JWT → `req.user`)
- `role.middleware.js` → `restrictTo(...roles)`

### Route protection matrix

| Method | Path | Auth | Roles |
|---|---|---|---|
| POST | `/api/visitors/walk-in` | **Public** | — |
| GET | `/api/employees/hosts` | **Public** | — |
| GET | `/api/visitors/host` | protect | Host, Admin |
| POST | `/api/visitors/:id/decision` | protect | Host, Admin |
| GET | `/api/visitors/today` | protect | Security, Admin |
| POST | `/api/visitors/:id/checkin` | protect | Security, Admin |
| POST | `/api/visitors/:id/checkout` | protect | Security, Admin |
| POST | `/api/invites` | protect | Host, Admin |
| GET | `/api/invites` | protect | Host, Admin |

### Frontend

- `ProtectedRoute` only checks that a token exists.
- **No route-level role guard** — wrong-role users still land on `/dashboard`, which then renders by `user.role`.
- Token + user cached in `localStorage`.

---

## 6. End-to-End Workflows (How Things Actually Work)

### 6.1 Walk-In Registration (Kiosk)

**UI:** `vms/frontend/src/pages/Kiosk.jsx`  
**API:** `POST /api/visitors/walk-in` → `visitor.controller.registerWalkIn` → `visitor.service.registerWalkIn`

```
Visitor opens /kiosk
  → GET /api/employees/hosts (host dropdown)
  → Fills name, email, phone, company, purpose, selects host
  → Captures mandatory photo via react-webcam (base64 JPEG)
  → Submits form
  → Backend:
       - Validates visitor_name, visitor_email, host_id
       - Loads host → copies host.office_id
       - Creates Visit { status: Pending, expected_arrival: now, photo_url }
       - Emits Socket.io visit:updated to office:{officeId}:{date}
  → Kiosk shows success: host has been notified
```

**What works:** Form, webcam, host list, Pending visit creation, socket emit.  
**What does not match PDF:**

- Host is **not** emailed / SMS’d / push-notified (only a socket event if Security dashboard is listening; Host dashboard does **not** listen).
- Backend does **not** require `photo_url` (only frontend UI does).
- No visitor badge / QR generated after approval (TODO in service).

### 6.2 Host Approval / Rejection

**UI:** `HostDashboard.jsx`  
**API:** `GET /api/visitors/host`, `POST /api/visitors/:id/decision`

```
Host logs in → Dashboard fetches own visits
  → Sees Pending cards (photo, name, company, purpose)
  → Clicks Approve or Reject
  → POST { decision, idempotency_key }
  → Backend makeDecision:
       1. Reject if decision not Approved|Rejected
       2. If idempotency_key already in Approval → return existing visit (no double-process)
       3. Verify visit exists, host owns it, status is still Pending
       4. Prisma $transaction: create Approval + update Visit.status
       5. TODO: email QR if approved  ← not implemented
       6. Emit visit:updated
  → UI optimistically updates card
```

**What works:** Ownership check, transactional decision, Approval audit trail, idempotency keys.  
**What fails PDF intent:**

- No real-time host board updates (must refresh / remount). Comment in code: *“In a real app we might poll or use websockets”*.
- No email/SMS/app alert on walk-in.
- No digital pass / QR issued to visitor after approval.
- Admin role is allowed by route middleware, but **service ownership check** (`visit.host_id !== hostId`) blocks Admin from approving another host’s visit.

### 6.3 Pre-Approval / Invite (Fast-Track Intent)

**UI:** `InviteVisitorModal.jsx` (opened from HostDashboard)  
**API:** `POST /api/invites` → `invite.service.createInvite`

```
Host fills event title, date, start/end time, guest list
  → Redis INCR daily_invites:{hostId}:{YYYY-MM-DD}
       if count > 5 → DECR + throw (429-style error)
  → Create Invite + nested Visits all status=Approved
  → Emit visit:updated for each visit
  → Generate QRCode.toDataURL(visit.id) for each guest
  → Return QRs to modal
  → UI text says QRs were "emailed"  ← SIMULATED
```

**What works:** Invite + Approved visits, Redis daily limit, QR image generation, socket notify.  
**What fails PDF:**

| PDF requirement | Reality |
|---|---|
| QR/e-pass via **email or SMS** | **Done** (Uses Resend API) |
| Scan on arrival to bypass queue | **No scanner UI** anywhere |
| Expire if outside window | Cron expires after **24h from expected_arrival**, not end of time window; status set to **Rejected** not Expired |
| Admin-configurable limit | Hardcoded `5` in service |
| Search/reuse existing guest profiles | Guests typed fresh every time |
| Visit type / note | Schema supports; modal often doesn’t send them |

`GET /api/invites` exists but Host UI never lists past invites.

### 6.4 Security Front Desk

**UI:** `SecurityDashboard.jsx`  
**API:** `GET /api/visitors/today`, `POST .../checkin`, `POST .../checkout`

```
Security logs in
  → Fetches today’s visits for office_id
  → Connects Socket.io → emit join:office { officeId, date }
  → Listens visit:updated → merges into table live
  → Tabs: All / Pending / Active / Pre-approved (+ search)
  → Row click → side panel (details + timeline)
  → Check-In if Approved; Check-Out if CheckedIn
```

**What works:** Real-time board, filters, search, manual check-in/out, side panel.  
**Incomplete UI:**

- “Filter” button — no `onClick`
- “Register visitor” button — no `onClick`
- “Additional Information” textarea — cosmetic only (not persisted)

**QR path:** Route comment says check-in is for QR scan, but the only way to check in today is the **button**. There is no camera/QR reader on kiosk or security UI.

### 6.5 Check-In / Check-Out Rules

| Action | Function | Allowed from | Result |
|---|---|---|---|
| Check-in | `checkIn` | `Approved` only | `CheckedIn` + `check_in_time` |
| Check-out | `checkOut` | `CheckedIn` only | `CheckedOut` + `check_out_time` + `checked_out_by` |

**Bug:** After cron marks a visit `Overstay`, security **cannot check them out** because checkout requires `CheckedIn`. Overstay visitors get stuck.

### 6.6 Registration of Employees

`Register.jsx` → `POST /api/auth/register` requires a raw **`office_id` UUID** (no office picker API). Anyone can register as Admin.

---

## 7. Real-Time Layer (Socket.io)

**Server:** `vms/backend/src/socket/socket.js`  
**Init:** `server.js` → `initSocket(httpServer)`

| Item | Value |
|---|---|
| Client join event | `join:office` with `{ officeId, date }` |
| Room name | `office:{officeId}:{date}` (date = `YYYY-MM-DD`) |
| Broadcast event | `visit:updated` (payload ≈ visit + host) |

**Who emits:** `visitor.service.js`, `invite.service.js`, `cron.jobs.js`  
**Who listens:** **only** `SecurityDashboard.jsx`

**Gaps:**

- HostDashboard does not subscribe → walk-ins are not live for hosts.
- Socket connections are **unauthenticated** — anyone who knows an `officeId` can join the room.
- Date string uses UTC `toISOString().split('T')[0]` on server vs client “today” — risk of missing rooms near midnight / non-UTC offices.

---

## 8. Redis Usage

**Client:** `vms/backend/src/lib/redis.js` (ioredis; default `redis://localhost:6379`)

| Claimed in comments / architecture docs | Implemented? |
|---|---|
| Idempotency key cache | **No** — Approval uniqueness is Prisma-only |
| Daily invite limits | **Yes** — only real usage |
| Office list / JWT blacklist cache | **No** |

**Invite counter:**

```
Key:  daily_invites:{hostId}:{YYYY-MM-DD}
Ops:  INCR; first hit → EXPIRE 86400; if >5 → DECR + error
```

**Quirks:** Counts **invite creations**, not total guests. Counter increments **before** DB write — if Prisma fails after INCR, quota is still consumed (decr only happens on limit exceed).

---

## 9. Background Jobs (Cron)

**File:** `vms/backend/src/jobs/cron.jobs.js`  
**Schedule:** every minute (`* * * * *`) from `server.js`

### Job 1 — Overstay detection

- Find `CheckedIn` where `check_in_time < now - 8 hours`
- Set status → `Overstay`
- Emit `visit:updated`
- **No email/alert** to security or host
- **No remediation path** (cannot check out — see bug above)

### Job 2 — Auto-expire unused approvals

- Find `Approved` where `expected_arrival < now - 24 hours`
- Set status → **`Rejected`** with code comment: *“Using Rejected as proxy for Expired”*
- Does **not** use Invite `end_time` window
- Pending walk-ins never auto-expire
- Expired vs host-rejected visits are **indistinguishable** in UI/reports

---

## 10. Frontend Surfaces by Role

### Routes (`App.jsx`)

| Path | Component | Guard |
|---|---|---|
| `/` | Navigate → `/kiosk` | — |
| `/kiosk` | Kiosk | Public |
| `/login` | Login | Public |
| `/register` | Register | Public |
| `/dashboard` | Dashboard shell | Token required |

There is a **duplicate** `<Route path="/">` that navigates to `/dashboard` — it never runs because the first `/` wins.

### Role → UI

| Role | Component | Status |
|---|---|---|
| Host | `HostDashboard` + `InviteVisitorModal` | Functional core |
| Security | `SecurityDashboard` | Functional + live socket |
| Admin | `AdminDashboard` | **Stub paragraph only** |

Admin cannot use Host/Security UIs without changing role, even though some APIs allow Admin.

---

## 11. Requirement Coverage Matrix (PDF vs Code)

| # | PDF requirement | Implementation status | Evidence |
|---|---|---|---|
| 1 | Capture name, contact, purpose, host, company | **Done** | Kiosk form + Visit model |
| 2 | Check-in / check-out timestamps | **Done** | `check_in_time` / `check_out_time` |
| 3 | Mandatory photo at registration | **Partial** | Webcam UI yes; backend optional; stored as base64 in DB |
| 4 | Auto request to host for approval | **Partial** | Visit created Pending; **no email/SMS**; host UI not live |
| 5 | Badge / QR after approval | **Missing** | TODO in `makeDecision`; no QR on walk-in approve |
| 6 | Real-time host notification (email/SMS/app) | **Missing / weak** | Socket only to Security; Host must refresh |
| 7 | Host approve/reject via web portal | **Done** | HostDashboard + decision API |
| 8 | Approval history for audit | **Done** | `Approval` table |
| 9 | Security notified on rejection | **Partial** | Socket if Security board open; no dedicated alert |
| 10 | Pre-approve date + time window | **Partial** | Invite stores start/end; check-in does **not** validate window |
| 11 | QR/e-pass via email or SMS | **Done** | Implemented using Resend (`mailer.js`) |
| 12 | Scan QR to bypass approval | **Missing** | No scanner; manual Security check-in only |
| 13 | Auto-expire unused pre-approvals | **Partial** | Cron exists; wrong status; not tied to end_time |
| 14 | Admin limit max 5/employee/day | **Partial** | Hardcoded Redis limit on **invites**, not guest count; Admin cannot configure |
| 15 | Front desk / security monitoring | **Done** | SecurityDashboard |
| 16 | Admin analytics / config | **Missing** | AdminDashboard placeholder |
| 17 | Complexity / docs for grading | **Done separately** | `doc/COMPLEXITY_ANALYSIS.md`, PRD, etc. |

**Summary score (honest):** Core walk-in → approve → check-in/out loop is real. Fast-track (email + scan), true host notifications, and Admin product surface are the largest case-study gaps.

---

## 12. Gaps — Critical / Functional / Technical Debt

### 12.1 Critical (Case-study compliance)

1. **Host has no live notifications** — no Socket.io on HostDashboard; no email/SMS.
2. **QR email/SMS delivery is implemented via Resend**, but needs testing.
3. **No QR scan path** — kiosk/security cannot scan e-pass for auto check-in.
4. **Walk-in approval does not issue a badge/QR** — PDF step 3 after approval.
5. **AdminDashboard is a stub** — no analytics, employee mgmt, office config, limit config.
6. **Expired vs Rejected conflated** — schema lacks `Expired`; cron writes `Rejected`.
7. **Check-in ignores invite time window** — any Approved visit can be checked in anytime (until 24h expire cron).

### 12.2 Functional / product

8. Overstay visitors cannot check out.
9. No guest profile search/reuse for frequent visitors (PDF use case).
10. Invite list API unused — hosts cannot review past invites.
11. Security “Filter” / “Register visitor” / notes textarea are dead UI.
12. Photo not enforced server-side.
13. Public walk-in + public hosts list have no rate limit / CAPTCHA / kiosk API key.
14. Open self-registration of Admin role.
15. Register requires raw office UUID — no office directory API.
16. `GET /api/auth/me` returns JWT only → after refresh, `name`/`email` missing in UI (avatar falls back to `"U"`).

### 12.3 Technical debt / production readiness

17. Hardcoded `http://localhost:4000` across frontend (10+ places).
18. Base64 photos in PostgreSQL → DB bloat / slow payloads.
19. No shared frontend `apiClient`; repeated `fetch` + headers.
20. Native `alert()` for errors instead of toasts.
21. No route-level Zod/Joi validation middleware.
22. No pagination on host/today list endpoints.
23. Duplicate `emitVisitUpdate` helper in visitor service + cron.
24. Redis comments overstate capabilities.
25. Architecture docs claim Nodemailer / in-memory JWT — diverge from code.
26. Socket rooms unauthenticated.
27. Timezone UTC date-key mismatch risk.
28. Invite Redis quota race with failed transactions.
29. Duplicate `/` route in `App.jsx`.
30. Secrets in local `.env` (treat carefully for demos / GitHub).

---

## 13. Bugs Found During Analysis

| Severity | Bug | Detail |
|---|---|---|
| High | Overstay stuck | `checkOut` allows only `CheckedIn`; Overstay cannot exit |
| High | Fake email UX | Invite modal claims email delivery that never happens |
| Medium | Admin cannot approve others’ visits | Middleware allows Admin; service ownership blocks |
| Medium | Auth `/me` incomplete | Session restore loses name/email |
| Medium | Photo optional on API | Client can POST walk-in without photo |
| Medium | Expire semantics wrong | Rejected ≠ Expired for reporting/security |
| Low | Success reset clears photo inconsistently | Kiosk success timeout resets fields but photo_url handling is incomplete in reset object |
| Low | Dead duplicate route | Second `/` → `/dashboard` unreachable |

---

## 14. Prioritised Improvement Plan

### P0 — Must fix to match Case Study #1

| # | Change | Where |
|---|---|---|
| 1 | Add Socket.io to HostDashboard (same room/event as Security) | `HostDashboard.jsx` |
| 2 | Integrate Nodemailer (or SMS) — notify host on walk-in; email QR on invite / on walk-in approve | new `mailer` util; `visitor.service`, `invite.service` |
| 3 | Add QR scanner mode on Kiosk (or Security) → call `POST /visitors/:id/checkin` | `Kiosk.jsx` + `html5-qrcode` / similar |
| 4 | Validate invite `start_time`–`end_time` inside `checkIn` | `visitor.service.js` |
| 5 | Add `Expired` to `VisitStatus`; use it in cron; update badges/filters | `schema.prisma`, cron, dashboards |
| 6 | Allow checkout from `Overstay` (or auto-prompt security) | `checkOut` |
| 7 | Build real AdminDashboard: counts, employees, offices, audit approvals, configure daily limit | `AdminDashboard.jsx` + APIs |

### P1 — Production / demo quality

| # | Change |
|---|---|
| 8 | Central `VITE_API_URL` + `apiClient` |
| 9 | Rate-limit public `/walk-in` (and optionally hosts list) |
| 10 | Upload photos to object storage; store URL only |
| 11 | Server-side require photo; Zod validation on all writes |
| 12 | Lock down register (no free Admin); office picker |
| 13 | Authenticate Socket.io joins with JWT |
| 14 | Wire or remove dead Security UI controls |
| 15 | Guest search/reuse profiles for frequent visitors |

### P2 — Polish

| # | Change |
|---|---|
| 16 | Toasts instead of `alert()` |
| 17 | Pagination + loading skeletons |
| 18 | Shared `emitVisitUpdate` util |
| 19 | Align ARCHITECTURE.md / PRD with actual code |
| 20 | Host invite history UI using `GET /api/invites` |

---

## 15. File Inventory (Source of Truth)

### Backend

```
vms/backend/
  server.js                          # HTTP + Socket + Cron
  prisma/schema.prisma               # Models & enums
  prisma/seed.js                     # HQ + 3 users
  src/app.js                         # Express mounts
  src/lib/prisma.js
  src/lib/redis.js
  src/middleware/auth.middleware.js
  src/middleware/role.middleware.js
  src/socket/socket.js
  src/jobs/cron.jobs.js
  src/modules/auth/*
  src/modules/employee/*
  src/modules/visitor/*
  src/modules/invite/*
```

### Frontend

```
vms/frontend/src/
  App.jsx
  main.jsx
  context/AuthContext.jsx
  pages/Kiosk.jsx
  pages/Login.jsx
  pages/Register.jsx
  pages/Dashboard.jsx
  components/dashboard/HostDashboard.jsx
  components/dashboard/SecurityDashboard.jsx
  components/dashboard/AdminDashboard.jsx
  components/dashboard/InviteVisitorModal.jsx
  components/ui/*
```

### Related docs already in repo

| Doc | Role |
|---|---|
| `doc/PRD.md` | Product intent for pre-approval slice |
| `doc/ARCHITECTURE.md` | Target architecture (partly aspirational) |
| `doc/task.md` | Task board including Phase 7–9 gap fixes |
| `doc/COMPLEXITY_ANALYSIS.md` | Grading plus-point |
| `case_study_analysis.md` | Earlier shorter analysis (superseded in depth by this file) |

---

## Closing Verdict

The project successfully implements a **credible core VMS loop**: kiosk walk-in with photo, host approve/reject with audit + idempotency, security live board with check-in/out, Redis daily invite caps, QR generation, and cron overstay/expire jobs.

Against **LPU Case Study #1**, the incomplete pieces that most hurt compliance and demo story are:

1. **Notifications** (host email/SMS/app + live host UI)  
2. **True fast-track** (email the QR **and** scan it)  
3. **Admin product surface** + configurable limits  
4. **Correct expiry semantics** and overstay checkout  

Fixing the P0 list above closes the gap between “AI-built MVP that works” and “assignment-complete Visitor Management System.”
