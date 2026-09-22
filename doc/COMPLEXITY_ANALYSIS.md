# Visitor Management System (VMS) - Complexity & Architecture Analysis

This document outlines the time and space complexity, scalability considerations, error handling mechanisms, and overall system performance of the VMS application, satisfying the comprehensive evaluation criteria.

> **Cross-reference:** For a full gap report on what is and isn't implemented, see [`CASE_STUDY_1_VMS_FULL_ANALYSIS.md`](./CASE_STUDY_1_VMS_FULL_ANALYSIS.md).

---

## 1. Complexity Estimation

The VMS is built on a Node.js (Express) + PostgreSQL (Prisma) backend with a React frontend. The primary data structures are relational database tables optimized with strategic indexing.

### A. Core Operations Time Complexity

| Operation | Time Complexity | Space Complexity | Explanation |
| :--- | :--- | :--- | :--- |
| **Walk-in Registration** | `O(1)` amortized | `O(1)` | Direct `INSERT` into the `Visit` table using Prisma. B-Tree index on UUID primary key makes insertion `O(1)` amortized. |
| **Host Approval (with Idempotency)** | `O(1)` | `O(1)` | Idempotency check uses a `UNIQUE` constraint on `Approval.idempotency_key` — B-Tree index lookup is `O(log N)` ≈ `O(1)` for practical N. Decision is wrapped in a Prisma `$transaction` (Approval create + Visit update). |
| **Fetch Host's Visits** | `O(log N + K)` | `O(K)` | Searching by `host_id` uses the foreign key index. `N` is total visits, `K` is the number of visits returned. Sorting by `created_at` adds minimal overhead due to indexing. |
| **Fetch Today's Visitors (Security)** | `O(log N + K)` | `O(K)` | Uses composite index `@@index([office_id, expected_arrival, status])` for efficient range scan on today's date bounds. |
| **Real-Time WebSocket Updates** | `O(1)` emit | `O(M)` delivery | Socket.io event emission is `O(1)` for sending. Delivery scales linearly `O(M)` with the number of active clients `M` subscribed to a specific `office:{id}:{date}` room. Room isolation prevents global broadcast. |
| **Cron Job (Overstay Detection)** | `O(log N + K)` | `O(K)` | Queries visits where `status = 'CheckedIn'` and `check_in_time < 8 hours ago`. The composite index on `[office_id, expected_arrival, status]` helps but this query scans by `check_in_time` which is not specifically indexed — an additional index on `[status, check_in_time]` would improve this. |
| **Redis Daily Invite Limit** | `O(1)` | `O(1)` | Atomic `INCR` on `daily_invites:{hostId}:{date}` key. `EXPIRE 86400` auto-evicts. No DB aggregate query needed. |

### B. Space Complexity

- **PostgreSQL Database:** `O(N)` where `N` is the total number of visits, employees, and approvals. Photo uploads from the kiosk are converted from Base64 and stored as `.jpg` images on the local disk (`/public/uploads`), storing only the relative URL in the DB to prevent row bloat and ensure fast sequential scans.
- **Redis (In-Memory Cache):** `O(E)` where `E` is the number of employees issuing invites on a given day. Redis is used exclusively for daily invite rate-limit counters with TTL-based auto-eviction, keeping memory usage minimal and bounded.
- **Socket.io (Memory):** `O(C)` where `C` is the number of concurrent WebSocket connections. Each connection subscribes to a single office+date room. At current scale (~50 concurrent front desk clients), memory overhead is negligible.

---

## 2. Scalability

The system handles increasing loads through the following mechanisms:

- **Database Indexing:** Composite indexes are applied to the `Visit` model (`@@index([office_id, expected_arrival, status])`) which matches the primary query pattern of the Security Dashboard filtering by today's date and status. Additional indexes on `visitor_email` and `visitor_phone` support search operations.
- **Stateless Authentication:** JWTs (JSON Web Tokens) are used for authentication. This removes the need for stateful server sessions, allowing the backend to be horizontally scaled behind a load balancer without sticky sessions. Tokens carry `id`, `role`, and `office_id` so no DB lookup is needed for basic auth checks.
- **WebSocket Room Isolation:** Socket.io connections use **Rooms** (`office:{office_id}:{date}`). Events are only emitted to the specific front-desk clients that need them. In a multi-office deployment, this prevents broadcasting sensitive visitor data across unrelated offices.
- **Redis Quota Limiting:** Redis `INCR` with `EXPIRE` is used for daily invite limits instead of `COUNT(*)` aggregate queries on PostgreSQL, enabling O(1) enforcement under concurrent requests.
- **Global API Rate Limiting:** All `/api/` routes are protected by `express-rate-limit` (in-memory sliding window) to prevent brute force and application-layer DDoS attacks without querying the database.
- **OOM Protection:** Base64 photo payloads are strictly decoded to a `Buffer` and gated by a hard 2MB size limit before any file-system writes, preventing memory exhaustion attacks.

### Current Scalability Limitations

- Socket.io runs in-process with Express — at large scale, a Redis adapter would be needed for multi-instance broadcasting.
- No API response pagination on list endpoints (`getVisitsForHost`, `getTodayVisitors`) — these return all matching records.

---

## 3. Performance & User Experience

- **Optimistic UI Updates:** The React frontend uses optimistic state updates. When a Host clicks "Approve", the UI immediately reflects the change before the API roundtrip completes, eliminating perceived latency.
- **Idempotency Keys:** The approval workflow (`POST /api/visitors/:id/decision`) uses idempotency keys stored in the `Approval` table with a `UNIQUE` constraint. If a host double-clicks "Approve", the second request returns the existing visit without re-processing.
- **Real-Time Dashboard:** The Security Dashboard uses Socket.io to receive `visit:updated` events live, merging changes into the table without page refresh. New visits and status changes appear within ~1 second of the backend write.
- **Transactional Safety:** Host decisions use Prisma `$transaction` to atomically create an Approval record and update the Visit status, preventing race conditions where two hosts could approve/reject the same visit simultaneously.

---

## 4. Error Handling

### What's implemented

- **Global Express Error Handler:** A catch-all `(err, req, res, next)` middleware in `app.js` catches unhandled errors and returns a structured `500` response with a generic message, preventing stack trace leakage.
- **Service-Level Validation:** Business rule checks in service functions (e.g., `if (!visitor_name) throw new Error(...)`) prevent invalid state transitions. Status guards (e.g., "Cannot check in visitor. Current status: {status}") provide actionable error messages.
- **Zod Schema Validation:** All critical routes (`/auth`, `/visitors`, `/invites`) use Zod validation schemas as middleware to ensure malformed payloads never reach controller logic.
- **Controller Error Boundaries:** Each controller wraps its service call in try/catch (using `asyncHandler`) and returns appropriate HTTP status codes (400 for client errors, 500 for server errors).
- **Structured Error Responses:** Implemented a centralized `AppError` utility class. Errors are uniformly returned as `{ success: false, error: { message } }`, ensuring no raw DB stack traces or implementation details leak to the frontend.
- **Frontend Error States:** Components maintain `error` state and display sleek `sonner` toast notifications for success and error interactions.
- **Redis Reconnection & Fallback:** The ioredis client is configured with an exponential retry strategy. Rate limit enforcement uses `try...catch` around the Prisma write to decrement the rate limit counter in Redis if the database fails, avoiding race conditions.
