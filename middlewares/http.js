// middlewares/http.js
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/jwt');

function isAdmin(req, res, next) {
  const user = req.user; // Assuming you're attaching the user to the request (via auth middleware)

  if (!user || user.userType !== 1) {
    return res.status(403).json({ message: 'Access denied. Admins only.' });
  }

  next();
}

function getUserIdFromToken(req) {
  try {
    const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
    if (!token) {
      throw new Error('Token not found');
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.userId;
  } catch (error) {
    console.error('Token decode error:', error.message);
    return null;
  }
}

function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization token missing or invalid format' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = { id: decoded.userId }; // attach decoded userId to request

    next(); // pass control to next middleware/route
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Expected format: Bearer <token>

  if (!token) {
    return res.status(401).json({ error: 'Token not provided' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    req.user = user; // Attach the decoded user info to the request
    next();
  });
}

function isVendor(req, res, next) {
  if (req.user.userType !== 4) {
    return res.status(403).json({ message: 'Access denied. Vendor only.' });
  }
  next();
}

function isAdminOrVendor(req, res, next) {
  if (req.user.userType === 1 || req.user.userType === 4) {
    return next();
  }
  return res.status(403).json({ message: 'Access denied. Admin/Vendor only.' });
}

module.exports = {
  getUserIdFromToken,
  verifyToken,
  isAdmin,
  isVendor,
  isAdminOrVendor,
};
