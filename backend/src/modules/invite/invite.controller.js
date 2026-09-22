const inviteService = require('./invite.service');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');

exports.createInvite = asyncHandler(async (req, res) => {
  const hostId = req.user.id;
  const { event_title, visit_type, visit_date, start_time, end_time, note, visitors } = req.body;

  try {
    const result = await inviteService.createInvite(hostId, {
      event_title,
      visit_type,
      visit_date,
      start_time,
      end_time,
      note,
      visitors
    });
    res.status(201).json(result);
  } catch (error) {
    if (error.message && error.message.includes('Daily invite limit reached')) {
      throw new AppError(error.message, 429);
    }
    if (error.message && error.message.includes('Missing required')) {
      throw new AppError(error.message, 400);
    }
    throw error;
  }
});

exports.getInvites = asyncHandler(async (req, res) => {
  const hostId = req.user.id;
  const invites = await inviteService.getInvitesForHost(hostId);
  res.json(invites);
});
