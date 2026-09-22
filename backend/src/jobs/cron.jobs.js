const cron = require('node-cron');
const prisma = require('../lib/prisma');
const { getIo } = require('../socket/socket');

/**
 * BACKGROUND JOBS FOR SECURITY & COMPLIANCE
 * -----------------------------------------
 * This module sets up periodic tasks that enforce physical security rules:
 * 1. Overstay Detection: Flags visitors who have been checked in for > 8 hours.
 * 2. Auto-Expire: Invalidates pre-approved visits that were never used on their scheduled date.
 */

// Helper to emit websocket events to the specific office room
const emitVisitUpdate = (visit) => {
  try {
    const dateStr = visit.expected_arrival.toISOString().split('T')[0];
    const room = `office:${visit.office_id}:${dateStr}`;
    getIo().to(room).emit('visit:updated', visit);
  } catch (err) {
    console.error('Failed to emit visit:updated event from cron job', err);
  }
};

const startCronJobs = () => {
  console.log('🕒 Initializing background security jobs...');

  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      
      // ==========================================
      // 1. OVERSTAY DETECTION (8+ hours checked in)
      // ==========================================
      const eightHoursAgo = new Date(now.getTime() - (8 * 60 * 60 * 1000));
      
      const overstayViolators = await prisma.visit.findMany({
        where: {
          status: 'CheckedIn',
          check_in_time: {
            lt: eightHoursAgo // Checked in BEFORE 8 hours ago
          }
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
      // 2. AUTO-EXPIRE STALE PRE-APPROVALS
      // ==========================================
      // If a visitor was approved but never checked in, and 24 hours have passed since their expected arrival, expire it.
      const yesterday = new Date(now.getTime() - (24 * 60 * 60 * 1000));

      const expiredVisits = await prisma.visit.findMany({
        where: {
          status: 'Approved',
          expected_arrival: {
            lt: yesterday
          }
        },
        include: { host: { select: { name: true, email: true } } }
      });

      if (expiredVisits.length > 0) {
        console.log(`🗑️ Expiring ${expiredVisits.length} unused visitor passes.`);
        
        for (const visit of expiredVisits) {
          const updated = await prisma.visit.update({
            where: { id: visit.id },
            data: { status: 'Rejected' }, // Using Rejected as proxy for Expired based on schema
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
