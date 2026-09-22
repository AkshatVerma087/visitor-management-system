# Project Overview & Architecture

This document explains everything about how the Visitor Management System (VMS) was built, the technologies used, and the underlying architecture.

For a deeper dive into the specific trade-offs we made, please see the [Decisions Log](./doc/decisions.md).

---

## Technology Stack
We built this application using a modern, scalable, full-stack JavaScript environment:
- **Frontend**: React.js bootstrapped with Vite for lightning-fast module replacement.
- **Styling**: Tailwind CSS combined with Shadcn/ui for accessible, premium-feeling components.
- **Backend**: Node.js and Express.js (Modular Monolith pattern).
- **Database**: PostgreSQL hosted on **Neon** (Serverless).
- **ORM**: Prisma for strictly typed, secure database querying.
- **Real-time**: Socket.io for pushing instantaneous websocket notifications.
- **Caching & Limits**: Redis (Upstash) for enforcing daily quotas (e.g., max 5 invites per host).
- **Email Delivery**: Resend API for delivering QR e-passes to visitors.

## System Architecture
The platform is designed around three core modules:

1. **Authentication & Authorization (`auth`, `employee` modules)**
   - Secures the application using JSON Web Tokens (JWT).
   - Utilizes short-lived Access Tokens and long-lived, HttpOnly Refresh Tokens to prevent XSS attacks.
   - Enforces Role-Based Access Control (RBAC) across Hosts, Security, and Admins.

2. **Real-time Visitor Tracking (`visitor` module)**
   - Visitors register at the Kiosk, capturing their details and a Base64 webcam photo.
   - Using **Socket.io**, the backend emits a `visit:new` event directly to the specific Host's dashboard room without requiring page refreshes or heavy DB polling.
   - The host's decision (Approve/Reject) triggers another websocket event back to the Security desk.

3. **Pre-Approvals and Scheduling (`invite` module)**
   - Hosts can pre-approve guests for a specific `start_time` and `end_time` window.
   - The backend validates all QR scans against this window in real-time. If a guest arrives early or stays late, the check-in is rejected, ensuring rigorous security.
   - Quotas (enforced by Redis) prevent employees from spamming the building with unauthorized guests.

## Security Posture
The application has been extensively hardened against common attacks:
- **DDoS & Brute Force**: Protected by `express-rate-limit` globally, and strictly rate-limited on Auth routes.
- **Mass Assignment**: Middleware strictly filters JSON payloads using Zod schemas before hitting the database.
- **Resource Exhaustion**: Photo uploads are converted to Buffers and strictly limited to 2MB before writing to disk, preventing Out-Of-Memory (OOM) attacks.
- **Headers**: Secured with `helmet` to prevent clickjacking and sniffing.

## Complexity & Performance
By heavily utilizing **Redis** for state checking (quotas, idempotency keys) and **Socket.io** for real-time events, the Postgres database is completely shielded from unnecessary reads. 

For full complexity analysis, please review the [Complexity Analysis Document](./doc/COMPLEXITY_ANALYSIS.md).

## Decisions & Trade-offs
We had to make several critical architectural choices during development, such as picking a Monolith over Microservices, choosing WebSockets over Long Polling, and using Redis for quota limits instead of PostgreSQL `COUNT()` queries.

For a comprehensive explanation of every single decision we made, why we made it, and the trade-offs involved, please see the **[Detailed Decisions Log (decisions.md)](./doc/decisions.md)**.
