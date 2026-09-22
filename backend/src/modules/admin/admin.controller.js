const adminService = require('./admin.service');

exports.getStats = async (req, res) => {
  try {
    const stats = await adminService.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getEmployees = async (req, res) => {
  try {
    const employees = await adminService.getEmployees();
    res.json(employees);
  } catch (error) {
    console.error('Admin employees error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getApprovals = async (req, res) => {
  try {
    const approvals = await adminService.getApprovals();
    res.json(approvals);
  } catch (error) {
    console.error('Admin approvals error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
