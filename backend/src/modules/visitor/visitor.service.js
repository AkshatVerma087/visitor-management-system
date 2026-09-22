const prisma = require('../../lib/prisma');
const { emitVisitUpdate } = require('../../socket/socket.utils');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const { sendHostNotification, sendApprovalQr } = require('../../lib/mailer');

exports.registerWalkIn = async (data) => {
  // Extract visitor and host details from the incoming data
  const { visitor_name, visitor_email, visitor_phone, company, purpose, host_id, photo_url, duration_hours } = data;

  // Validate that essential fields are provided
  if (!visitor_name || !visitor_email || !host_id) {
    throw new Error('Missing required fields: visitor_name, visitor_email, host_id');
  }

  // Handle Base64 photo upload
  let savedPhotoUrl = photo_url;
  if (photo_url && photo_url.startsWith('data:image')) {
    try {
      const base64Data = photo_url.replace(/^data:image\/\w+;base64,/, "");
      const fileName = `visitor_${Date.now()}_${Math.round(Math.random()*1E9)}.jpg`;
      const uploadPath = path.join(__dirname, '../../..', 'public', 'uploads', fileName);
      fs.writeFileSync(uploadPath, base64Data, 'base64');
      savedPhotoUrl = `/uploads/${fileName}`;
    } catch (err) {
      console.error('Failed to save photo:', err);
    }
  }

  // Find host to get office_id
  const host = await prisma.employee.findUnique({
    where: { id: host_id }
  });

  if (!host) {
    throw new Error('Host not found');
  }

  // Calculate expected end time based on duration (default 1 hr if not provided)
  const hours = parseInt(duration_hours || 1, 10);
  const expectedEnd = new Date(Date.now() + hours * 60 * 60 * 1000);

  // Create a new Visit record indicating a walk-in is waiting
  const updatedVisit = await prisma.visit.create({
    data: {
      visitor_name,
      visitor_email,
      visitor_phone,
      company,
      purpose,
      photo_url: savedPhotoUrl,
      host_id,
      office_id: host.office_id,
      status: 'Pending',
      expected_arrival: new Date(), // Walk-ins arrive immediately
      expected_end_time: expectedEnd
    },
    include: {
      host: { select: { name: true, email: true } }
    }
  });

  emitVisitUpdate(updatedVisit);

  // Email the host to notify them about the walk-in (async, non-blocking)
  sendHostNotification(host.email, host.name, visitor_name, purpose);

  return updatedVisit;
};

exports.getVisitsForHost = async (hostId, skip = 0, take = 50) => {
  // Query all visits assigned to the specific host, ordered by most recent
  return await prisma.visit.findMany({
    where: { host_id: hostId },
    orderBy: { created_at: 'desc' },
    skip: Number(skip),
    take: Number(take)
  });
};

exports.makeDecision = async ({ visitId, hostId, decision, idempotency_key }) => {
  // Ensure the decision is strictly Approved or Rejected
  if (!['Approved', 'Rejected'].includes(decision)) {
    throw new Error('Invalid decision');
  }
  // Generic error to prevent exposing internal architecture (security fix)
  if (!idempotency_key) {
    throw new Error('Invalid request parameters');
  }

  // 1. Check if idempotency key already exists to prevent duplicate processing
  const existingApproval = await prisma.approval.findUnique({
    where: { idempotency_key }
  });

  if (existingApproval) {
    return await prisma.visit.findUnique({ where: { id: visitId } });
  }

  // 2. Fetch visit and verify ownership
  const visit = await prisma.visit.findUnique({ where: { id: visitId } });
  if (!visit) throw new Error('Visit not found');
  if (visit.host_id !== hostId) throw new Error('Unauthorized to approve this visit');
  if (visit.status !== 'Pending') throw new Error('Visit is already processed');

  // Auto check-in for walk-ins if Approved
  const isWalkIn = !visit.invite_id;
  const newStatus = (decision === 'Approved' && isWalkIn) ? 'CheckedIn' : decision;
  const checkInTime = newStatus === 'CheckedIn' ? new Date() : null;
  
  // If auto check-in, push the expected_end_time out relative to check_in_time if we want?
  // We'll leave it as originally calculated from registration for simplicity.

  // 3. Process the approval in a transaction
  const [approval, updatedVisit] = await prisma.$transaction([
    prisma.approval.create({
      data: {
        visit_id: visitId,
        decision,
        decided_by: hostId,
        idempotency_key
      }
    }),
    prisma.visit.update({
      where: { id: visitId },
      data: { 
        status: newStatus,
        ...(checkInTime && { check_in_time: checkInTime })
      },
      include: {
        host: { select: { name: true, email: true } }
      }
    })
  ]);

  // If approved, generate a QR badge and email it to the visitor
  if (decision === 'Approved') {
    QRCode.toDataURL(visitId).then(qrDataUrl => {
      sendApprovalQr(updatedVisit.visitor_email, updatedVisit.visitor_name, qrDataUrl);
    }).catch(err => console.error('Failed to generate approval QR:', err));
  }

  emitVisitUpdate(updatedVisit);
  return updatedVisit;
};

