# 🎨 Design System

**Visitor Management System (VMS) – Professional. Secure. Frictionless.**

This document defines the visual design system, UI components, and aesthetic guidelines for the VMS. The goal is to create a modern, minimal, and enterprise-ready experience for both visitors and staff.

---

## 1. Design Principles

| 👥 User-Centered | 🍃 Minimal & Clean | 🛡️ Secure & Trustworthy |
| :--- | :--- | :--- |
| Simple and intuitive for hosts and front-desk staff. | Reduce clutter and focus on core content and actions. | Professional aesthetics that instill confidence in enterprise security. |

---

## 2. Color Palette

To achieve a premium, minimal "white tone" UI, we rely on high-contrast monochromes and very subtle off-white backgrounds rather than loud primary colors.

| Color | Hex Code | Usage |
| :--- | :--- | :--- |
| **⬜ Base Background**| `#FAFAFA` | Main application background. A soft, warm off-white (Zinc 50). |
| **🔲 Surface**        | `#FFFFFF` | Cards, modals, and elevated elements. Pure white for crisp contrast against the base. |
| **🟦 Primary (Blue)** | `#2563EB` | Crisp brand color (Blue 600). Used for primary buttons, active states, and accents. |
| **🌫️ Secondary**     | `#F4F4F5` | Subtle backgrounds for secondary buttons and inactive tabs (Zinc 100). |
| **🟩 Success**       | `#059669` | Success messages, completed check-ins (Emerald 600 - darker for readability). |
| **🟨 Warning**       | `#D97706` | Warning messages, overstay alerts, pending approvals (Amber 600). |
| **🟥 Danger**        | `#DC2626` | Destructive actions, rejections, expired passes (Red 600). |

---

## 3. Typography

We use **Inter** as the primary font to maintain a structured, ultra-clean aesthetic. Text color relies on deep grays rather than pure black for a softer premium feel.

> **Aa - Inter**
> *Primary Font*
> Clean, modern and highly readable. 

- **Headings:** Inter SemiBold, Color: `#18181B` (Zinc 900)
- **Body:** Inter Regular, Color: `#52525B` (Zinc 500)
- **Labels:** Inter Medium, Color: `#71717A` (Zinc 400)

---

## 4. UI Components

Standard components designed for a minimal, white-toned aesthetic (built with Tailwind CSS and shadcn/ui).

### Buttons
- **Primary:** Background `#2563EB` (Blue 600), White text. Creates a clean, professional focal point.
- **Secondary:** Background `#F4F4F5` (Subtle gray), Text `#18181B`. Used for secondary actions (e.g., "Cancel", "Edit").
- **Ghost:** Transparent background, hover state `#F4F4F5`. For low-emphasis actions.
- **Destructive:** Background `#DC2626`, White text. 

### Cards & Layouts
- **Cards:** Pure white (`#FFFFFF`) with an ultra-subtle border (`border-zinc-200`) and a very faint shadow (`shadow-sm`).
- **Layout:** Soft off-white background (`#FAFAFA`) to make the pure white cards gently stand out without feeling boxed in.

### Status Badges
- **Pending:** Amber background (`bg-amber-50`), Amber text (`text-amber-700`), faint border (`border-amber-200`).
- **Checked In (Pre-Approved):** Emerald background (`bg-emerald-50`), Emerald text (`text-emerald-700`), faint border.
- **Overstay/Expired:** Red background (`bg-red-50`), Red text (`text-red-700`), faint border.

---

# ⚙️ Technical Design Document

## 1. System Overview
The Visitor Management System (VMS) is designed for workplace security and front desk operations. It provides an end-to-end solution for walk-in visitor registrations, host approval workflows, and a fast-track pre-approval scheduling system.

## 2. Architecture & Tech Stack
- **Frontend:** React 18, Vite, TailwindCSS, Socket.io-client.
- **Backend:** Node.js, Express, Socket.io (same process as Express for real-time events).
- **Database:** PostgreSQL (via Prisma ORM) for relational integrity, limits, and transactional state.
- **Cache/Coordination:** Redis for idempotency keys, rate limits, and daily pre-approval counters.
- **Email:** Nodemailer (SMTP) for QR code e-pass delivery.
- **Background Jobs:** node-cron for overstay detection.

## 3. Data Model (LLD)
Key entities in PostgreSQL:
- **OFFICE:** `id` (UUID), `name`, `address`
- **EMPLOYEE (Host):** `id` (UUID), `name`, `email`, `role`, `office_id`
- **VISIT:** `id` (UUID), `visitor_details` (name, email, phone, company, photo), `status`, `check_in_time`, `check_out_time`, `host_id`, `office_id`, `invite_id`
- **INVITE:** `id` (UUID), `event_title`, `visit_type`, `visit_date`, `time_window`, `host_id`, `office_id`
- **APPROVAL:** `id` (UUID), `decision`, `decided_by`, `decided_at`

### Visit Status State Machine
`Pending` -> `Approved` / `Rejected`
`Approved` -> `Checked In`
`Checked In` -> `Checked Out` / `Overstay`

## 4. Key Workflows

### 4.1. Pre-Approval & Fast-Track (UC-1 & UC-2)
- **Invite Creation:** Host schedules a visit with a specific time window. 
- **Limits:** Enforced via Redis `INCR` (Max 5 per employee/day). Checked before creation.
- **QR Generation:** A unique QR is generated per guest and emailed via Nodemailer.
- **Check-In:** Visitor scans QR at the desk. If within the window, they are auto-checked in. If expired, it falls back to manual walk-in, pre-filling the visitor's details.

### 4.2. Walk-in Registration
- Front desk or Kiosk registers visitor.
- Status set to `Pending`. Host is notified in real-time.
- Host approves via web portal -> QR generated.

### 4.3. Real-Time Front Desk Dashboard
- Powered by `Socket.io` rooms scoped by office and date (`office:{id}:{date}`).
- The UI visually distinguishes pre-approved visits (fast-track) from pending walk-ins.
- Updates push from the backend to the dashboard in ~1s.

## 5. Security & Reliability

### 5.1. Idempotency (Race Conditions Guard)
Two failure modes guarded against: Double-clicking submit and client retries after network timeouts.
- Every state-changing POST request (`/visits/:id/approve`, `/invites`, etc.) requires an `Idempotency-Key` header (UUID).
- API checks Redis. If the key exists, it returns the cached response.
- If missing, it processes the request, stores the response in Redis (24h TTL).
- **Conditional SQL updates** (`UPDATE visits SET status='approved' WHERE id=? AND status='pending'`) act as a second layer of defense against concurrency (e.g. two admins approving at once).

### 5.2. Authentication & Authorization
- Stateless JWT-based authentication passed via `Authorization: Bearer <token>`.
- Role-based access control (Admin, Host/Employee, Security/Front-desk) handled via Express middleware.

## 6. Core API Contracts
All state-changing endpoints are idempotent.
- `POST /auth/login` - Issue JWT
- `POST /visits` - Register walk-in visitor
- `POST /invites` - Create pre-approval invite
- `POST /visits/:id/approve` - Host approves (generates QR)
- `POST /visits/:id/checkin` - Manual or QR check-in
- `GET /invites/scan/:qrToken` - Validate QR and auto-checkin

## 7. Caching Strategy
Caching is deliberately narrow to avoid invalidation complexity:
- **Redis:** Idempotency keys (24h TTL), Pre-approval limits (Midnight expiry), JWT blacklists.
- **Not Cached:** The front-desk visitor list. `Socket.io` pushes live updates, and composite database indexes (`office_id`, `visit_date`, `status`) keep the query fast natively.
