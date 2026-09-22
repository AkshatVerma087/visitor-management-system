# Security Requirements

Security should not be added five minutes before deployment. These requirements must be built into the VMS from day one.

## Authentication
- All private routes (API and Frontend) require a valid JWT.
- Tokens use a refresh flow: short-lived access tokens (15m) are held in-memory, while long-lived refresh tokens (7d) are stored securely in `httpOnly` cookies.
- Public routes are strictly limited to `/auth/login`, `/auth/refresh`, `/auth/register` and the initial kiosk walk-in/QR check-in endpoints.

## Authorization
- **Role-Based Access Control (RBAC):** Enforce strict boundaries between Admin, Host, and Security/Front-desk roles.
- **Resource Ownership:** Hosts can only view, approve, and create invites for their own visitors. They cannot access other hosts' data.
- **Office Scoping:** Front Desk staff can only view and manage visitors for their assigned `office_id`.

## Secrets
- Never expose backend secrets, database connection strings, or SMTP credentials to client-side code.
- Ensure `.env` is in `.gitignore` and never committed to the repo.
- Use Mailtrap for local development to prevent accidental exposure of production emails.

## Database
- All database interactions must use Prisma ORM to natively prevent SQL injection.
- Enforce race-condition protections directly at the database level using conditional updates (e.g., `UPDATE ... WHERE status = 'pending'`).

## Input
- Validate and sanitize all user input from the client (forms, URL parameters, query strings).
- Zod schema validation middleware sits in front of all major routes, ensuring payloads conform to strict typing before reaching controllers.

## APIs
- Validate request body and parameters strictly. Reject requests with unexpected or missing fields.
- Enforce idempotency via the `idempotency_key` parameter specifically on the critical host approval endpoint (`/visitors/:id/decision`) to prevent double-processing and race conditions.

## File Uploads
For visitor photo capture at the kiosk, images are received as Base64 strings from `react-webcam` and securely processed before saving:
- Images are decoded and stored on the local disk as `.jpg` inside `/public/uploads`.
- A randomly generated UUID is used for the filename to prevent collision and path traversal attacks.
- Only the relative URL path is saved to the PostgreSQL database to prevent row bloat.
