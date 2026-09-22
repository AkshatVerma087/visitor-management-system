const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { protect } = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validate');
const { registerSchema, loginSchema } = require('../../validations/auth.schema');

// Public routes
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);

// Refresh token endpoint
router.post('/refresh', authController.refresh);

// Logout endpoint
router.post('/logout', authController.logout);

// Protected Routes
router.get('/me', protect, authController.getMe);

module.exports = router;
