const prisma = require('../../lib/prisma');
const asyncHandler = require('../../utils/asyncHandler');

exports.getHosts = asyncHandler(async (req, res) => {
  const hosts = await prisma.employee.findMany({
    where: {
      role: {
        in: ['Host', 'Admin']
      }
    },
    select: {
      id: true,
      name: true,
      email: true,
      department: true,
      office: {
        select: {
          name: true
        }
      }
    }
  });

  res.json(hosts);
});

exports.getOffices = asyncHandler(async (req, res) => {
  const offices = await prisma.office.findMany({
    select: {
      id: true,
      name: true,
      address: true
    }
  });
  res.json(offices);
});
