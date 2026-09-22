const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create or find the main office
  let office = await prisma.office.findFirst({
    where: { name: 'HQ' }
  });

  if (!office) {
    office = await prisma.office.create({
      data: {
        name: 'HQ',
        address: '123 Main St'
      }
    });
  }
  console.log(`Office ensured with ID: ${office.id}`);

  // 2. Hash a default password for all seeded users
  const defaultPassword = 'password123';
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  // 3. Seed Admin
  const admin = await prisma.employee.upsert({
    where: { email: 'admin@office.com' },
    update: {},
    create: {
      name: 'Alice Admin',
      email: 'admin@office.com',
      password: hashedPassword,
      role: 'Admin',
      office_id: office.id
    }
  });

  // 4. Seed Host
  const host = await prisma.employee.upsert({
    where: { email: 'host@office.com' },
    update: {},
    create: {
      name: 'Harry Host',
      email: 'host@office.com',
      password: hashedPassword,
      role: 'Host',
      office_id: office.id
    }
  });

  // 5. Seed More Hosts
  const host2 = await prisma.employee.upsert({
    where: { email: 'john.host@office.com' },
    update: {},
    create: {
      name: 'John Host',
      email: 'john.host@office.com',
      password: hashedPassword,
      role: 'Host',
      office_id: office.id
    }
  });

  const host3 = await prisma.employee.upsert({
    where: { email: 'sarah.host@office.com' },
    update: {},
    create: {
      name: 'Sarah Host',
      email: 'sarah.host@office.com',
      password: hashedPassword,
      role: 'Host',
      office_id: office.id
    }
  });

  // 6. Seed Security
  const security = await prisma.employee.upsert({
    where: { email: 'security@office.com' },
    update: {},
    create: {
      name: 'Sam Security',
      email: 'security@office.com',
      password: hashedPassword,
      role: 'Security',
      office_id: office.id
    }
  });

  console.log('--- Seed Data Created ---');
  console.log(`Admin: ${admin.email}`);
  console.log(`Host 1: ${host.email}`);
  console.log(`Host 2: ${host2.email}`);
  console.log(`Host 3: ${host3.email}`);
  console.log(`Security: ${security.email}`);
  console.log(`Password for all: ${defaultPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
