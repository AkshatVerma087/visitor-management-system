const { Resend } = require('resend');

/**
 * MAILER UTILITY
 * ----------------
 * Uses Resend to send emails.
 */

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Get the "from" address from env or use Resend's onboarding default
const getFromAddress = () => process.env.SMTP_FROM;

/**
 * Send email to the host when a walk-in visitor registers for them.
 */
const sendHostNotification = async (hostEmail, hostName, visitorName, purpose) => {
  if (!resend) {
    console.log(`(Dev Mode - No API Key) Host notification for ${visitorName} would be sent to ${hostEmail}`);
    return;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `VMS System <${getFromAddress()}>`,
      to: hostEmail,
      subject: `New Visitor: ${visitorName} is waiting for your approval`,
      html: `
        <h2>New Visitor Awaiting Approval</h2>
        <p>Hi ${hostName},</p>
        <p>A visitor has arrived and is waiting for your approval:</p>
        <ul>
          <li><strong>Name:</strong> ${visitorName}</li>
          <li><strong>Purpose:</strong> ${purpose || 'Not specified'}</li>
        </ul>
        <p>Please log into the <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard">Host Dashboard</a> to approve or reject this visit.</p>
        <p>— VMS System</p>
      `
    });

    if (error) {
      console.error(' Failed to send host notification email:', error);
      return;
    }

    console.log(` Host notification sent to ${hostEmail}:`, data?.id);
  } catch (err) {
    console.error(' SDK Crash sending host notification email:', err.message);
  }
};

/**
 * Send QR e-pass to a pre-approved visitor.
 */
const sendVisitorQrPass = async (visitorEmail, visitorName, qrCodeDataUrl, eventTitle, visitDate, startTime, endTime) => {
  if (!resend) {
    console.log(` (Dev Mode - No API Key) QR e-pass for ${eventTitle} would be sent to ${visitorEmail}`);
    return;
  }

  try {
    const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');

    const data = await resend.emails.send({
      from: `VMS E-Pass <${getFromAddress()}>`,
      to: visitorEmail,
      subject: ` Your Visitor Pass for: ${eventTitle}`,
      html: `
        <h2>Your Visitor E-Pass</h2>
        <p>Hi ${visitorName},</p>
        <p>You have been pre-approved to visit. Here are your details:</p>
        <ul>
          <li><strong>Event:</strong> ${eventTitle}</li>
          <li><strong>Date:</strong> ${visitDate}</li>
          <li><strong>Time Window:</strong> ${startTime} – ${endTime}</li>
        </ul>
        <p>Please see the attached QR code. Show or scan it at the front desk kiosk for instant check-in.</p>
        <p><em>This pass is only valid within the time window above.</em></p>
        <p>— VMS System</p>
      `,
      attachments: [{
        filename: 'epass-qr.png',
        content: Buffer.from(base64Data, 'base64')
      }]
    });

    console.log(` QR e-pass sent to ${visitorEmail}:`, data.id);
  } catch (err) {
    console.error(' Failed to send QR e-pass email:', err.message);
  }
};

/**
 * Send QR badge to a walk-in visitor AFTER host approval.
 */
const sendApprovalQr = async (visitorEmail, visitorName, qrCodeDataUrl) => {
  if (!resend) {
    console.log(` (Dev Mode - No API Key) Approval badge would be sent to ${visitorEmail}`);
    return;
  }

  try {
    const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');

    const data = await resend.emails.send({
      from: `VMS Approval <${getFromAddress()}>`,
      to: visitorEmail,
      subject: ` Visit Approved — Your Digital Badge`,
      html: `
        <h2>Your Visit Has Been Approved!</h2>
        <p>Hi ${visitorName},</p>
        <p>Your host has approved your visit. Please see the attached digital badge.</p>
        <p>Present this at the front desk to check in.</p>
        <p>— VMS System</p>
      `,
      attachments: [{
        filename: 'badge-qr.png',
        content: Buffer.from(base64Data, 'base64')
      }]
    });

    console.log(` Approval badge sent to ${visitorEmail}:`, data.id);
  } catch (err) {
    console.error(' Failed to send approval badge email:', err.message);
  }
};

module.exports = {
  sendHostNotification,
  sendVisitorQrPass,
  sendApprovalQr
};
