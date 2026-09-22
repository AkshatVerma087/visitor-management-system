const express = require('express');
const { getHosts, getOffices } = require('./employee.controller');

const router = express.Router();

// Public route (kiosk needs it) to fetch available hosts
router.get('/hosts', getHosts);

// Public route for fetching offices (used in registration)
router.get('/offices', getOffices);

module.exports = router;
