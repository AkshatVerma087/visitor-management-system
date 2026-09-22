# Test Plan

Define what "working" actually means for the Visitor Management System. This serves as our QA checklist.

## Authentication & Authorization
- User can log in with valid credentials.
- Invalid credentials show a clear error message.
- Unauthenticated users cannot access internal portals.
- Role isolation: Front Desk users cannot access Host Approval pages; Hosts cannot access Admin config.

## Walk-in Registration & Approval
- Front Desk/Kiosk can register a new walk-in visitor (including photo capture).
- Walk-in creates a `Pending` visit.
- Host receives real-time notification of pending visit.
- Host can approve the visit (generates QR pass) or reject it.
- Approval/Rejection updates the Front Desk dashboard instantly.

## Pre-Approval (Fast-Track)
- Host can create an invite for a future date with a time window.
- Returning visitor profiles are automatically suggested/reused via search.
- System blocks host from creating >5 pre-approvals per day (shows clear error before submission).
- Guest receives an email with their unique QR e-pass upon invite creation.

## Check-in & Front Desk Dashboard
- Scanning a valid QR within the correct time window auto-checks-in the visitor.
- Scanning an expired QR shows "expired" and offers a fallback to standard manual approval.
- Front Desk dashboard updates in real-time (Socket.io) without needing a page refresh.
- Front Desk can manually check out a visitor (Assisted checkout).
- Front Desk can filter the visitor list by status (Pending, Checked In) and search by name/email.

## Concurrency & Idempotency
- Rapidly double-clicking "Approve" or "Register" does not create duplicate entries or send duplicate emails.
- Two front-desk staff approving the same visit concurrently results in only one success and one clean rejection.

## Background Jobs
- Overstay detector auto-flags visitors who remain checked in past the duration threshold.
- Overstay status updates instantly on the Front Desk dashboard.

## Responsive Design
Test key UI layouts at:
- **375px (Mobile):** Host Portal (Approvals on the go).
- **768px (Tablet):** Kiosk Registration screen (iPads at the front desk).
- **1440px (Desktop):** Front Desk Dashboard (Security monitors).
