const express = require('express');
const inviteController = require('./invite.controller');
const protect = require('../../middleware/auth.middleware');
const restrictTo = require('../../middleware/role.middleware');
const validate = require('../../middleware/validate');
const { createInviteSchema } = require('../../validations/invite.schema');

const router = express.Router();

// Require all invite actions to be authenticated
router.use(protect);

// Only Hosts can invite visitors
router.post('/', restrictTo('Host', 'Admin'), validate(createInviteSchema), inviteController.createInvite);

// Host can fetch their invites (Optional for UI later)
router.get('/', restrictTo('Host', 'Admin'), inviteController.getInvites);

module.exports = router;
