# RULES.md

## 🧠 Development Rules
### VMS — Project Guidelines for AI & Human Collaboration

This document defines the development rules, coding standards, and best practices for the Visitor Management System (VMS). These rules ensure consistency, maintainability, security, and clarity across the entire codebase. **Both AI assistants and human contributors must follow these guidelines at all times.**

---

## 1. General Principles

These rules apply to the entire project.

- ✅ Follow the project documentation (PRD, ARCHITECTURE, DESIGN) before writing any code
- ✅ Keep the code clean, readable and well-structured
- ✅ Prioritize simplicity and maintainability over cleverness
- ✅ Do not duplicate logic — reuse existing components, utilities, or services
- ✅ Make small, focused changes instead of large, risky edits
- ✅ Do not modify unrelated files when working on a specific feature
- ✅ Write self-explanatory code with meaningful variable and function names
- ✅ Every feature must map to a functional requirement (FR) defined in the PRD
- ✅ Do not invent features or UI not described in the PRD or design doc

---

## 2. Technology & Coding Standards

Rules related to the tech stack and coding style.

| Area | Rule |
|---|---|
| **Language** | Use JavaScript (ES2022+). Use JSDoc comments on complex functions to document expected shapes — no TypeScript, no type files |
| **Frontend** | React 18 + Vite. Follow component-based architecture as defined in `ARCHITECTURE.md` |
| **Backend** | Node.js + Express. Follow module structure: `routes → controller → service` |
| **Styling** | TailwindCSS only. No inline styles, no plain CSS files unless adding a Tailwind base layer |
| **UI Components** | Use shadcn/ui primitives from `frontend/src/components/ui/`. Do not install other component libraries |
| **Linting** | Follow ESLint rules defined in `.eslintrc`. Fix all lint errors before committing |
| **Formatting** | Use Prettier for all files. Run `prettier --write` before committing. No manual formatting debates |
| **Dependencies** | Use stable, well-maintained packages only. Do not add a package if a native or existing utility covers it |
| **File naming** | `PascalCase` for React components, `camelCase` for utilities/hooks/services, `kebab-case` for config files |
| **Imports** | Use relative imports cleanly. No `../../..` chains longer than 2 levels — restructure the file instead |

---

## 3. Project Structure

Follow the folder structure defined in `ARCHITECTURE.md` exactly.

- ✅ Place reusable UI components in `frontend/src/components/`
- ✅ Place shadcn/ui generated components in `frontend/src/components/ui/` — do not edit these manually
- ✅ Feature-specific page code belongs in `frontend/src/pages/<FeatureName>/`
- ✅ Custom React hooks go in `frontend/src/hooks/` — one hook per file
- ✅ All API calls go through `frontend/src/lib/api.js` (the axios instance) — never use raw `fetch` in components
- ✅ Database and external service logic (Prisma, Redis, Nodemailer) belongs in `backend/src/lib/`
- ✅ Business logic belongs in `backend/src/modules/<module>/`**`.service.js`** — not in controllers
- ✅ Controllers only handle request parsing, call a service, and return the response
- ✅ Common utilities should be in `backend/src/lib/` or `frontend/src/lib/`
- ✅ Shared JS constants and data shape examples go in `frontend/src/lib/constants.js` or `backend/src/lib/constants.js`
- ✅ Do not create new folders without a clear reason aligned with the architecture

---

## 4. API & Backend Rules

Rules for writing Express routes, controllers, and services.

- ✅ Every state-changing endpoint (`POST`, `PATCH`, `DELETE`) **must** go through the `idempotency.middleware.js`
- ✅ Every protected route **must** go through `auth.middleware.js` — never trust client-provided user IDs
- ✅ Role checks use `role.middleware.js` — do not manually check `req.user.role` inside controllers
- ✅ All state transitions use conditional DB updates: `WHERE status = 'pending'` — never blindly overwrite status
- ✅ Return consistent response shapes: `{ data, message, error }` — no ad-hoc response structures
- ✅ Use HTTP status codes correctly: `200` for success, `201` for created, `400` for validation errors, `401` for auth, `403` for forbidden, `409` for conflicts, `500` for server errors
- ✅ Never expose raw Prisma errors or stack traces to the client — catch and map to clean error messages
- ✅ Async route handlers must be wrapped in try/catch or use an async error wrapper
- ✅ Validate all request bodies using a schema validator (zod) before passing to the service layer

---

## 5. Database Rules (Prisma + PostgreSQL)

