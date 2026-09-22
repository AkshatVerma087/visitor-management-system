const express = require('express');
const router = express.Router();
const adminController = require('./admin.controller');
const { protect } = require('../../middleware/auth.middleware');
const { restrictTo } = require('../../middleware/role.middleware');

router.use(protect);
router.use(restrictTo('Admin'));

router.get('/stats', adminController.getStats);
router.get('/employees', adminController.getEmployees);
router.get('/approvals', adminController.getApprovals);

module.exports = router;