exports.checkIn = async (visitId) => {
  // Fetch the visit and its parent invite (if any) to validate state + time window
  const visit = await prisma.visit.findUnique({
    where: { id: visitId },
    include: { invite: true } // Load parent invite for time window check
  });
  if (!visit) throw new Error('Visit not found');
  
  // Can only check in if they are Approved
  if (visit.status !== 'Approved') {
    throw new Error(`Cannot check in visitor. Current status: ${visit.status}`);
  }

  // If this visit came from a pre-approval invite, validate the time window
  if (visit.invite) {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localNow = new Date(now.getTime() - offset);
    const today = localNow.toISOString().split('T')[0];
    const visitDate = visit.invite.visit_date.toISOString().split('T')[0];

    // Check that today matches the scheduled visit date
    if (today !== visitDate) {
      throw new Error('This pass is not valid for today. Visit is scheduled for ' + visitDate);
    }

    // Check that current time is within the start_time – end_time window
    // We compare hours and minutes only since start_time/end_time are stored as DateTime with date part
    const startHour = visit.invite.start_time.getHours();
    const startMin = visit.invite.start_time.getMinutes();
    const endHour = visit.invite.end_time.getHours();
    const endMin = visit.invite.end_time.getMinutes();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (nowMinutes < startMinutes || nowMinutes > endMinutes) {
      throw new Error(
        `Check-in is only allowed between ${String(startHour).padStart(2,'0')}:${String(startMin).padStart(2,'0')} and ${String(endHour).padStart(2,'0')}:${String(endMin).padStart(2,'0')}. Pass has expired or is not yet valid.`
      );
    }
  }

  // Update status to CheckedIn and record the timestamp
  const updatedVisit = await prisma.visit.update({
    where: { id: visitId },
    data: {
      status: 'CheckedIn',
      check_in_time: new Date()
    },
    include: {
      host: { select: { name: true, email: true } }
    }
  });

  emitVisitUpdate(updatedVisit);
  return updatedVisit;
};

exports.checkOut = async (visitId, securityId) => {
  const visit = await prisma.visit.findUnique({ where: { id: visitId } });
  if (!visit) throw new Error('Visit not found');
  
  // Allow checkout from both CheckedIn AND Overstay (overstay visitors were stuck before this fix)
  if (visit.status !== 'CheckedIn' && visit.status !== 'Overstay') {
    throw new Error(`Cannot check out visitor. Current status: ${visit.status}`);
  }

  const updatedVisit = await prisma.visit.update({
    where: { id: visitId },
    data: {
      status: 'CheckedOut',
      check_out_time: new Date(),
      checked_out_by: securityId
    },
    include: {
      host: { select: { name: true, email: true } }
    }
  });

  emitVisitUpdate(updatedVisit);
  return updatedVisit;
};

exports.kioskCheckout = async (email) => {
  // Find active CheckedIn or Overstay visit for this email
  const visits = await prisma.visit.findMany({
    where: {
      visitor_email: email,
      status: { in: ['CheckedIn', 'Overstay'] }
    },
    orderBy: { created_at: 'desc' },
    take: 1
  });

  if (visits.length === 0) {
    throw new Error('No active check-in found for this email address.');
  }

  const visit = visits[0];
  const updatedVisit = await prisma.visit.update({
    where: { id: visit.id },
    data: {
      status: 'CheckedOut',
      check_out_time: new Date(),
      checked_out_by: 'Kiosk'
    },
    include: {
      host: { select: { name: true, email: true } }
    }
  });

  emitVisitUpdate(updatedVisit);
  return updatedVisit;
};

exports.getTodayVisitors = async (officeId, skip = 0, take = 50) => {
  // We define "today" as from 00:00:00 to 23:59:59 local time.
  // For simplicity in this demo, we'll just fetch anything that is roughly today using expected_arrival bounds
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return await prisma.visit.findMany({
    where: {
      office_id: officeId,
      expected_arrival: {
        gte: today,
        lt: tomorrow
      }
    },
    include: {
      host: { select: { name: true, email: true } },
      invite: { select: { id: true, event_title: true, visit_type: true } }
    },
    orderBy: { expected_arrival: 'asc' },
    skip: Number(skip),
    take: Number(take)
  });
};
