# Decisions Log

Architectural and technical decisions for the Visitor Management System, including alternatives considered and trade-offs accepted.

**Cross-references**

- [Project Overview](../PROJECT_OVERVIEW.md) — how these choices appear in the running system
- [Complexity Analysis](./COMPLEXITY_ANALYSIS.md) — cost implications of these choices
- [README](../README.md) — run instructions

---

## How to read this document

Each decision follows the same structure:

1. **Decision** — what we shipped
2. **Alternatives** — what we considered
3. **Trade-offs** — what we gained and what we accepted
4. **Why** — the reason that matched this project’s scope (case-study VMS, small team, demo + correctness)

---

## 1. Modular monolith instead of microservices

**Decision:** One Node.js / Express process with modules under `src/modules/*` (auth, employee, visitor, invite, admin), plus Socket.io and cron in the same process.

**Alternatives:** Separate services for auth, visits, notifications, and a gateway; message bus between them.

**Trade-offs:**

| Gain | Cost |
| --- | --- |
| Simple deploy and local development | Cannot scale realtime, API, and jobs independently |
| Single Prisma schema and ACID transactions across visit + approval | A process crash affects all features |
| Fast feature iteration for the assignment | Future multi-region needs a larger redesign |

**Why:** Visit creation, approval, email, and socket emit must stay consistent. A modular monolith gives clear boundaries without Kafka/RabbitMQ operational cost.

---

## 2. PostgreSQL (Prisma) instead of document NoSQL

**Decision:** PostgreSQL as the system of record, accessed through Prisma.

**Alternatives:** MongoDB / document store; raw SQL without an ORM; Sequelize / TypeORM.

**Trade-offs:**

| Gain | Cost |
| --- | --- |
| Relational integrity (Office, Employee, Invite, Visit, Approval) | Schema migrations required for every model change |
| Transactions for approve/reject | Less flexible for completely schemaless payloads |
| Prisma schema as living documentation | Need to learn Prisma migrate workflow |

**Why:** The domain is relational by nature: one invite has many guests; one visit has many approval attempts but one meaningful decision trail; hosts belong to offices. ACID matters when status flips under concurrent clicks.

---

## 3. Socket.io rooms instead of short polling

**Decision:** Push `visit:updated` events into rooms named `office:{officeId}:{date}`.

**Alternatives:** HTTP polling every few seconds; Server-Sent Events; Firebase-style third-party sync.

**Trade-offs:**

| Gain | Cost |
| --- | --- |
| Instant Host and Security UI updates | Stateful connections; sticky sessions if multi-instance without adapter |
| No wasted DB reads when nothing changes | Need reconnect and join logic on the client |
| Office isolation of events | Room key must stay consistent (timezone care) |

**Why:** Front-desk UX fails if approval lags behind a refresh cycle. Rooms keep fan-out proportional to interested clients only. See Complexity Analysis for `O(M)` delivery cost.

---

## 4. Resend for email instead of raw SMTP-only Nodemailer

**Decision:** Deliver host alerts and visitor QR e-passes through the Resend API (`src/lib/mailer.js`). If `RESEND_API_KEY` is missing, log instead of failing the core write path.

**Alternatives:** Nodemailer + Gmail/SMTP only; queue + worker from day one; skip email and show QR only in UI.

**Trade-offs:**

| Gain | Cost |
| --- | --- |
| Better deliverability for demo and real inboxes | Dependency on a third-party API key |
| Simple HTML email helpers | Offline demos need the log fallback |
| Matches case-study “email or SMS” channel | SMS still not implemented |

**Why:** The case study expects e-pass delivery. Resend is faster to operate than fighting SMTP spam filters during demos. Nodemailer remains in package history as an unused alternative, not the active path.

---

## 5. Redis counters instead of SQL COUNT for daily invite limits

**Decision:** Enforce “max 5 invites per host per day” with Redis `INCR` + `EXPIRE` on `daily_invites:{hostId}:{date}`.

**Alternatives:** `SELECT COUNT(*) FROM Invite WHERE host_id = ? AND visit_date = ?` inside a transaction; store counters in Postgres.

**Trade-offs:**

| Gain | Cost |
| --- | --- |
| `O(1)` atomic check under concurrency | Extra infrastructure dependency |
| Keeps hot path off aggregate SQL | Must reconcile on DB failure (decr / careful ordering) |
| Natural TTL cleanup | Redis outage blocks invite creation unless a fallback is added |

**Why:** Concurrent hosts clicking “Invite” should not race on `COUNT(*)`. Redis is the right tool for short-lived quotas. Full rationale for asymptotic cost is in Complexity Analysis section 2 and 3.3.

---

## 6. Photos on disk instead of base64 in the database

**Decision:** Accept a data-URL from the kiosk, decode to a buffer, enforce a size limit, write `public/uploads/*.jpg`, store only `/uploads/...` in `Visit.photo_url`.

**Alternatives:** Store base64 in Postgres; upload directly to S3/Cloudinary from day one.

**Trade-offs:**

| Gain | Cost |
| --- | --- |
| Lean rows and faster list queries | Local disk does not replicate across multiple API nodes |
| No cloud bill for academic demos | Need backup strategy for `public/uploads` |
| Simple Express static serving | Path vs absolute URL handling on the frontend |

**Why:** Base64 in VARCHAR/TEXT balloons storage and payloads. Object storage is ideal in production; local disk is the pragmatic middle ground for this deployment shape. Frontend resolves paths via `getImageUrl` in `config.js`.

---

## 7. Central AppError + asyncHandler instead of ad-hoc try/catch only

**Decision:** Controllers use `asyncHandler`; services throw `AppError`; `errorHandler` formats all responses.

