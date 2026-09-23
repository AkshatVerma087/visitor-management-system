const prisma = require('../../lib/prisma');
const redis = require('../../lib/redis');
const QRCode = require('qrcode');
const { getIo } = require('../../socket/socket');
const { sendVisitorQrPass } = require('../../lib/mailer');
const AppError = require('../../utils/AppError');

exports.createInvite = async (hostId, data) => {
  const { event_title, visit_type, visit_date, start_time, end_time, note, visitors, timezone } = data;

  if (!event_title || !visit_date || !start_time || !end_time || !visitors || visitors.length === 0) {
    throw new AppError('Missing required fields or visitors', 400);
  }

  // 1. Rate Limiting: Enforce max 10 invites per host per day
  const dateStr = visit_date.split('T')[0];
  const redisKey = `daily_invites:${hostId}:${dateStr}`;
  
  // Increment counter. If it's the first one, set expiration to 24h.
  const currentCount = await redis.incr(redisKey);
  if (currentCount === 1) {
    await redis.expire(redisKey, 86400); // 24 hours
  }

  if (currentCount > 10) {
    // Revert increment since it failed
    await redis.decr(redisKey);
    throw new AppError('Daily invite limit reached (max 10 per day)', 429);
  }

  // Fetch host to get office_id
  const host = await prisma.employee.findUnique({ where: { id: hostId } });
  if (!host) throw new AppError('Host not found', 404);

  // Parse dates with timezone if provided
  const tz = timezone || '';
  const visitDateObj = new Date(`${dateStr}T00:00:00Z`); // Force UTC so Prisma saves the exact date
  const startTimeObj = new Date(`${dateStr}T${start_time}:00${tz}`);
  const endTimeObj = new Date(`${dateStr}T${end_time}:00${tz}`);

  if (endTimeObj <= startTimeObj) {
    throw new AppError('Visit end time must be after start time', 400);
  }

  const now = new Date();
  const gracePeriod = 5 * 60 * 1000; // 5 minutes grace period for network latency or slight clock drift

  if (startTimeObj.getTime() < now.getTime() - gracePeriod) {
    throw new AppError('Visit start time cannot be in the past', 400);
  }

  let invite;
  // 2. Create Invite and associated Visits in a transaction
  try {
    invite = await prisma.invite.create({
      data: {
        event_title,
        visit_type: visit_type || 'Meeting',
        visit_date: visitDateObj,
        start_time: startTimeObj,
        end_time: endTimeObj,
        host_id: hostId,
        office_id: host.office_id,
        note,
        // Create Visit records automatically with 'Approved' status
        visits: {
          create: visitors.map(v => ({
            visitor_name: v.visitor_name,
            visitor_email: v.visitor_email,
            company: v.company,
            status: 'Approved', // Pre-approved!
            host_id: hostId,
            office_id: host.office_id,
            expected_arrival: startTimeObj,
            expected_end_time: endTimeObj
          }))
        }
      },
      include: {
        visits: true
      }
    });
  } catch (err) {
    // If DB write fails, refund the quota in Redis
    await redis.decr(redisKey);
    throw new AppError('Failed to create invite, please try again.', 500);
  }

  // Emit websocket events for the newly created pre-approved visits
  try {
    invite.visits.forEach(visit => {
      const dateStr = visit.expected_arrival.toISOString().split('T')[0];
      const room = `office:${visit.office_id}:${dateStr}`;
      getIo().to(room).emit('visit:updated', { ...visit, host: { name: host.name, email: host.email } });
    });
  } catch (err) {
    console.error('Failed to emit socket event', err);
  }

  // 3. Generate QR codes for each visitor, update DB, and email them
  const visitsWithQr = await Promise.all(invite.visits.map(async (visit) => {
    // Generate base64 QR code image from the Visit ID
    const qrCodeDataUrl = await QRCode.toDataURL(visit.id, {
      width: 400,
      margin: 2,
      errorCorrectionLevel: 'M'
    });

    // Update the visit record with the generated QR code
    await prisma.visit.update({
      where: { id: visit.id },
      data: { qr_code_url: qrCodeDataUrl }
    });

    // Email the QR e-pass to the visitor (async, non-blocking)
    sendVisitorQrPass(
      visit.visitor_email,
      visit.visitor_name,
      qrCodeDataUrl,
      event_title,
      dateStr,
      start_time,
      end_time
    );

    return {
      ...visit,
      qr_code: qrCodeDataUrl,
      qr_code_url: qrCodeDataUrl
    };
  }));

  return {
    ...invite,
    visits: visitsWithQr
  };
};

exports.getInvitesForHost = async (hostId) => {
  return await prisma.invite.findMany({
    where: { host_id: hostId },
    include: { visits: true },
    orderBy: { visit_date: 'desc' }
  });
};
