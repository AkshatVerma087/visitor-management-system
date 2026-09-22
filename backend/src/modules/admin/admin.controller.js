const adminService = require('./admin.service');
const asyncHandler = require('../../utils/asyncHandler');

exports.getStats = asyncHandler(async (req, res) => {
  const stats = await adminService.getStats();
  res.json(stats);
});

exports.getEmployees = asyncHandler(async (req, res) => {
  const employees = await adminService.getEmployees();
  res.json(employees);
});

exports.getApprovals = asyncHandler(async (req, res) => {
  const approvals = await adminService.getApprovals();
  res.json(approvals);
});
