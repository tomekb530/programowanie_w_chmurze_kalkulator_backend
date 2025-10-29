const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware do weryfikacji tokenu JWT
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access denied',
        message: 'No token provided. Please log in.'
      });
    }

    // Weryfikacja tokenu
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
    
    // Sprawdź czy użytkownik nadal istnieje i jest aktywny
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Access denied',
        message: 'User not found or inactive'
      });
    }

    // Dodaj informacje o użytkowniku do request
    req.user = {
      userId: user._id,
      username: user.username,
      email: user.email
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Access denied',
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Access denied',
        message: 'Token expired. Please log in again.'
      });
    }

    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication error',
      message: 'Internal server error during authentication'
    });
  }
};

// Opcjonalne middleware - nie wymaga tokenu, ale jeśli jest podany, weryfikuje go
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
    const user = await User.findById(decoded.userId);
    
    if (user && user.isActive) {
      req.user = {
        userId: user._id,
        username: user.username,
        email: user.email
      };
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

// Funkcja do generowania tokenu JWT
const generateToken = (userId, username) => {
  return jwt.sign(
    { userId, username },
    process.env.JWT_SECRET || 'fallback-secret-key',
    { 
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      issuer: 'calculator-api',
      audience: 'calculator-users'
    }
  );
};

// Funkcja do weryfikacji tokenu bez middleware
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
  } catch (error) {
    return null;
  }
};

module.exports = {
  authenticateToken,
  optionalAuth,
  generateToken,
  verifyToken
};