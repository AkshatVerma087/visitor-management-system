const inviteService = require('./invite.service');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');

exports.createInvite = asyncHandler(async (req, res) => {
  const hostId = req.user.id;
  const { event_title, visit_type, visit_date, start_time, end_time, note, visitors, timezone } = req.body;

  const result = await inviteService.createInvite(hostId, {
    event_title,
    visit_type,
    visit_date,
    start_time,
    end_time,
    note,
    visitors,
    timezone
  });

  res.status(201).json(result);
});

exports.getInvites = asyncHandler(async (req, res) => {
  const hostId = req.user.id;
  const invites = await inviteService.getInvitesForHost(hostId);
  res.json(invites);
});
