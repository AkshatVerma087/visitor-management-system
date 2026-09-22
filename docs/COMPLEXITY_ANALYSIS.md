# Complexity Analysis

Visitor Management System — time complexity, space complexity, scalability, performance, and error handling.

This document supports the assignment evaluation criteria for complexity estimation, performance, scalability, and robust error handling.

**Cross-references**

- [Project Overview](../PROJECT_OVERVIEW.md) — architecture and workflows
- [Decisions Log](./decisions.md) — why these algorithms and stores were chosen
- [README](../README.md) — how to run the system

---

## 1. Scope

The analysis covers the production paths in `vms/backend` and the main React dashboards:

- Walk-in registration (including photo decode + disk write)
- Host approve / reject with idempotency
- Pre-approval invites with Redis daily quotas
- Security today board and check-in / check-out
- Socket.io room fan-out
- Cron overstay and expire jobs

Notation:

- `N` — total Visit rows in PostgreSQL
- `K` — rows returned for one query (host’s visits, today’s office visits)
- `M` — clients subscribed to one Socket.io office-day room
- `E` — hosts who created at least one invite on a given calendar day
- `P` — photo byte size (capped before write)

---

## 2. Core operations — time and space

| Operation | Time | Space | Notes |
| --- | --- | --- | --- |
| Walk-in registration | `O(1)` amortized for the DB insert; `O(P)` for photo decode/write | `O(P)` transient buffer; `O(1)` DB row | Prisma insert by UUID PK. Photo is decoded from base64, size-checked, written under `public/uploads/`, and only the path is stored in `photo_url`. |
| Host decision + idempotency | `O(log N)` lookup + `O(1)` transaction | `O(1)` | Unique index on `Approval.idempotency_key`. Prisma `$transaction` creates Approval and updates Visit together. |
| Fetch host visits | `O(log N + K)` | `O(K)` | Filter by `host_id` (FK index) and order by `created_at`. |
| Fetch today’s visitors | `O(log N + K)` | `O(K)` | Uses composite index `@@index([office_id, expected_arrival, status])` with a day range on `expected_arrival`. |
| Invite create + Redis quota | Redis `O(1)`; DB `O(G)` for `G` guests in the invite | `O(G)` for created Visit rows + QR buffers | `INCR` / `EXPIRE` on `daily_invites:{hostId}:{date}` avoids `COUNT(*)` under concurrency. |
| QR generation per guest | `O(1)` per visit id | `O(1)` image buffer per guest | `qrcode` encodes the visit UUID as a data URL. |
| Check-in / check-out | `O(log N)` | `O(1)` | Single-row fetch by PK, status guard, update. Invite-based check-in also evaluates start/end window in memory `O(1)`. |
| Socket emit | Emit bookkeeping `O(1)`; delivery `O(M)` | `O(M)` connection set for the room | Rooms are `office:{officeId}:{date}` so unrelated offices are not flooded. |
| Cron overstay scan | `O(log N + K_o)` with suitable index; otherwise higher without `check_in_time` support | `O(K_o)` violators | Selects `CheckedIn` with `check_in_time` older than 8 hours, then updates each violator. |
| Cron expire scan | `O(log N + K_e)` | `O(K_e)` | Selects stale `Approved` rows and sets `Expired`. |

### Index strategy (why queries stay cheap)

From `prisma/schema.prisma`:

- `Visit`: `@@index([office_id, expected_arrival, status])` — security day board
- `Visit`: `@@index([visitor_email])`, `@@index([visitor_phone])` — lookup / search
- `Invite`: `@@index([host_id, visit_date])` — host invite history
- `Approval`: unique `idempotency_key` — duplicate decision suppression

These indexes keep the common filters on the left-most prefix of B-Trees, so planners can avoid full table scans as `N` grows.

---

## 3. Space complexity of the system

### 3.1 PostgreSQL

Overall persistent space is `O(N + A + I + U)` where:

- `N` — visits
- `A` — approvals
- `I` — invites
- `U` — employees and offices (small)

Photos are **not** stored as base64 strings in rows. Only a short path such as `/uploads/<file>.jpg` is stored, which keeps sequential scans and row cache pressure low.

### 3.2 Disk (`public/uploads`)

Photo space is `O(sum of P_i)` across uploaded images. A hard size gate on decoded buffers prevents a single request from exhausting process memory.

### 3.3 Redis

Invite counters use one key per host per day:

```text
daily_invites:{hostId}:{YYYY-MM-DD}
```

Memory is `O(E)` for active hosts that day. Keys expire after 24 hours, so Redis usage is bounded and self-cleaning.

### 3.4 Socket.io process memory

Connection memory is `O(C)` for `C` concurrent sockets. Each client typically joins one office-day room. At office scale (tens of concurrent desks), overhead stays negligible compared to DB and photo I/O.

---

## 4. Scalability

### 4.1 What scales well today

