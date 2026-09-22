# ✅ Project Tasks

**VMS (Visitor Management System) – Task Breakdown & Development Plan**

This document contains the complete list of tasks for building the VMS application. Tasks are divided into phases with clear deliverables, priorities, and status tracking.

> **Source of truth for gap analysis:** [`doc/CASE_STUDY_1_VMS_FULL_ANALYSIS.md`](./CASE_STUDY_1_VMS_FULL_ANALYSIS.md)

| 📋 Total Tasks | ✅ Completed | ⚠️ Partial | 🔲 Remaining |
| :---: | :---: | :---: | :---: |
| **46** | **46** <br> 100% | **0** <br> 0% | **0** <br> 0% |

---

## ✅ Phase 1: Project Setup & Foundation
Set up the monorepo, frontend/backend scaffolding, and core configuration.

| # | Task | Priority | Status | Notes |
|---|---|---|---|---|
| 1.1 | Initialize monorepo (frontend/backend) | 🔴 High | ✅ Completed | React + Vite, Node + Express |
| 1.2 | Configure Tailwind CSS & shadcn/ui | 🔴 High | ✅ Completed | Apply minimal white-tone UI |
| 1.3 | Set up PostgreSQL & Prisma ORM | 🔴 High | ✅ Completed | Define initial schema |
| 1.4 | Configure Redis & Socket.io scaffolding | 🟡 Medium | ✅ Completed | Caching & Real-time prep |

---

## 👥 Phase 2: Authentication & Core Data
Implement JWT auth, role-based access, and basic seed data.

| # | Task | Priority | Status | Notes |
|---|---|---|---|---|
| 2.1 | Implement JWT authentication | 🔴 High | ✅ Completed | Stateless auth |
| 2.2 | Create role-based middleware (Admin/Host/Security) | 🔴 High | ✅ Completed | Guard routes |
| 2.3 | Build unified Login Page UI | 🔴 High | ✅ Completed |  |
| 2.4 | Seed Offices and Employee data | 🟡 Medium | ✅ Completed | `prisma seed` |

---

## 📝 Phase 3: Walk-in Registration & Approvals
Allow kiosks to register walk-ins and hosts to approve them.

| # | Task | Priority | Status | Notes |
|---|---|---|---|---|
| 3.1 | Build Kiosk Registration UI | 🔴 High | ✅ Completed | Capture name, email, photo |
| 3.2 | Implement walk-in API & Idempotency | 🔴 High | ✅ Completed | POST `/visitors/walk-in` |
| 3.3 | Build Host Approval Portal UI | 🔴 High | ✅ Completed | View pending visits |
| 3.4 | Implement approve/reject logic & Approval audit | 🔴 High | ✅ Completed | Transactional with idempotency keys |

---

## 🚀 Phase 4: Pre-Approval & Fast-Track
Allow hosts to schedule visitors in advance with QR e-passes.

| # | Task | Priority | Status | Notes |
|---|---|---|---|---|
| 4.1 | Build Invite Visitor UI | 🔴 High | ✅ Completed | Host schedules future visit |
| 4.2 | Enforce daily limit (5) via Redis | 🔴 High | ✅ Completed | Reject if limit reached |
| 4.3 | Generate & Email QR e-pass | 🔴 High | ✅ Completed | Nodemailer/Resend integrated into invite.service |
| 4.4 | Implement QR Scan auto-checkin API | 🔴 High | ✅ Completed | Public checkin API created; time window validated |

---

## 🖥️ Phase 5: Real-Time Front Desk Dashboard
Live dashboard for security to monitor and manage visitors.

| # | Task | Priority | Status | Notes |
|---|---|---|---|---|
| 5.1 | Integrate Socket.io (Backend & Frontend) | 🔴 High | ✅ Completed | HostDashboard and SecurityDashboard connected to real-time events |
| 5.2 | Build Front Desk Dashboard UI | 🔴 High | ✅ Completed | Filter by status, search, side panel |
| 5.3 | Implement Manual Checkout flow | 🟡 Medium | ✅ Completed | Works for `CheckedIn` and `Overstay` visitors |

---

## 🟡 Phase 6: Background Jobs, Photo Capture & Polish
Final steps to align perfectly with the assignment rubric.

| # | Task | Priority | Status | Notes |
|---|---|---|---|---|
| 6.1 | Mandatory Photo Capture in Kiosk | 🔴 High | ✅ Completed | `react-webcam` integrated; **backend does NOT enforce photo_url** |
| 6.2 | Automated Overstay Detection | 🔴 High | ✅ Completed | `node-cron` job for 8+ hours |
| 6.3 | Auto-Expire Pre-Approvals | 🔴 High | ✅ Completed | Cron exists; uses `Rejected` as proxy for Expired (see 7.6) |
| 6.4 | Complexity Estimation Document | 🟡 Medium | ✅ Completed | Needs accuracy fixes — see Phase 10 |
| 6.5 | Global Error Handling Polish | 🟢 Low | ✅ Completed | Express global handler exists |

---

