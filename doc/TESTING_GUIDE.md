# VMS Manual Testing Guide

Use this guide to verify the core workflows of the Visitor Management System.

## 🔐 1. Test Credentials

The database has been seeded with the following accounts. The password for all accounts is `password123`.

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@office.com` | `password123` |
| **Host 1** | `host@office.com` | `password123` |
| **Host 2** | `john.host@office.com` | `password123` |
| **Host 3** | `sarah.host@office.com` | `password123` |
| **Security** | `security@office.com` | `password123` |

---

## 🚶‍♂️ Flow 1: Walk-in Registration & Host Approval

This tests the kiosk registration, real-time updates, and the host's ability to approve a walk-in.

### **Step 1: Kiosk Registration**
1. Open an Incognito window and navigate to `http://localhost:5173/kiosk`.
2. Fill out the form with sample data:
   - **Name:** John Doe
   - **Email:** john.doe@example.com
   - **Phone:** 555-0100
   - **Company:** Acme Corp
   - **Purpose:** Meeting
   - **Host:** Select **Harry Host** from the dropdown.
   - **Photo:** Click to capture a photo using your webcam.
3. Submit the form. You should see a success message that the host has been notified.

### **Step 2: Host Approval**
1. Open a normal browser window and log in as `host@office.com` at `http://localhost:5173/login`.
2. You will be redirected to the **Host Dashboard**.
3. Under the **Action Required** section, you should see "John Doe" waiting for approval.
4. Click **Approve**.
5. The visit will disappear from the pending list and move into the recent activity section. *(Behind the scenes, an email with a QR code has been generated and sent!)*

### **Step 3: Security Check-in & Checkout**
1. Open a third window (or another browser) and log in as `security@office.com`.
2. You will see the **Front Desk Dashboard**.
3. John Doe should be listed in the table with a status of `Approved`.
4. Click the **Check In** button next to John's name. The status will change to `Checked In`.
5. Click the **Check Out** button. The status will change to `Checked Out`.

> **💡 Real-time Test:** If you have the Security Dashboard and Host Dashboard open side-by-side, you will see the statuses update instantly without refreshing the page!

---

## 📅 Flow 2: Pre-Approved Invite & QR Fast-Track

This tests the host's ability to schedule a future visit, which generates a QR code that the visitor can scan at the kiosk.

### **Step 1: Host Creates Invite**
1. Log in as `host@office.com`.
2. Click the **Invite Visitor** button in the top right.
3. Fill in the details:
   - **Title:** Strategy Alignment
   - **Date:** Select today's date.
   - **Time Window:** Set it to a window that includes the current time (e.g., if it's 2:00 PM, set it from 1:30 PM to 3:30 PM).
   - **Visitor Name:** Jane Smith
   - **Visitor Email:** jane.smith@example.com
4. Click **Send Invite**. It will appear in your "My Scheduled Invites" list. *(Behind the scenes, Jane receives an email with a QR Code).*

### **Step 2: Security Dashboard View**
1. Go to the Security Dashboard (`security@office.com`).
2. You will see Jane Smith appear in the table with the status `Pre-Approved`.

### **Step 3: Kiosk QR Scan Check-in**
1. Go to the Kiosk (`http://localhost:5173/kiosk`).
2. Click on the **Scan QR Code** button.
3. Normally, you would hold up the QR code from the email. To test this without opening your email inbox:
   - Go to your backend terminal or check your database GUI (like pgAdmin or DBeaver).
   - Find the `qr_token` for Jane Smith in the `Visit` table (it will look like a long UUID string).
   - *Since we cannot easily scan a mock QR on a desktop, you can manually test the API endpoint using Postman or cURL:*
   ```bash
   curl -X POST http://localhost:4000/api/visitors/YOUR-QR-TOKEN-HERE/qr-checkin
   ```
4. Once triggered, go back to the Security Dashboard. Jane's status will instantly change from `Pre-Approved` to `Checked In`!

---

## 🛡️ Flow 3: Security & Rate Limits

### **Step 1: Kiosk Spam Protection**
1. Go to the Kiosk (`/kiosk`).
2. Submit the walk-in form repeatedly (more than 10 times) as fast as you can.
3. On the 11th attempt, the API will block you and return a `429 Too Many Requests` error, proving the rate limiter works.

### **Step 2: Host Invite Daily Limit**
1. Log in as `host@office.com`.
2. Open the **Invite Visitor** modal.
3. Create 5 different invites for today.
4. Try to create a 6th invite. 
5. The system will throw an error: `Daily limit reached. You can only invite 5 visitors per day.`

### **Step 3: Access Control**
1. Log in as `host@office.com`.
2. Try to manually navigate to `http://localhost:5173/dashboard` (the security route).
3. The app will kick you back to your own Host dashboard, proving RBAC is working on the frontend!