| Mechanism | Effect |
| --- | --- |
| Stateless JWT auth | API instances can be duplicated behind a load balancer without sticky sessions for REST |
| Office-day Socket rooms | Event fan-out is proportional to interested clients only |
| Redis atomic quotas | Invite limits stay `O(1)` under concurrent hosts |
| Global + walk-in rate limits | Absorbs abusive traffic before it becomes Prisma load |
| Indexed day queries | Security dashboard stays responsive as historical `N` grows |
| Photo on disk | Database size grows with metadata, not megabyte blobs |

### 4.2 Current limits and next steps

| Limit | Impact | Recommended next step |
| --- | --- | --- |
| Socket.io in-process with Express | Multi-instance API would not share rooms | Add `@socket.io/redis-adapter` |
| List endpoints without pagination | Very busy hosts/offices return large `K` | Add `take` / `skip` (or cursor) on host and today lists |
| Local photo disk | Not shared across multiple API nodes | Move to object storage (S3 / compatible) and store absolute URLs |
| Cron in the API process | Multiple API replicas could double-run jobs | Run cron in one worker, or use Postgres advisory locks / a job queue |

Horizontal REST scaling is already compatible with JWT. Real-time and file storage are the first components to externalize when moving beyond a single Node process.

---

## 5. Performance and user experience

| Technique | Where | Benefit |
| --- | --- | --- |
| Optimistic UI on approve/reject | Host dashboard | UI updates before the round-trip finishes; rollback on failure |
| Socket merge of `visit:updated` | Host and Security dashboards | No polling; board updates in about one network RTT after commit |
| Idempotency keys | Decision API | Double-clicks do not create duplicate Approvals or flip state twice |
| Prisma transactions | Decision path | Approval row and Visit status stay consistent under concurrency |
| Shared frontend API client | `frontend/src/api` | One place for auth headers and base URL; fewer redundant fetches |
| Static photo URLs | `getImageUrl` + Express static | Browsers cache images; DB only stores paths |

Bottlenecks to watch in load tests:

1. Large `K` on unpaginated lists
2. Simultaneous photo uploads (CPU for base64 decode + disk)
3. Email latency if awaited inline without queueing (Resend calls should stay non-blocking relative to the HTTP success path where possible)

---

## 6. Error handling

### 6.1 Backend pattern

```text
Route → Zod validate → asyncHandler(controller) → service
                              │
                              ▼
                     throw AppError(status, message)
                              │
                              ▼
                     errorHandler middleware → JSON body
```

| Piece | File | Behavior |
| --- | --- | --- |
| `AppError` | `src/utils/AppError.js` | Operational errors with HTTP status |
| `asyncHandler` | `src/utils/asyncHandler.js` | Forwards promise rejections to Express |
| `errorHandler` | `src/middleware/errorHandler.js` | Uniform `{ success: false, error: { message } }`; hides stacks in production |
| Zod `validate` | `src/middleware/validate.js` | Rejects malformed bodies before business logic |
| Service guards | visitor / invite / auth services | Invalid status transitions return clear messages (for example cannot check in unless `Approved`) |

### 6.2 Classes of failures handled

- Missing or invalid JWT
- Forbidden role
- Validation failures (email format, required fields, photo constraints)
- Business rule failures (already decided visit, outside invite window, Redis quota exceeded)
- Rate limit exceeded (`express-rate-limit`)
- Unexpected Prisma / infrastructure errors (mapped to generic 500)

### 6.3 Frontend feedback

Dashboards and forms surface failures with **sonner** toasts and local error state instead of silent failures. Kiosk and auth screens show actionable messages when the API returns an error payload.

### 6.4 Redis failure mode for invites

Quota enforcement uses Redis `INCR`. If the database write fails after increment, the service decrements when appropriate so a failed invite does not permanently consume the daily budget. Redis reconnect uses ioredis retry behavior so transient network blips do not permanently disable the API process.

---

## 7. Complexity of background jobs

Both jobs run every minute.

**Overstay**

1. Query candidate set: indexed filter on status + time predicate — practical cost `O(log N + K_o)`
2. For each violator: update + emit — `O(K_o)`

**Expire**

1. Query stale `Approved` visits — `O(log N + K_e)`
2. Update to `Expired` + emit — `O(K_e)`

At steady state `K_o` and `K_e` are small relative to `N`, so minute-level cron cost stays proportional to violators, not full table size, provided indexes remain aligned with the predicates.

---

## 8. Summary for evaluation

| Criterion | How this project addresses it |
| --- | --- |
| Time complexity | Hot paths are indexed lookups and `O(1)` Redis ops; list cost is `O(log N + K)` |
| Space complexity | Metadata in Postgres `O(N)`; photos on disk; Redis bounded by daily active hosts |
| Efficient structures | B-Tree indexes, Redis counters, Socket rooms, UUID PKs |
| Performance UX | Optimistic UI, websockets, idempotent writes, static image URLs |
| Scalability | Stateless JWT; room-scoped events; clear path to Redis adapter and object storage |
| Error handling | Zod + AppError + asyncHandler + global handler + toast feedback |

For the product and file-level walkthrough, return to the [Project Overview](../PROJECT_OVERVIEW.md). For the rationale behind Redis, Socket.io, Resend, and photo storage, see the [Decisions Log](./decisions.md).
