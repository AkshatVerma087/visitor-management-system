# VMS — Architecture Document

---

## 1. Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Frontend** | React 18 + Vite | Fast HMR, lightweight build, no SSR overhead needed at this scale |
| **UI** | TailwindCSS + shadcn/ui | Utility-first styling with accessible, unstyled primitives — no fighting a component library's opinions |
| **Real-time (frontend)** | Socket.io-client | Pairs with server-side Socket.io; handles reconnect and room subscription automatically |
| **Backend** | Node.js + Express | Familiar, minimal, easy to add middleware (auth, idempotency) as layers |
| **Real-time (backend)** | Socket.io | Lives in the same process as Express — no message broker needed at this scale |
| **Database** | PostgreSQL | Relational — approval limits, joins, and transactional state transitions are the core access pattern |
| **ORM** | Prisma | Readable schema file as single source of truth, migration tracking, clean query API |
| **Cache / coordination** | Redis | Idempotency keys, daily pre-approval counters (`INCR`), JWT blacklist, light read cache |
| **Auth** | JWT (jsonwebtoken) | Stateless — API stays horizontally scalable; short-lived access tokens in memory, long-lived refresh tokens in httpOnly cookies. |
| **Email** | Resend API | QR e-pass delivery and host notifications via Resend API (mailer.js). |
| **Background jobs** | node-cron | Overstay detector runs on a schedule; same process, no separate worker infra needed |
| **Repo structure** | Monorepo | One repo, two top-level packages (`frontend/`, `backend/`) — shared utils can live in `packages/shared/` if needed later |

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser / Kiosk                      │
│                                                             │
│   ┌─────────────┐   ┌──────────────┐   ┌───────────────┐  │
│   │  Front Desk │   │ Host Portal  │   │    Kiosk      │  │
│   │  Dashboard  │   │ (Approvals)  │   │ Registration  │  │
│   └──────┬──────┘   └──────┬───────┘   └───────┬───────┘  │
│          └────────────────┬┘                   │           │
│                           │  React + Vite       │           │
└───────────────────────────┼─────────────────────┼───────────┘
                            │ REST (HTTP)          │
                            │ WS (Socket.io)       │
                            ▼                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Express API Server                       │
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │  /auth   │ │ /visits  │ │ /invites │ │  /frontdesk  │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │
│                                                             │
│  ┌─────────────────┐   ┌────────────────┐                  │
│  │  Socket.io      │   │   node-cron    │                  │
│  │  (same process) │   │ (overstay job) │                  │
│  └────────┬────────┘   └───────┬────────┘                  │
└───────────┼────────────────────┼────────────────────────────┘
            │                    │
     ┌──────┴──────┐      ┌──────┴──────┐
     │  PostgreSQL │      │    Redis    │
     │  (Prisma)   │      │  (cache /   │
     │             │      │   keys)     │
     └─────────────┘      └─────────────┘
                                │
                         ┌──────┴──────┐
                         │  Resend API │
                         │   (Email)   │
                         └─────────────┘
```

### How the pieces connect

- **React client → Express API** — all data fetching is REST over HTTP. The client holds a short-lived access JWT in memory, and a long-lived refresh token in an `httpOnly` cookie. An Axios/fetch interceptor handles seamless token refresh on 401s.
- **React client ↔ Socket.io** — the client joins a room keyed to `office:{officeId}:{date}` after login. All real-time updates (visit created, approved, checked in, overstay) arrive as socket events — no polling.
- **Express → Socket.io** — the same Express handler that writes to the DB also emits the socket event. No message broker in between; both live in the same Node process.
- **Express → PostgreSQL (via Prisma)** — all business logic reads/writes go through Prisma. State transitions use conditional updates (`WHERE status = 'pending'`) as a race-condition guard. Idempotency is enforced during host approval directly inside Prisma transactions.
- **Express → Redis** — handles the daily pre-approval counter (`INCR` / `EXPIREAT`) per host with robust failure handling.
- **node-cron → PostgreSQL + Socket.io** — the overstay job runs every few minutes, queries for checked-in visits past threshold, flips status to `overstay`, and emits a socket event so the front desk dashboard updates without a refresh.
- **Express → Resend API** — fires after invite creation or walk-in registration to email notifications or QR e-passes. Async, non-blocking — invite creation returns success before the email resolves.

---

## 3. Request lifecycle — walk-in approval (example)

```
Front Desk (React)
      │
      │  POST /visits  { visitor details }
      │  Idempotency-Key: <uuid>
      ▼
Express API
      │── Redis: check idempotency key → miss, proceed
      │── Prisma: INSERT visit (status = pending)
      │── Nodemailer: email host notification (async)
      │── Socket.io: emit visit:created → room office:{id}:{date}
      │── Redis: store idempotency key + response (TTL 24h)
      └── return 201 { visitId, status: 'pending' }

Host Portal (React)  ←── Socket event: visit:created (real-time)
      │
      │  POST /visits/:id/approve
      │  Idempotency-Key: <uuid>
      ▼
Express API
      │── Prisma: check idempotency key → if exists, return existing visit
      │── Prisma: UPDATE visit SET status='approved' WHERE status='pending'
      │── QR generation → base64 URL
      │── Resend API: email visitor badge/QR
      │── Socket.io: emit visit:approved → room office:{id}:{date}
      └── return 200 { qrToken }

