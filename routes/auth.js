const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Rate limiting dla endpointów autoryzacji (wyłączony w testach)
const authLimiter = process.env.NODE_ENV === 'test' ? 
  (req, res, next) => next() : // Pomiń w testach
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minut
    max: 5, // maksymalnie 5 prób na IP w 15 minut
    message: {
      success: false,
      error: 'Too many authentication attempts',
      message: 'Too many login/register attempts from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
  });

const registerLimiter = process.env.NODE_ENV === 'test' ?
  (req, res, next) => next() : // Pomiń w testach
  rateLimit({
    windowMs: 60 * 60 * 1000, // 1 godzina
    max: 3, // maksymalnie 3 rejestracje na IP w godzinę
    message: {
      success: false,
      error: 'Too many registration attempts',
      message: 'Too many registration attempts from this IP, please try again later.'
    }
  });

// Walidacja rejestracji
const registerValidation = [
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers and underscores'),
  
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('firstName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('First name cannot be more than 50 characters'),
  
  body('lastName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Last name cannot be more than 50 characters')
];

// Walidacja logowania
const loginValidation = [
  body('login')
    .notEmpty()
    .withMessage('Username or email is required')
    .trim(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Walidacja aktualizacji profilu
const updateProfileValidation = [
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('firstName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('First name cannot be more than 50 characters'),
  
  body('lastName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Last name cannot be more than 50 characters')
];

// Walidacja zmiany hasła
const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
];

// Middleware do sprawdzania błędów walidacji
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

/**
 * @route POST /api/auth/register
 * @desc Rejestracja nowego użytkownika
 * @access Public
 */
router.post('/register', 
  registerLimiter, 
  registerValidation, 
  handleValidationErrors, 
  authController.register
);

/**
 * @route POST /api/auth/login
 * @desc Logowanie użytkownika
 * @access Public
 */
router.post('/login', 
  authLimiter, 
  loginValidation, 
  handleValidationErrors, 
  authController.login
);

/**
 * @route GET /api/auth/profile
 * @desc Pobieranie profilu użytkownika
 * @access Private
 */
router.get('/profile', 
  authenticateToken, 
  authController.getProfile
);

/**
 * @route PUT /api/auth/profile
 * @desc Aktualizacja profilu użytkownika
 * @access Private
 */
router.put('/profile', 
  authenticateToken, 
  updateProfileValidation, 
  handleValidationErrors, 
  authController.updateProfile
);

/**
 * @route PUT /api/auth/change-password
 * @desc Zmiana hasła użytkownika
 * @access Private
 */
router.put('/change-password', 
  authenticateToken, 
  authLimiter,
  changePasswordValidation, 
  handleValidationErrors, 
  authController.changePassword
);

module.exports = router;