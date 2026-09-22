const inviteService = require('./invite.service');

exports.createInvite = async (req, res) => {
  try {
    const hostId = req.user.id;
    // Extract invite details from request body
    const { event_title, visit_type, visit_date, start_time, end_time, note, visitors } = req.body;

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
    console.error('Create invite error:', error);
    // If it's a rate limit error, return 429
    if (error.message.includes('Daily invite limit reached')) {
      return res.status(429).json({ error: error.message });
    }
    res.status(400).json({ error: error.message });
  }
};

exports.getInvites = async (req, res) => {
  try {
    const hostId = req.user.id;
    const invites = await inviteService.getInvitesForHost(hostId);
    res.json(invites);
  } catch (error) {
    console.error('Get invites error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