- ✅ `prisma/schema.prisma` is the single source of truth — never modify the DB directly
- ✅ Run `prisma migrate dev` for every schema change — never skip migrations
- ✅ Do not write raw SQL unless Prisma cannot express the query — and document why
- ✅ Use the Prisma singleton from `backend/src/lib/prisma.js` — never instantiate `new PrismaClient()` elsewhere
- ✅ All queries that span multiple tables or require rollback must use Prisma transactions (`prisma.$transaction`)
- ✅ Do not `SELECT *` — always specify the fields you need in Prisma `select` or `include`

---

## 6. Redis Rules

- ✅ Use the Redis singleton from `backend/src/lib/redis.js`
- ✅ All Redis keys must follow the naming convention: `scope:identifier` (e.g. `idempotency:uuid`, `preapproval:hostId:date`)
- ✅ Every key set in Redis must have a TTL — no indefinite keys
- ✅ Use `INCR` + `EXPIREAT` for daily counters (pre-approval limits) — never use `COUNT(*)` for hot counters
- ✅ Redis is not a source of truth — it is a cache/coordination layer only. PostgreSQL is always the source of truth

---

## 7. Real-Time (Socket.io) Rules

- ✅ All socket event names follow the pattern `entity:action` (e.g. `visit:approved`, `visit:overstay`)
- ✅ Clients join rooms keyed to `office:{officeId}:{date}` on connection — never broadcast globally
- ✅ Socket events are emitted **after** the DB write succeeds — never before
- ✅ Socket.io logic (room management, emit helpers) lives in `backend/src/socket/socket.js` only
- ✅ Never emit socket events directly from a controller — call the socket helper from the service layer

---

## 8. Auth & Security Rules

- ✅ JWTs are stored in memory on the client (React context) — never in `localStorage` or `sessionStorage`
- ✅ JWT secret is in `.env` only — never hardcoded
- ✅ On logout, add the token to the Redis JWT blacklist with a TTL equal to the token's remaining expiry
- ✅ Every `req.user` attachment happens inside `auth.middleware.js` — never trust user data from the request body for identity
- ✅ Do not log sensitive data (passwords, tokens, visitor PII) in any environment
- ✅ `.env` files are never committed to git — `.env.example` (with empty values) is committed instead

---

## 9. Frontend Rules

- ✅ No business logic in React components — components render UI and call hooks/services only
- ✅ All API calls go through `frontend/src/lib/api.js` — the axios instance handles auth headers automatically
- ✅ Idempotency keys are generated once per user action in `frontend/src/lib/idempotency.js` — never regenerated on retry
- ✅ Socket subscriptions are set up in `useSocket.js` and accessed via `SocketContext` — no direct socket calls in components
- ✅ Every async action must have a loading state and an error state rendered in the UI — no silent failures
- ✅ Role-gated routes use the role check in `App.jsx` — never conditionally render entire pages based on role inside the page itself
- ✅ Do not use `useEffect` to fetch data — use a custom hook (`useVisits`, etc.) that encapsulates the fetch logic

---

## 10. Error Handling Rules

- ✅ Every async function (client and server) must handle errors explicitly — no unhandled promise rejections
- ✅ User-facing error messages must be human-readable and actionable — not raw error codes
- ✅ Validation errors return `400` with a field-level message (e.g. `"visit_date is required"`) — not a generic "Bad request"
- ✅ Expired QR scans return a specific error code (`QR_EXPIRED`) so the client can show the fallback UI — not a generic 400
- ✅ Network errors on the client show a toast/snackbar — the UI does not break or go blank
- ✅ The overstay cron job logs failures but does not crash the server process

---

## 11. Git & Commit Rules

- ✅ Branch naming: `feature/<name>`, `fix/<name>`, `chore/<name>`
- ✅ Commit messages follow Conventional Commits: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`
- ✅ Each commit should do exactly one thing — no "fixed everything" commits
- ✅ Do not commit directly to `main` — all changes go through a PR/branch
- ✅ Never commit `.env`, `node_modules/`, `dist/`, or generated migration files that aren't Prisma-managed

---

## 12. What AI Must Not Do

- ❌ Do not add features not described in the PRD or design doc
- ❌ Do not change the folder structure without explicit instruction
- ❌ Do not install new npm packages without asking first
- ❌ Do not modify `prisma/schema.prisma` without being explicitly asked to
- ❌ Do not write raw SQL to bypass Prisma unless explicitly told to
- ❌ Do not store JWTs or sensitive data in localStorage
- ❌ Do not emit socket events before the DB write is confirmed
- ❌ Do not skip the idempotency middleware on any state-changing endpoint
- ❌ Do not expose stack traces or Prisma errors in API responses
- ❌ Do not rewrite or refactor working code as a side effect of fixing something else
