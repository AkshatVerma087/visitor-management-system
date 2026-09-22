const visitorService = require('./visitor.service');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');

// Helper to wrap known operational errors from service
const handleServiceError = (error) => {
  if (error.message && (error.message.includes('not found') || error.message.includes('expired') || error.message.includes('Cannot') || error.message.includes('not valid'))) {
    throw new AppError(error.message, 400);
  }
  throw error; // Let global handler catch 500 DB errors
};

exports.registerWalkIn = asyncHandler(async (req, res) => {
  try {
    const data = req.body;
    const visit = await visitorService.registerWalkIn(data);
    res.status(201).json(visit);
  } catch (error) {
    handleServiceError(error);
  }
});

exports.getHostVisitors = asyncHandler(async (req, res) => {
  const hostId = req.user.id;
  const visits = await visitorService.getVisitsForHost(hostId);
  res.json(visits);
});

exports.makeDecision = asyncHandler(async (req, res) => {
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
    handleServiceError(error);
  }
});

exports.checkIn = asyncHandler(async (req, res) => {
  try {
    const visitId = req.params.id;
    const result = await visitorService.checkIn(visitId);
    res.json(result);
  } catch (error) {
    handleServiceError(error);
  }
});

exports.checkOut = asyncHandler(async (req, res) => {
  try {
    const updatedVisit = await visitorService.checkOut(req.params.id, req.user.id);
    res.json(updatedVisit);
  } catch (error) {
    handleServiceError(error);
  }
});

exports.kioskCheckout = asyncHandler(async (req, res) => {
  try {
    const updatedVisit = await visitorService.kioskCheckout(req.body.email);
    res.json(updatedVisit);
  } catch (error) {
    handleServiceError(error);
  }
});

exports.getTodayVisitors = asyncHandler(async (req, res) => {
  const officeId = req.user.office_id;
  const visitors = await visitorService.getTodayVisitors(officeId);
  res.json(visitors);
});