**Alternatives:** Try/catch in every controller with custom shapes; let Express default error pages leak.

**Trade-offs:**

| Gain | Cost |
| --- | --- |
| Predictable JSON for the React client | Small amount of boilerplate per route |
| No stack traces to browsers in production | Must remember to throw AppError for operational cases |
| One place to log and map Prisma failures | — |

**Why:** As routes grew (auth, visitor, invite, admin), inconsistent error shapes broke toast handling. A single contract `{ success: false, error: { message } }` keeps the UI simple.

---

## 8. Zod validation at the edge

**Decision:** Route-level Zod schemas in `src/validations/*` applied through `middleware/validate.js`.

**Alternatives:** Validate only inside services; use Joi; trust the frontend.

**Trade-offs:**

| Gain | Cost |
| --- | --- |
| Malformed payloads never hit Prisma | Schemas must stay in sync with forms |
| Clear 400 messages | Slight duplication of field names with the UI |
| Defense against mass assignment | — |

**Why:** Kiosk and invite payloads are public or semi-public. Schema validation is the cheapest security and UX win.

---

## 9. React + Vite + Tailwind instead of Angular or a heavier stack

**Decision:** React 19 SPA with Vite, Tailwind CSS, and small shadcn-style primitives; React Router for pages.

**Alternatives:** Angular; Next.js full-stack; Vue.

**Trade-offs:**

| Gain | Cost |
| --- | --- |
| Fast UI iteration and HMR | Manual wiring of auth, sockets, and data fetching |
| Lightweight kiosk + dashboard split | No SSR (not required for internal tools) |
| Large ecosystem (webcam, QR, socket client) | — |

**Why:** The product is an authenticated internal tool plus a public kiosk. CSR is enough. Vite keeps the feedback loop short while implementing Host, Security, Admin, and Kiosk surfaces.

---

## 10. Separate Invite and Visit tables

**Decision:** `Invite` holds event metadata (title, date, window); `Visit` holds each guest and lifecycle status; optional `invite_id` on Visit.

**Alternatives:** One flat “appointment” table repeating event fields per guest.

**Trade-offs:**

| Gain | Cost |
| --- | --- |
| One meeting with many guests without duplication | Joins required for some host views |
| Clear status machine per person | Slightly more create logic |
| Walk-ins stay Visit-only (no Invite) | — |

**Why:** Pre-approval is group-oriented; security and overstay are person-oriented. Modeling both cleanly avoids denormalized mess when three clients share one time window.

---

## 11. Explicit VisitStatus including Expired and Overstay

**Decision:** Enum includes `Pending`, `Approved`, `Rejected`, `CheckedIn`, `CheckedOut`, `Overstay`, `Expired`.

**Alternatives:** Reuse `Rejected` for expiry; encode overstay only as a UI flag.

**Trade-offs:**

| Gain | Cost |
| --- | --- |
| Dashboards and reports can distinguish denial vs expiry | Migrations when adding statuses |
| Cron and security filters stay readable | UI must style each badge |

**Why:** Using `Rejected` as a proxy for expiry confused audit trails. Explicit `Expired` and `Overstay` match how security actually thinks about the lobby.

---

## 12. Enforce invite time windows on the server

**Decision:** Check-in for invite-linked visits validates current time against `start_time` / `end_time` in the service layer, not only in the UI.

**Alternatives:** Hide the button in React and trust the client.

**Trade-offs:**

| Gain | Cost |
| --- | --- |
| QR cannot be abused outside the window via raw API calls | Need careful timezone handling |
| Matches case-study security intent | Slightly stricter demos if clocks drift |

**Why:** Any check-in endpoint reachable with a token or kiosk flow must be authoritative. UI checks are convenience; server checks are security.

---

## 13. Helmet + rate limits on the API

**Decision:** `helmet()` globally; `express-rate-limit` on `/api/`; tighter limiter on public walk-in.

**Alternatives:** Rely on reverse proxy only; no application-layer limits.

**Trade-offs:**

| Gain | Cost |
| --- | --- |
| Basic DDoS / brute-force friction without extra infra | In-memory limiter is per process |
| Protects Postgres from spam walk-ins | Shared store needed for multi-instance fairness |

**Why:** The kiosk walk-in route is public. Application-layer limits are mandatory even behind a simple student deployment.

---

## 14. npm workspaces monorepo

**Decision:** `vms/package.json` workspaces for `frontend` and `backend`.

**Alternatives:** Two separate repositories; polyrepo with git submodules.

**Trade-offs:**

| Gain | Cost |
| --- | --- |
| One clone, coordinated versions | Must document two `npm run dev` processes |
| Shared root install | CI must understand workspaces |

**Why:** Frontend and backend evolve together for this assignment. Workspaces keep install friction low without forcing a shared runtime.

---

## Decision index

| # | Topic | Choice |
| --- | --- | --- |
| 1 | Architecture | Modular Express monolith |
| 2 | Database | PostgreSQL + Prisma |
| 3 | Realtime | Socket.io office-day rooms |
| 4 | Email | Resend API |
| 5 | Quotas | Redis INCR |
| 6 | Photos | Disk files + URL in DB |
| 7 | Errors | AppError + global handler |
| 8 | Validation | Zod at the route edge |
| 9 | Frontend | React + Vite + Tailwind |
| 10 | Schema | Invite parent / Visit child |
| 11 | Statuses | Explicit Expired and Overstay |
| 12 | Windows | Server-side time checks |
| 13 | Hardening | Helmet + rate limits |
| 14 | Repo | npm workspaces |

When a future change revisits one of these (for example moving photos to S3 or adding a Socket.io Redis adapter), add a new dated section below rather than rewriting history.
