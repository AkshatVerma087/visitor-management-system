const jwt = require('jsonwebtoken');

function protect(req, res, next) {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'Not authorized, no token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attach the token payload to the request
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Not authorized, token failed' });
  }
}

module.exports = {
  protect
};
