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
      // 1. OVERSTAY DETECTION (8+ hours checked in)
      // ==========================================
      const eightHoursAgo = new Date(now.getTime() - (8 * 60 * 60 * 1000));
      const yesterday = new Date(now.getTime() - (24 * 60 * 60 * 1000));
      
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
      // Find Approved visits that have a parent invite whose end_time has passed,
      // OR Approved visits without an invite that are older than 24 hours.
      const expiredVisits = await prisma.visit.findMany({
        where: {
          status: 'Approved',
          OR: [
            // Pre-approved visits: check if the invite's end_time (on the visit_date) has passed
            {
              invite_id: { not: null },
              invite: {
                // The visit_date + end_time combination is in the past
                visit_date: { lte: now }
              }
            },
            // Walk-in approved visits without an invite: expire after 24h
            {
              invite_id: null,
              expected_arrival: { lt: yesterday }
            }
          ]
        },
        include: {
          host: { select: { name: true, email: true } },
          invite: true // Load invite to do a precise end_time check
        }
      });

      // Filter invite-based visits more precisely using the end_time
      const trulyExpired = expiredVisits.filter(visit => {
        if (!visit.invite) return true; // Non-invite visits already filtered by 24h
        // Build the full end datetime from visit_date + end_time
        const visitDateStr = visit.invite.visit_date.toISOString().split('T')[0];
        const endHour = visit.invite.end_time.getHours();
        const endMin = visit.invite.end_time.getMinutes();
        const endDateTime = new Date(`${visitDateStr}T${String(endHour).padStart(2,'0')}:${String(endMin).padStart(2,'0')}:00`);
        return now > endDateTime; // Only expire if we're past the end time
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
