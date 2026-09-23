const cron = require('node-cron');
const prisma = require('../lib/prisma');
const { emitVisitUpdate } = require('../socket/socket.utils');
const { getIo } = require('../socket/socket');

/**
 * BACKGROUND JOBS FOR SECURITY & COMPLIANCE
 * -----------------------------------------
 * This module sets up periodic tasks that enforce physical security rules:
 * 1. Overstay Detection: Flags visitors who have been checked in for > 8 hours.
 * 2. Auto-Expire: Invalidates pre-approved visits that were never used on their scheduled date.
 */

const startCronJobs = () => {
  console.log('🕒 Initializing background security jobs...');

  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      
      // ==========================================
      // 1. OVERSTAY DETECTION
      // ==========================================
      const eightHoursAgo = new Date(now.getTime() - (8 * 60 * 60 * 1000));
      
      const overstayViolators = await prisma.visit.findMany({
        where: {
          status: 'CheckedIn',
          OR: [
            // If they have an explicit expected_end_time, check if we passed it
            {
              expected_end_time: { not: null, lt: now }
            },
            // Fallback for old records: Checked in BEFORE 8 hours ago
            {
              expected_end_time: null,
              check_in_time: { lt: eightHoursAgo }
            }
          ]
        },
        include: { host: { select: { name: true, email: true } } }
      });

      if (overstayViolators.length > 0) {
        console.log(`🚨 Detected ${overstayViolators.length} overstaying visitors!`);
        
        for (const visit of overstayViolators) {
          const updated = await prisma.visit.update({
            where: { id: visit.id },
            data: { status: 'Overstay' },
            include: { host: { select: { name: true, email: true } } }
          });
          emitVisitUpdate(updated);
        }
      }

      // ==========================================
      // 2. AUTO-EXPIRE STALE PRE-APPROVALS & PENDING WALK-INS
      // ==========================================
      const yesterday = new Date(now.getTime() - (24 * 60 * 60 * 1000));

      // Expire Pending Walk-Ins that crossed expected_end_time
      const pendingWalkIns = await prisma.visit.findMany({
        where: {
          status: 'Pending',
          expected_end_time: { not: null, lt: now }
        },
        include: { host: { select: { name: true, email: true } } }
      });

      if (pendingWalkIns.length > 0) {
        console.log(`🗑️ Expiring ${pendingWalkIns.length} ignored walk-in requests.`);
        for (const visit of pendingWalkIns) {
          const updated = await prisma.visit.update({
            where: { id: visit.id },
            data: { status: 'Expired' },
            include: { host: { select: { name: true, email: true } } }
          });
          emitVisitUpdate(updated);
        }
      }

      // Expire Approved pre-invites and walk-ins that have passed their expected end time
      const trulyExpired = await prisma.visit.findMany({
        where: {
          status: 'Approved',
          expected_end_time: { not: null, lt: now }
        },
        include: {
          host: { select: { name: true, email: true } }
        }
      });

      if (trulyExpired.length > 0) {
        console.log(`🗑️ Expiring ${trulyExpired.length} unused visitor passes.`);
        
        for (const visit of trulyExpired) {
          const updated = await prisma.visit.update({
            where: { id: visit.id },
            data: { status: 'Expired' }, // Proper Expired status instead of Rejected
            include: { host: { select: { name: true, email: true } } }
          });
          emitVisitUpdate(updated);
        }
      }

    } catch (err) {
      console.error('Error running background jobs:', err);
    }
  });
};

module.exports = { startCronJobs };
