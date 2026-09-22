const express = require('express');
const visitorController = require('./visitor.controller');
const { protect } = require('../../middleware/auth.middleware');
const { restrictTo } = require('../../middleware/role.middleware');
const validate = require('../../middleware/validate');
const { walkInSchema, decisionSchema } = require('../../validations/visitor.schema');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiter for public kiosk routes
const kioskLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 requests per windowMs
  message: { error: 'Too many requests from this IP, please try again later.' }
});

// Public route for Kiosk to register a walk-in visitor
router.post('/walk-in', kioskLimiter, validate(walkInSchema), visitorController.registerWalkIn);

// Public route for Kiosk QR scanner — auto check-in for pre-approved visitors only
router.post('/:id/qr-checkin', kioskLimiter, visitorController.checkIn);

// Protected routes for dashboard
router.use(protect);

// Host can see their visitors
router.get('/host', restrictTo('Host', 'Admin'), visitorController.getHostVisitors);

// Host can approve/reject a visit
router.post('/:id/decision', restrictTo('Host', 'Admin'), validate(decisionSchema), visitorController.makeDecision);

// Security/Admin can get all of today's visitors for their office
router.get('/today', restrictTo('Security', 'Admin'), visitorController.getTodayVisitors);

// Security can check-in a visitor by scanning QR code (which hits this endpoint)
router.post('/:id/checkin', restrictTo('Security', 'Admin'), visitorController.checkIn);

// Security can manually check out a visitor
router.post('/:id/checkout', restrictTo('Security', 'Admin'), visitorController.checkOut);

module.exports = router;