## 🔴 Phase 7: Critical Gap Fixes (Case Study Compliance)
Features required by the LPU case study that are missing or broken. Mapped from [analysis §12.1](./CASE_STUDY_1_VMS_FULL_ANALYSIS.md#121-critical-case-study-compliance).

| # | Task | Priority | Status | Notes |
|---|---|---|---|---|
| 7.1 | Add Socket.io to HostDashboard for real-time updates | 🔴 High | ✅ Completed | Real-time events wired up using socket client |
| 7.2 | Implement Nodemailer — notify host on walk-in + email QR on invite | 🔴 High | ✅ Completed | Using Resend API for all emails |
| 7.3 | Add QR scanner to Kiosk for pre-approved fast-track | 🔴 High | ✅ Completed | `html5-qrcode` integrated in Kiosk UI |
| 7.4 | Validate invite time window during check-in | 🔴 High | ✅ Completed | `visitor.service.js` strictly validates parent invite time window |
| 7.5 | Add `Expired` to VisitStatus enum and fix cron | 🔴 High | ✅ Completed | DB migrated and cron accurate expiration implemented |
| 7.6 | Fix Overstay checkout bug | 🔴 High | ✅ Completed | Fixed checkout validation in service |
| 7.7 | Build functional AdminDashboard | 🔴 High | ✅ Completed | React UI + backend endpoints for stats/employees/approvals done |
| 7.8 | Generate QR badge/pass after walk-in approval | 🟡 Medium | ✅ Completed | QR sent via Resend on approval |

---

## 🟡 Phase 8: Production Readiness & Security Hardening
Fixes from [analysis §12.2](./CASE_STUDY_1_VMS_FULL_ANALYSIS.md#122-functional--product).

| # | Task | Priority | Status | Notes |
|---|---|---|---|---|
| 8.1 | Rate-limit the public `/walk-in` endpoint | 🔴 High | ✅ Completed | Added express-rate-limit to public kiosk routes |
| 8.2 | Lock down employee self-registration | 🔴 High | ✅ Completed | Hardcoded new registrations to 'Host' role |
| 8.3 | Fix `GET /api/auth/me` to return full profile | 🟡 Medium | ✅ Completed | Now queries Prisma for full employee profile |
| 8.4 | Extract hardcoded `localhost:4000` to env variable | 🔴 High | ✅ Completed | Created `config.js` and `api/client.js` wrapping all endpoints. |
| 8.5 | Upload photos to cloud storage (S3/Cloudinary) | 🟡 Medium | ✅ Completed | Saving Base64 strings to local disk as JPGs to prevent DB bloat |
| 8.6 | Add input validation middleware (Zod) to all routes | 🟡 Medium | ✅ Completed | Zod validation applied to Auth, Visitor, and Invite routes |
| 8.7 | Authenticate Socket.io connections with JWT | 🟡 Medium | ✅ Completed | JWT verification added to socket handshake |
| 8.8 | Add office directory API for registration | 🟢 Low | ✅ Completed | Added `GET /api/offices` and wired into Register UI |

---

## ✅ Phase 9: Code Quality & Polish
Fixes from [analysis §12.3](./CASE_STUDY_1_VMS_FULL_ANALYSIS.md#123-technical-debt--production-readiness).

| # | Task | Priority | Status | Notes |
|---|---|---|---|---|
| 9.1 | Create shared `apiClient` utility for frontend | 🟡 Medium | ✅ Completed | All UI components refactored to use `src/api` module |
| 9.2 | Replace native `alert()` with toast notifications | 🟢 Low | ✅ Completed | Replaced with `sonner` toasts. |
| 9.3 | Add pagination to list endpoints | 🟡 Medium | ✅ Completed | Added `take`/`skip` to Prisma endpoints. |
| 9.4 | Extract duplicate `emitVisitUpdate` to shared utility | 🟢 Low | ✅ Completed | Moved to `socket.utils.js`. |
| 9.5 | Add loading skeleton components | 🟢 Low | ✅ Completed | Added `Loader2` to dashboards. |
| 9.6 | Wire up or remove dead SecurityDashboard UI | 🟢 Low | ✅ Completed | Removed dead cosmetic UI. |
| 9.7 | Add Host invite history UI | 🟢 Low | ✅ Completed | Added fetch and display for `/api/invites` on HostDashboard. |
| 9.8 | Remove duplicate `/` route in App.jsx | 🟢 Low | ✅ Completed | Cleaned up duplicate path. |
| 9.9 | Fix Redis invite counter race condition | 🟢 Low | ✅ Completed | DB write wrapped in try/catch to revert quota on failure. |

---

## ✅ Phase 10: Documentation Alignment
Docs that claim features not actually implemented. From [analysis §3 note, §8](./CASE_STUDY_1_VMS_FULL_ANALYSIS.md).

| # | Task | Priority | Status | Notes |
|---|---|---|---|---|
| 10.1 | Align ARCHITECTURE.md with actual code | 🟡 Medium | ✅ Completed | Updated architecture details including JWT flow, Resend API integration, and file structures. |
| 10.2 | Fix COMPLEXITY_ANALYSIS.md inaccuracies | 🟡 Medium | ✅ Completed | Fixed complexity analysis to reflect Zod validation, local Base64 storage, and correct Redis usage. |
| 10.3 | Update SECURITY.md with current reality | 🟢 Low | ✅ Completed | Updated file upload logic and exact idempotency implementations. |
