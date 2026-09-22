const prisma = require('../../lib/prisma');
const { getIo } = require('../../socket/socket');

const emitVisitUpdate = (visit) => {
  try {
    const dateStr = visit.expected_arrival.toISOString().split('T')[0];
    const room = `office:${visit.office_id}:${dateStr}`;
    getIo().to(room).emit('visit:updated', visit);
  } catch (err) {
    console.error('Failed to emit visit:updated event', err);
  }
};

exports.registerWalkIn = async (data) => {
  // Extract visitor and host details from the incoming data
  const { visitor_name, visitor_email, visitor_phone, company, purpose, host_id, photo_url } = data;

  // Validate that essential fields are provided
  if (!visitor_name || !visitor_email || !host_id) {
    throw new Error('Missing required fields: visitor_name, visitor_email, host_id');
  }

  // Find host to get office_id
  const host = await prisma.employee.findUnique({
    where: { id: host_id }
  });

  if (!host) {
    throw new Error('Host not found');
  }

  // Create a new Visit record indicating a walk-in is waiting
  const updatedVisit = await prisma.visit.create({
    data: {
      visitor_name,
      visitor_email,
      visitor_phone,
      company,
      purpose,
      photo_url,
      host_id,
      office_id: host.office_id,
      status: 'Pending',
      expected_arrival: new Date() // Walk-ins arrive immediately
    },
    include: {
      host: { select: { name: true, email: true } }
    }
  });

  emitVisitUpdate(updatedVisit);

  return updatedVisit;
};

exports.getVisitsForHost = async (hostId) => {
  // Query all visits assigned to the specific host, ordered by most recent
  return await prisma.visit.findMany({
    where: { host_id: hostId },
    orderBy: { created_at: 'desc' }
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
      data: { status: decision },
      include: {
        host: { select: { name: true, email: true } }
      }
    })
  ]);

  // TODO: Send Email with QR code if approved (Phase 4)

  emitVisitUpdate(updatedVisit);
  return updatedVisit;
};

exports.checkIn = async (visitId) => {
  // Fetch the visit to validate its state
  const visit = await prisma.visit.findUnique({ where: { id: visitId } });
  if (!visit) throw new Error('Visit not found');
  
  // Can only check in if they are Approved
  if (visit.status !== 'Approved') {
    throw new Error(`Cannot check in visitor. Current status: ${visit.status}`);
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
  
  if (visit.status !== 'CheckedIn') {
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

exports.getTodayVisitors = async (officeId) => {
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
      host: { select: { name: true, email: true } }
    },
    orderBy: { expected_arrival: 'asc' }
  });
};
