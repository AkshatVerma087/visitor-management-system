const express = require('express');
const { getHosts } = require('./employee.controller');

const router = express.Router();

// Public route (kiosk needs it) to fetch available hosts
router.get('/hosts', getHosts);

module.exports = router;
