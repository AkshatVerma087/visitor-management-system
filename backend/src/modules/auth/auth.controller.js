const authService = require('./auth.service');

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
    const result = await authService.loginEmployee(email, password);
    res.status(200).json(result);
  } catch (error) {
    if (error.message.includes('Invalid credentials') || error.message.includes('Missing')) {
      return res.status(401).json({ error: error.message });
    }
    next(error);
  }
}

async function getMe(req, res, next) {
  try {
    // req.user is set by the auth middleware
    res.status(200).json({ user: req.user });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login,
  getMe
};
