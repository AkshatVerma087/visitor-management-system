const authService = require('./auth.service');
const prisma = require('../../lib/prisma');
const jwtUtils = require('../../lib/jwt.utils');
const jwt = require('jsonwebtoken');

async function register(req, res, next) {
  try {
    const newEmployee = await authService.registerEmployee(req.body);
    res.status(201).json({
      message: 'Employee registered successfully',
      data: newEmployee
    });
  } catch (error) {
    if (error.message.includes('Missing required fields') || error.message.includes('already registered')) {
      return res.status(400).json({ error: error.message });
    }
    next(error); // Pass to global error handler
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const employee = await authService.loginEmployee(email, password);
    
    // Generate tokens
    const accessToken = jwtUtils.generateAccessToken(employee.id, employee.role, employee.office_id);
    const refreshToken = jwtUtils.generateRefreshToken(employee.id);

    // Set HTTP-only cookie
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
  } catch (error) {
    if (error.message.includes('Invalid credentials') || error.message.includes('Missing')) {
      return res.status(401).json({ error: error.message });
    }
    next(error);
  }
}

async function getMe(req, res, next) {
  try {
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
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ user: employee });
  } catch (error) {
    console.error('getMe error:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
}

async function refresh(req, res, next) {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token not found' });
    }

    // Verify token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    
    // Check if user still exists
    const employee = await prisma.employee.findUnique({ where: { id: decoded.id } });
    if (!employee) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Generate new access token
    const newAccessToken = jwtUtils.generateAccessToken(employee.id, employee.role, employee.office_id);
    
    res.status(200).json({ token: newAccessToken });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
}

async function logout(req, res, next) {
  jwtUtils.clearRefreshTokenCookie(res);
  res.status(200).json({ message: 'Logged out successfully' });
}

module.exports = {
  register,
  login,
  getMe,
  refresh,
  logout
};
