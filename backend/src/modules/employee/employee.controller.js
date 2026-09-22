const prisma = require('../../lib/prisma');

exports.getHosts = async (req, res) => {
  try {
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
  } catch (error) {
    console.error('Get hosts error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getOffices = async (req, res) => {
  try {
    const offices = await prisma.office.findMany({
      select: {
        id: true,
        name: true,
        location: true
      }
    });
    res.json(offices);
  } catch (error) {
    console.error('Get offices error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
