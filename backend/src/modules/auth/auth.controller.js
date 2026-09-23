const authService = require('./auth.service');
const prisma = require('../../lib/prisma');
const jwtUtils = require('../../lib/jwt.utils');
const jwt = require('jsonwebtoken');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');

const register = asyncHandler(async (req, res) => {
  const newEmployee = await authService.registerEmployee(req.body);
  res.status(201).json({
    message: 'Employee registered successfully',
    data: newEmployee
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const employee = await authService.loginEmployee(email, password);
  
  const accessToken = jwtUtils.generateAccessToken(employee.id, employee.role, employee.office_id);
  const refreshToken = jwtUtils.generateRefreshToken(employee.id);

  jwtUtils.setRefreshTokenCookie(res, refreshToken);

  res.status(200).json({
    token: accessToken,
    user: {
      id: employee.id,
      name: employee.name,
      email: employee.email,
      role: employee.role,
      office_id: employee.office_id
    }
  });
});

const getMe = asyncHandler(async (req, res) => {
  const employee = await prisma.employee.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      office_id: true,
    }
  });

  if (!employee) {
    throw new AppError('User not found', 404);
  }

  res.status(200).json({ user: employee });
});

const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) {
    throw new AppError('Refresh token not found', 401);
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    const employee = await prisma.employee.findUnique({ where: { id: decoded.id } });
    if (!employee) {
      throw new AppError('User not found', 401);
    }

    const newAccessToken = jwtUtils.generateAccessToken(employee.id, employee.role, employee.office_id);
    res.status(200).json({ token: newAccessToken });
  } catch (error) {
    throw new AppError('Invalid or expired refresh token', 401);
  }
});

const logout = asyncHandler(async (req, res) => {
  jwtUtils.clearRefreshTokenCookie(res);
  res.status(200).json({ message: 'Logged out successfully' });
});

module.exports = {
  register,
  login,
  getMe,
  refresh,
  logout
};
