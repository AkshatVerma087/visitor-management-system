const express = require('express');
const visitorController = require('./visitor.controller');
const { protect } = require('../../middleware/auth.middleware');
const { restrictTo } = require('../../middleware/role.middleware');

const router = express.Router();

// Public route for Kiosk to register a walk-in visitor
router.post('/walk-in', visitorController.registerWalkIn);

// Protected routes for dashboard
router.use(protect);

// Host can see their visitors
router.get('/host', restrictTo('Host', 'Admin'), visitorController.getHostVisitors);

// Host can approve/reject a visit
router.post('/:id/decision', restrictTo('Host', 'Admin'), visitorController.makeDecision);

// Security/Admin can get all of today's visitors for their office
router.get('/today', restrictTo('Security', 'Admin'), visitorController.getTodayVisitors);

// Security can check-in a visitor by scanning QR code (which hits this endpoint)
router.post('/:id/checkin', restrictTo('Security', 'Admin'), visitorController.checkIn);

// Security can manually check out a visitor
router.post('/:id/checkout', restrictTo('Security', 'Admin'), visitorController.checkOut);

module.exports = router;
