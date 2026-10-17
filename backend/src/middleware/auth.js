const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');

function protect(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(header.slice(7), config.JWT_SECRET);
    const user = User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: 'User not found' });
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
  });
}

module.exports = { protect, signToken };