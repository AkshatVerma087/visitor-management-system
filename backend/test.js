const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const visits = await prisma.visit.findMany({
    orderBy: { created_at: 'desc' },
    take: 3,
    include: { invite: true }
  });
  console.log(JSON.stringify(visits, null, 2));
}

main().finally(() => prisma.$disconnect());
