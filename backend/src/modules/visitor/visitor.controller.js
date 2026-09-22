const visitorService = require('./visitor.service');

exports.registerWalkIn = async (req, res) => {
  try {
    const data = req.body;
    const visit = await visitorService.registerWalkIn(data);
    res.status(201).json(visit);
  } catch (error) {
    console.error('Walk-in error:', error);
    res.status(400).json({ error: error.message });
  }
};

exports.getHostVisitors = async (req, res) => {
  try {
    const hostId = req.user.id;
    const visits = await visitorService.getVisitsForHost(hostId);
    res.json(visits);
  } catch (error) {
    console.error('Get host visits error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.makeDecision = async (req, res) => {
  try {
    const visitId = req.params.id;
    const hostId = req.user.id;
    const { decision, idempotency_key } = req.body;

    const result = await visitorService.makeDecision({
      visitId,
      hostId,
      decision,
      idempotency_key
    });

    res.json(result);
  } catch (error) {
    console.error('Make decision error:', error);
    res.status(400).json({ error: error.message });
  }
};

exports.checkIn = async (req, res) => {
  try {
    const visitId = req.params.id;
    const result = await visitorService.checkIn(visitId);
    res.json(result);
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(400).json({ error: error.message });
  }
};

exports.checkOut = async (req, res) => {
  try {
    const visitId = req.params.id;
    const result = await visitorService.checkOut(visitId, req.user.id);
    res.json(result);
  } catch (error) {
    console.error('Check-out error:', error);
    res.status(400).json({ error: error.message });
  }
};

exports.getTodayVisitors = async (req, res) => {
  try {
    const officeId = req.user.office_id;
    const visitors = await visitorService.getTodayVisitors(officeId);
    res.json(visitors);
  } catch (error) {
    console.error('Get today visitors error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
