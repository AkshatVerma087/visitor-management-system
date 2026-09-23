const visitorService = require('./visitor.service');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');

exports.registerWalkIn = asyncHandler(async (req, res) => {
  const data = req.body;
  const visit = await visitorService.registerWalkIn(data);
  res.status(201).json(visit);
});

exports.getHostVisitors = asyncHandler(async (req, res) => {
  const hostId = req.user.id;
  const visits = await visitorService.getVisitsForHost(hostId);
  res.json(visits);
});

exports.makeDecision = asyncHandler(async (req, res) => {
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
});

exports.checkIn = asyncHandler(async (req, res) => {
  const visitId = req.params.id;
  const result = await visitorService.checkIn(visitId);
  res.json(result);
});

exports.checkOut = asyncHandler(async (req, res) => {
  const updatedVisit = await visitorService.checkOut(req.params.id, req.user.id);
  res.json(updatedVisit);
});

exports.kioskCheckout = asyncHandler(async (req, res) => {
  const updatedVisit = await visitorService.kioskCheckout(req.body.email);
  res.json(updatedVisit);
});

exports.getTodayVisitors = asyncHandler(async (req, res) => {
  const officeId = req.user.office_id;
  const visitors = await visitorService.getTodayVisitors(officeId);
  res.json(visitors);
});
