const prisma = require('../../lib/prisma');

exports.getStats = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    todayVisits,
    weekVisits,
    monthVisits,
    activeVisits,
    pendingVisits,
    overstayVisits,
    employeesCount
  ] = await Promise.all([
    prisma.visit.count({ where: { expected_arrival: { gte: today, lt: tomorrow } } }),
    prisma.visit.count({ where: { expected_arrival: { gte: startOfWeek } } }),
    prisma.visit.count({ where: { expected_arrival: { gte: startOfMonth } } }),
    prisma.visit.count({ where: { status: 'CheckedIn' } }),
    prisma.visit.count({ where: { status: 'Pending' } }),
    prisma.visit.count({ where: { status: 'Overstay' } }),
    prisma.employee.count()
  ]);

  return {
    visitorsToday: todayVisits,
    visitorsThisWeek: weekVisits,
    visitorsThisMonth: monthVisits,
    activeVisits,
    pendingVisits,
    overstayVisits,
    totalEmployees: employeesCount
  };
};

exports.getEmployees = async () => {
  return await prisma.employee.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      created_at: true,
      office: {
        select: { name: true }
      }
    },
    orderBy: { created_at: 'desc' }
  });
};

exports.getApprovals = async () => {
  return await prisma.approval.findMany({
    take: 50,
    orderBy: { decided_at: 'desc' },
    include: {
      visit: { select: { visitor_name: true, company: true } },
      decider: { select: { name: true } }
    }
  });
};