Front Desk Dashboard ←── Socket event: visit:approved (real-time, ~1s)
```

---

## 4. Folder structure

```
vms/                                  ← repo root (monorepo)
│
├── frontend/                           ← React + Vite frontend
│   ├── public/
│   ├── src/
│   │   ├── assets/                   ← icons, images, fonts
│   │   ├── components/               ← shared/reusable UI components
│   │   │   ├── ui/                   ← shadcn/ui generated components (Button, Dialog, etc.)
│   │   │   ├── VisitorCard.jsx
│   │   │   └── StatusBadge.jsx
│   │   ├── pages/                    ← one file per route/view
│   │   │   ├── FrontDesk/
│   │   │   │   ├── index.jsx         ← dashboard page
│   │   │   │   └── VisitorDetailPanel.jsx
│   │   │   ├── Host/
│   │   │   │   ├── ApprovalQueue.jsx
│   │   │   │   └── InviteVisitor.jsx
│   │   │   └── Kiosk/
│   │   │       └── Registration.jsx
│   │   ├── hooks/                    ← custom React hooks
│   │   │   ├── useSocket.js          ← Socket.io connection + room join
│   │   │   ├── useVisits.js          ← fetch + cache visits
│   │   │   └── useAuth.js
│   │   ├── context/                  ← React context providers
│   │   │   ├── AuthContext.jsx
│   │   │   └── SocketContext.jsx
│   │   ├── lib/                      ← utilities, axios instance, helpers
│   │   │   ├── api.js                ← axios instance with base URL + auth header
│   │   │   ├── idempotency.js        ← generates/stores UUID per action
│   │   │   └── utils.js
│   │   ├── App.jsx                   ← router + role-gated routes
│   │   └── main.jsx
│   ├── index.html
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
│
├── backend/                           ← Node.js + Express backend
│   ├── src/
│   │   ├── modules/                  ← feature modules (each owns its routes + logic)
│   │   │   ├── auth/
│   │   │   │   ├── auth.routes.js
│   │   │   │   ├── auth.controller.js
│   │   │   │   └── auth.service.js
│   │   │   ├── visitors/
│   │   │   │   ├── visitors.routes.js
│   │   │   │   ├── visitors.controller.js
│   │   │   │   └── visitors.service.js
│   │   │   ├── approvals/
│   │   │   │   ├── approvals.routes.js
│   │   │   │   ├── approvals.controller.js
│   │   │   │   └── approvals.service.js
│   │   │   ├── invites/
│   │   │   │   ├── invites.routes.js
│   │   │   │   ├── invites.controller.js
│   │   │   │   └── invites.service.js
│   │   │   └── frontdesk/
│   │   │       ├── frontdesk.routes.js
│   │   │       ├── frontdesk.controller.js
│   │   │       └── frontdesk.service.js
│   │   ├── middleware/               ← Express middleware
│   │   │   ├── auth.middleware.js    ← JWT verify, attach req.user
│   │   │   └── role.middleware.js    ← role-based access guard
│   │   ├── jobs/
│   │   │   └── overstay.job.js       ← node-cron: scans + flips overstay status
│   │   ├── socket/
│   │   │   └── socket.js             ← Socket.io init, room logic, emit helpers
│   │   ├── lib/                      ← shared server utilities
│   │   │   ├── prisma.js             ← Prisma client singleton
│   │   │   ├── redis.js              ← Redis client singleton
│   │   │   ├── mailer.js             ← Resend API integration + send helpers
│   │   │   ├── jwt.utils.js          ← JWT generation and cookie management
│   │   │   └── qr.js                 ← QR code generation helper
│   │   └── index.js                  ← app entry: Express + Socket.io init, mount routes
│   ├── prisma/
│   │   ├── schema.prisma             ← single source of truth for DB schema
│   │   ├── migrations/               ← auto-generated by prisma migrate dev
│   │   └── seed.js                   ← seed offices, employees, visit types
│   ├── .env                          ← DATABASE_URL, REDIS_URL, JWT_SECRET, SMTP creds
│   └── package.json
│
├── .gitignore
├── package.json                      ← root: workspaces config + shared dev scripts
└── README.md
```

---

## 5. Environment variables (backend/.env)

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/vms

# Redis
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=your_secret_here
JWT_EXPIRES_IN=8h

# Email
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your_mailtrap_user
SMTP_PASS=your_mailtrap_pass
SMTP_FROM=noreply@vms.internal

# App
PORT=4000
CLIENT_URL=http://localhost:5173
```

---

## 6. Key architectural decisions (why, not just what)

| Decision | Reasoning |
|---|---|
| Monorepo | One `git clone`, one PR for full-stack changes, shared JS utility files possible via `packages/shared/` if needed |
| Socket.io in same Express process | The handler that writes to DB is the same one that knows a state change happened — splitting them would need a message broker for no benefit at this scale |
| Idempotency at service level | Wired in `visitor.service.js` using Prisma `UNIQUE` constraints to enforce exactly-once approval processing |
| Prisma as schema source of truth | `schema.prisma` is the single file that defines tables and relations — migrations are auto-generated, no manual SQL drift |
| Redis INCR for pre-approval counter | Atomic increment with `EXPIREAT` midnight — avoids a `COUNT(*)` query on every invite creation under concurrent requests |
| shadcn/ui over a full component library | Components are copied into `src/components/ui/` and fully owned — no version lock-in, no fighting default styles |
