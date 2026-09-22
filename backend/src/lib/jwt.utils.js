const jwt = require('jsonwebtoken');

/**
 * Generate a short-lived Access Token (e.g., 15 minutes)
 */
const generateAccessToken = (userId, role, officeId) => {
  return jwt.sign(
    { id: userId, role, office_id: officeId },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
};

/**
 * Generate a long-lived Refresh Token (e.g., 7 days)
 */
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, // Fallback for demo
    { expiresIn: '7d' }
  );
};

/**
 * Attach the refresh token to the response via an httpOnly cookie
 */
const setRefreshTokenCookie = (res, refreshToken) => {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // true if https
    sameSite: 'strict', // CSRF protection
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in ms
  });
};

/**
 * Clear the refresh token cookie (for logout)
 */
const clearRefreshTokenCookie = (res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie
};
