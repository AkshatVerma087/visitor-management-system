const express = require('express');
const inviteController = require('./invite.controller');
const { protect } = require('../../middleware/auth.middleware');
const { restrictTo } = require('../../middleware/role.middleware');

const router = express.Router();

// Require all invite actions to be authenticated
router.use(protect);

// Host can create an invite (schedules visitors)
router.post('/', restrictTo('Host', 'Admin'), inviteController.createInvite);

// Host can fetch their invites (Optional for UI later)
router.get('/', restrictTo('Host', 'Admin'), inviteController.getInvites);

module.exports = router;
