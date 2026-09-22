const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const visitsToUpdate = await prisma.visit.findMany({
    where: { expected_end_time: null, invite_id: { not: null } },
    include: { invite: true }
  });

  console.log(`Found ${visitsToUpdate.length} visits to patch...`);

  for (const visit of visitsToUpdate) {
    if (visit.invite && visit.invite.end_time) {
      await prisma.visit.update({
        where: { id: visit.id },
        data: { expected_end_time: visit.invite.end_time }
      });
      console.log(`Patched visit ${visit.id} with end_time ${visit.invite.end_time}`);
    }
  }
}

main().finally(() => prisma.$disconnect());
