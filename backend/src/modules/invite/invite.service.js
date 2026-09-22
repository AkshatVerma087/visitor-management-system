const prisma = require('../../lib/prisma');
const redis = require('../../lib/redis');
const QRCode = require('qrcode');
const { getIo } = require('../../socket/socket');
const { sendVisitorQrPass } = require('../../lib/mailer');

exports.createInvite = async (hostId, data) => {
  const { event_title, visit_type, visit_date, start_time, end_time, note, visitors } = data;

  if (!event_title || !visit_date || !start_time || !end_time || !visitors || visitors.length === 0) {
    throw new Error('Missing required fields or visitors');
  }

  // 1. Rate Limiting: Enforce max 5 invites per host per day
  const dateStr = visit_date.split('T')[0];
  const redisKey = `daily_invites:${hostId}:${dateStr}`;
  
  // Increment counter. If it's the first one, set expiration to 24h.
  const currentCount = await redis.incr(redisKey);
  if (currentCount === 1) {
    await redis.expire(redisKey, 86400); // 24 hours
  }

  if (currentCount > 5) {
    // Revert increment since it failed
    await redis.decr(redisKey);
    throw new Error('Daily invite limit reached (max 5 per day)');
  }

  // Fetch host to get office_id
  const host = await prisma.employee.findUnique({ where: { id: hostId } });
  if (!host) throw new Error('Host not found');

  // Parse dates
  const visitDateObj = new Date(visit_date);
  const startTimeObj = new Date(`${visit_date.split('T')[0]}T${start_time}`);
  const endTimeObj = new Date(`${visit_date.split('T')[0]}T${end_time}`);

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
            expected_arrival: startTimeObj
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
    throw new Error('Failed to create invite, please try again.');
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

  // 3. Generate QR codes for each visitor and email them
  const visitsWithQr = await Promise.all(invite.visits.map(async (visit) => {
    // Generate base64 QR code image from the Visit ID
    const qrCodeDataUrl = await QRCode.toDataURL(visit.id);

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
      qr_code: qrCodeDataUrl
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
