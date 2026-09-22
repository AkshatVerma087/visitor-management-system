# Visitor Management System (VMS)

A full-stack workplace Visitor Management System for walk-in registration, host approval, pre-approved QR fast-track check-in, and real-time front-desk monitoring.

---

## Table of Contents
1. [Documentation](#documentation)
2. [Prerequisites](#prerequisites)
3. [Project Layout](#project-layout)
4. [Installation Guide](#installation-guide)
5. [Quick Role Guide](#quick-role-guide)
6. [Run with Docker (Alternative)](#run-with-docker-alternative)

---

## Documentation

| Document | Description |
| --- | --- |
| **[Project Overview](./docs/PROJECT_OVERVIEW.md)** | Full architecture, service diagram, workflows, and file-by-file map |
| **[Complexity Analysis](./docs/COMPLEXITY_ANALYSIS.md)** | Time/space complexity, scalability, performance, and error handling |
| **[Decisions Log](./docs/decisions.md)** | Architectural choices and trade-offs made during development |
| **[Design Guidelines](./docs/DESIGN_GUIDELINES.md)** | Anti-vibe-coded design principles and audit checklist |

Start with the **[Project Overview](./docs/PROJECT_OVERVIEW.md)** for how the system is connected and how each workflow runs.

---

## Prerequisites

Install and keep running:

- **Node.js** 18 or newer
- **npm** 9 or newer
- **PostgreSQL** (local or hosted, for example Neon)
- **Redis** (local default `redis://localhost:6379`, or Upstash)

Optional for email delivery:

- A **Resend** API key (`RESEND_API_KEY`)

---

## Project layout

```text
visitor-management-system/
├── README.md                 # This file
├── docs/
│   ├── PROJECT_OVERVIEW.md   # Deep dive into architecture and workflows
│   ├── COMPLEXITY_ANALYSIS.md
│   ├── DESIGN_GUIDELINES.md
│   └── decisions.md
├── backend/                  # Express API, Prisma, Socket.io, cron
├── frontend/                 # React + Vite SPA
├── docker-compose.yml
└── package.json              # npm workspaces root
```

---

## Installation Guide

All commands below assume your shell is open at the repository root, then you move into `vms`.

### 1. Install dependencies

```bash
cd vms
npm install
```

This installs both workspace packages (`frontend` and `backend`).

### 2. Configure the backend environment

Create `vms/backend/.env` (or edit the existing one) with at least:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
JWT_SECRET=replace-with-a-long-random-string
JWT_REFRESH_SECRET=replace-with-another-long-random-string
PORT=4000
FRONTEND_URL=http://localhost:5173
REDIS_URL=redis://localhost:6379

# Optional — emails log to console if omitted
RESEND_API_KEY=
SMTP_FROM=VMS <onboarding@resend.dev>
```

### 3. Prepare the database

```bash
cd vms/backend
npx prisma migrate deploy
npx prisma db seed
```

Seeded accounts (password for all: `password123`):

| Email | Role |
| --- | --- |
| `admin@office.com` | Admin |
| `host@office.com` | Host |
| `security@office.com` | Security |

### 4. Start Redis

Ensure Redis is reachable at `REDIS_URL`. Local example:

```bash
redis-server
```

Invite daily limits will fail if Redis is down.

### 5. Start the backend API

```bash
cd vms/backend
npm run dev
```

- API: `http://localhost:4000`
- Health check: `http://localhost:4000/health`
- Socket.io: same host/port as the API

### 6. Start the frontend

In a second terminal:

```bash
cd vms/frontend
npm run dev
```

- App: `http://localhost:5173`
- API base URL is configured in `vms/frontend/src/config.js` (default port `4000`)

### 7. Open the app

| URL | Purpose |
| --- | --- |
| `http://localhost:5173/kiosk` | Visitor self-service kiosk (walk-in + QR scan) |
| `http://localhost:5173/login` | Host / Security / Admin login |
| `http://localhost:5173/register` | New employee registration |
| `http://localhost:5173/dashboard` | Role-based dashboard after login |

---

## Quick role guide

- **Host** — approve or reject walk-ins; pre-register guests and issue QR e-passes
- **Visitor (Kiosk)** — register as a walk-in with a photo, or scan a QR for fast-track check-in
- **Security** — live office board; manual check-in / check-out; overstay visibility
- **Admin** — office analytics, employees, and approval audit

For diagrams, request flows, and what each source file does, read the **[Project Overview](./PROJECT_OVERVIEW.md)**.

---

## Useful scripts

| Location | Command | What it does |
| --- | --- | --- |
| `vms/backend` | `npm run dev` | API with nodemon |
| `vms/backend` | `npm start` | API without nodemon |
| `vms/backend` | `npx prisma studio` | Browse database UI |
| `vms/backend` | `npx prisma migrate dev` | Create/apply migrations in development |
| `vms/frontend` | `npm run dev` | Vite development server |
| `vms/frontend` | `npm run build` | Production build |
| `vms/frontend` | `npm run preview` | Preview production build |

---

## Run with Docker (Alternative)

If you prefer Docker over manual setup, you can spin up the entire stack with a single command. This will automatically start PostgreSQL, Redis, the Backend API, and the Frontend.

### Prerequisites

- **Docker** and **Docker Compose** installed on your machine

### 1. Build and start all services

```bash
cd vms
docker compose up --build
```

This starts 4 containers:

| Service | URL / Port |
| --- | --- |
| Frontend | `http://localhost:3000` |
| Backend API | `http://localhost:4000` |
| PostgreSQL | `localhost:5432` |
| Redis | `localhost:6379` |

### 2. Run database migrations and seed (first time only)

Open a second terminal while the containers are running:

```bash
cd vms
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx prisma db seed
```

### 3. Open the app

Visit `http://localhost:3000` in your browser. Login with the seeded credentials listed in the Installation Guide above.

### Stop and clean up

```bash
docker compose down          # Stop all containers
docker compose down -v       # Stop and also delete database volume
```

---

## License

Private academic / assignment project unless otherwise stated.

