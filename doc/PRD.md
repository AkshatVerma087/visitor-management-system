# PRD: Pre-Approval & Fast-Track Visitor Scheduling

**Target Launch:** MVP (v1.0)

## 1. Product overview

This feature is part of a larger Visitor Management System (VMS) built for workplace security and front desk operations. This PRD covers the **pre-approval / fast-track scheduling** slice of the product: letting host employees schedule visitor access in advance so that recurring or expected visitors (clients, vendors, maintenance staff) can check in with a simple QR scan instead of going through same-day manual approval.

## 2. Problem statement

Today, every visitor — even a vendor who visits weekly, or a client whose meeting was scheduled a week ago — goes through the same manual, same-day approval flow: register at the desk, wait for the host to see a notification, wait for approval, then get let in. This creates two costs:

- **Host employees** spend day-of time on approvals they could have handled in advance, or re-approve the same recurring visitor over and over.
- **Frequent visitors** (maintenance staff, regular vendors) face friction every single visit despite being effectively pre-vetted by history.

## 3. Goals

| Goal | Success metric |
|---|---|
| Let hosts schedule visitor access in advance | % of visits created via pre-approval vs. walk-in registration |
| Reduce host day-of workload | Median time-to-approval drops for pre-approved visits (should approach ~0, since there's no approval step) |
| Make frequent-visitor entry near-instant | Front desk check-in time for pre-approved visitors < 30 seconds (QR scan only) |

**Non-goals (explicitly out of scope for this feature):** background-check integration, biometric verification, visitor self-service rescheduling.

## 4. Target users

| Persona | Who they are | What they need from the system |
|---|---|---|
| **Host employee** | Any staff member expecting a visitor — the one scheduling client meetings, vendor visits, or recurring maintenance personnel | Schedule a visit once, in advance, and not think about it again on the actual day. Approve/reject on the go for anything not pre-scheduled. |
| **Visitor / guest** | External person — client, vendor, interview candidate, maintenance contractor. Can be one-time or a "frequent visitor" | A frictionless entry: receive a pass in advance, scan and walk in, no waiting on manual approval at the door |
| **Front desk / security officer** | On-site staff managing physical entry | See who's expected today, verify identity against the pre-approved list, override manually when something doesn't match |
| **Admin** | Facilities/ops team managing the system itself | Configure offices, visit types, and approval limits (e.g. max 5 pre-approvals/employee/day); see cross-office reporting |

## 5. Core features (MVP)

1. **Invite creation** — host schedules a visit in advance (event title, visit type, office, date, time window, note)
2. **Guest management** — add guests by search or new entry; guest profiles are reusable across future invites so recurring vendors aren't re-typed every time
3. **QR / e-pass generation & delivery** — unique QR per guest, emailed automatically on invite creation
4. **QR scan check-in** — scanning a valid pass auto-checks-in the visitor, bypassing manual approval entirely
5. **Expiry handling with fallback** — an unused pass past its time window is marked expired; front desk gets a one-tap fallback into standard walk-in approval, pre-filled with the visitor's invite details
6. **Front desk visibility** — dashboard visually distinguishes pre-approved (invite-based) check-ins from walk-ins still pending approval
7. **Daily pre-approval limit** — configurable cap (default 5/employee/day), enforced at invite-creation time with a clear, actionable error

## 6. User stories

**As a host employee**, I want to schedule a client meeting or vendor visit for a future date/time, so that I don't have to be available to approve it the day it happens.
- Acceptance: I can create an invite with event title, visit type, date, time window, and one or more guests, without needing to be present at check-in time.

**As a host employee**, I want to add a recurring vendor or maintenance contact once, so that I'm not repeating the same approval for a routine visit.
- Acceptance: I can add a guest to an invite by searching name/email/phone; the system doesn't require re-entering their details if they've visited before (guest profile is reusable across invites).

**As a frequent visitor** (e.g. maintenance personnel), I want to walk in and scan a pass rather than wait for approval, so that recurring visits aren't slowed down by process built for first-time guests.
- Acceptance: scanning a valid, unexpired QR auto-checks-in the visitor with zero host interaction at that moment.

**As a host employee**, I want the system to stop me from over-scheduling, so that pre-approval doesn't become a loophole for unlimited unverified access.
- Acceptance: attempting to pre-approve beyond the daily limit (default 5/employee/day) shows a clear, actionable error before submission — not after.

**As a front desk officer**, I want to see which visitors today are pre-approved vs. need manual approval, so that I know who can be fast-tracked and who still needs a decision.
- Acceptance: dashboard visually distinguishes invite-based check-ins from walk-in approval-pending visitors.

**As a front desk officer**, I want an expired pre-approval to fail clearly, so that a late visitor doesn't get in on a stale pass, and doesn't get stuck with no path forward either.
- Acceptance: scanning an expired QR shows "expired — needs new approval" and offers a one-tap path to fall back into the standard walk-in approval flow, rather than a dead end.

## 7. Flow

1. Host creates an invite (event title, visit type, office, date, time window, optional note) and adds one or more guests by searching existing contacts or entering new details.
2. System generates a unique QR/e-pass per guest and emails it.
3. On the visit date, guest arrives and scans the QR at the front desk kiosk or hands it to security.
4. System validates: is this QR tied to today's date and inside the time window?
   - **Valid** → auto check-in, no host action needed, front desk dashboard updates in real time.
   - **Expired / outside window** → invite is marked expired; front desk is shown a fallback path into standard walk-in approval (visitor doesn't have to start over from scratch — their details from the invite pre-fill the walk-in form).
5. Guest checks out (self-scan on exit, or front desk assists) same as any other visit.

## 8. Constraints & rules

- Max pre-approvals per employee per day: 5 (admin-configurable) — enforced at invite-creation time with a clear error, not silently capped
- Invite window auto-expires the associated QR if visitor never checks in — no manual cleanup needed
- A guest profile (name/email/phone/company) is reusable across invites once created, so a recurring vendor isn't re-typed every time — this is what actually delivers "reducing employee workload" beyond just the approval skip

## 9. Open questions for you to decide

- Should a "frequent visitor" get any special status beyond a reusable profile (e.g. a badge in the UI, or a shorter default expiry override)? The current design treats every pre-approved guest the same regardless of visit count — worth deciding if that's sufficient for the assignment's stated use case or if a lightweight "frequent visitor" flag adds a differentiator worth demoing.
- Should the daily pre-approval limit be per-office or global per employee? (Default assumption above: per employee per day, office-agnostic — flag if you want it scoped differently.)

---

## 10. Use cases (detailed)

### UC-1: Scheduling client meetings or vendor visits in advance

**Actor:** Host employee  
**Trigger:** Host has a confirmed meeting or vendor appointment scheduled for a future date  
**Preconditions:** Host is logged into the VMS portal; the visitor's date and time are known in advance

**Main flow:**
1. Host navigates to **Invite Visitors** and clicks "New Invite."
2. Host fills in: Event Title, Type of Visit (e.g. Business Guests, Vendor, Interview), Office location, Visit Date, Time Window (start – end), and an optional personal note to guests.
3. Host searches for the guest by name, email, or phone. If the visitor has been to the office before, their profile appears in search results — no re-entry needed. If new, host enters details once (name, email, phone, company).
4. Host adds one or more guests to the invite and clicks **Confirm Invite.**
5. System generates a unique QR/e-pass per guest and emails it automatically.
6. On visit day, guest arrives, shows or scans the QR — system auto-checks them in with zero host involvement at that moment.

**Outcome:** The host handles the "approval" step at scheduling time (days or hours before), not on the day itself. The front desk sees the visitor as pre-approved and can fast-track entry.

**Alternate flow — invite limit reached:**
- At step 4, if the host has already created 5 invites for that day, the system shows a clear, actionable error before submission: *"You've reached your daily pre-approval limit (5). Contact your admin to raise the limit or reschedule to another day."* No silent cap; no surprise after form submission.

---

### UC-2: Fast-tracking frequent visitors (maintenance personnel, recurring vendors)

**Actor:** Frequent visitor (e.g. weekly maintenance contractor); Host employee  
**Trigger:** A recurring visitor arrives for a routine visit  
**Preconditions:** The visitor's guest profile already exists in the system from a prior invite

**Main flow:**
1. Host creates a new invite and searches the visitor by name/email/phone — their profile is already saved and pre-fills all details.
2. Host sets the time window and confirms. QR is emailed to the visitor.
3. On visit day, the visitor scans the QR at the front desk kiosk or presents it to security.
4. System validates: QR is valid, date matches today, current time is within the window → visitor is auto-checked-in instantly. No queue, no waiting for host to pick up a notification.
5. Front desk dashboard immediately shows the visitor as **Checked In (Pre-Approved)**, visually distinct from walk-in pending entries.

**Outcome:** Recurring visitors experience near-instant entry (<30 seconds from scan to check-in). Host re-uses saved profiles rather than re-typing guest details each visit.

**Alternate flow — visitor arrives outside the time window:**
- System marks the pass as **Expired.** Front desk sees: *"Pass expired — needs new approval"* with a one-tap fallback that opens the standard walk-in approval form, pre-filled with the visitor's invite details. Visitor is not left with a dead end; host receives a same-day approval notification as a fallback.

---

### UC-3: Reducing employee workload on the day of the visit

**Actor:** Host employee; Front desk officer  
**Trigger:** Multiple visitors are expected on a given day for different meetings  
**Preconditions:** Host has pre-created invites for all expected visitors before the visit date

**Main flow:**
1. Host creates all invites for the week/day in one sitting (e.g. Monday morning for the whole week).
2. Each guest receives their QR e-pass by email in advance.
3. On visit days, guests arrive and self-check-in by scanning their QR — no host notification fires, no approval action needed from the host.
4. Front desk dashboard shows all pre-approved visitors for the day in a filterable list, visually separated from walk-ins awaiting approval. Front desk verifies identity and lets them in.
5. If any visitor doesn't show up, the pass auto-expires at the end of the time window — no manual cleanup required.

**Outcome:** Host's in-day workload for expected visitors drops to zero. Front desk can focus attention on walk-ins that actually need a decision, instead of triaging a mixed list. The system handles expiry automatically, so neither the host nor admin needs to manually close stale invites.

---

## 11. Acceptance criteria summary

| Feature | Acceptance criterion |
|---|---|
| Invite creation | Host can create an invite with event title, visit type, office, date, time window, and note in a single form |
| Guest search & reuse | Returning guest profiles appear in search by name/email/phone; no re-entry of details required |
| QR generation & delivery | Unique QR e-pass emailed to each guest immediately on invite confirmation |
| Auto check-in (valid QR) | Scanning a valid, in-window QR checks in the visitor with zero host interaction; dashboard updates in real time |
| Expired QR handling | Scanning an expired QR shows a clear error + one-tap fallback into walk-in approval flow, pre-filled with invite details |
| Daily limit enforcement | Attempting to exceed the daily invite limit (default 5) shows a clear error before form submission, not silently or after |
| Front desk visibility | Dashboard visually distinguishes pre-approved check-ins from walk-in pending entries |
| Auto-expiry | Unused passes are auto-expired after the time window ends; no manual cleanup needed |

---

## 12. Out of scope (v1.0)

- Background check or ID verification integration
- Biometric entry (face recognition, fingerprint)
- Visitor self-service rescheduling or cancellation
- SMS delivery of QR passes (email only in v1)
- Recurring invite series (e.g. "every Monday at 10am") — host re-creates per visit
