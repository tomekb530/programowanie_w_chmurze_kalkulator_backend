const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();


const authLimiter = process.env.NODE_ENV === 'test' ? 
  (req, res, next) => next() : 
  rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 5, 
    message: {
      success: false,
      error: 'Zbyt wiele prób uwierzytelnienia',
      message: 'Zbyt wiele prób logowania/rejestracji z tego IP, spróbuj ponownie później.'
    },
    standardHeaders: true,
    legacyHeaders: false
  });

const registerLimiter = process.env.NODE_ENV === 'test' ?
  (req, res, next) => next() : 
  rateLimit({
    windowMs: 60 * 60 * 1000, 
    max: 10, 
    message: {
      success: false,
      error: 'Zbyt wiele prób rejestracji',
      message: 'Zbyt wiele prób rejestracji z tego IP, spróbuj ponownie później.'
    }
  });


const registerValidation = [
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Nazwa użytkownika musi mieć od 3 do 30 znaków')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Nazwa użytkownika może zawierać tylko litery, cyfry i podkreślenia'),
  
  body('email')
    .isEmail()
    .withMessage('Podaj prawidłowy adres email')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Hasło musi mieć co najmniej 6 znaków')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Hasło musi zawierać co najmniej jedną wielką literę, jedną małą literę i jedną cyfrę'),
  
  body('firstName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Imię nie może mieć więcej niż 50 znaków'),
  
  body('lastName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Nazwisko nie może mieć więcej niż 50 znaków')
];


const loginValidation = [
  body('login')
    .notEmpty()
    .withMessage('Nazwa użytkownika lub email jest wymagana')
    .trim(),
  
  body('password')
    .notEmpty()
    .withMessage('Hasło jest wymagane')
];


const updateProfileValidation = [
  body('email')
    .optional()
    .isEmail()
    .withMessage('Podaj prawidłowy adres email')
    .normalizeEmail(),
  
  body('firstName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Imię nie może mieć więcej niż 50 znaków'),
  
  body('lastName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Nazwisko nie może mieć więcej niż 50 znaków')
];


const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Aktualne hasło jest wymagane'),
  
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Nowe hasło musi mieć co najmniej 6 znaków')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Nowe hasło musi zawierać co najmniej jedną wielką literę, jedną małą literę i jedną cyfrę')
];


const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Błąd walidacji',
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