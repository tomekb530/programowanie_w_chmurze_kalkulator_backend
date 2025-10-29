const express = require('express');
const { body, validationResult } = require('express-validator');
const calculatorController = require('../controllers/calculatorController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Walidacja dla operacji z dwoma liczbami
const twoNumbersValidation = [
  body('a').isNumeric().withMessage('Parameter "a" must be a number'),
  body('b').isNumeric().withMessage('Parameter "b" must be a number')
];

// Walidacja dla operacji z jedną liczbą
const oneNumberValidation = [
  body('a').isNumeric().withMessage('Parameter "a" must be a number')
];

// Middleware do sprawdzania błędów walidacji
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

/**
 * @route POST /api/calculator/add
 * @desc Dodawanie dwóch liczb
 * @body { a: number, b: number }
 * @access Public (opcjonalna autoryzacja dla historii)
 */
router.post('/add', optionalAuth, twoNumbersValidation, handleValidationErrors, calculatorController.add);

/**
 * @route POST /api/calculator/subtract
 * @desc Odejmowanie dwóch liczb
 * @body { a: number, b: number }
 * @access Public (opcjonalna autoryzacja dla historii)
 */
router.post('/subtract', optionalAuth, twoNumbersValidation, handleValidationErrors, calculatorController.subtract);

/**
 * @route POST /api/calculator/multiply
 * @desc Mnożenie dwóch liczb
 * @body { a: number, b: number }
 * @access Public (opcjonalna autoryzacja dla historii)
 */
router.post('/multiply', optionalAuth, twoNumbersValidation, handleValidationErrors, calculatorController.multiply);

/**
 * @route POST /api/calculator/divide
 * @desc Dzielenie dwóch liczb
 * @body { a: number, b: number }
 * @access Public (opcjonalna autoryzacja dla historii)
 */
router.post('/divide', optionalAuth, twoNumbersValidation, handleValidationErrors, calculatorController.divide);

/**
 * @route POST /api/calculator/power
 * @desc Potęgowanie (a do potęgi b)
 * @body { a: number, b: number }
 * @access Public (opcjonalna autoryzacja dla historii)
 */
router.post('/power', optionalAuth, twoNumbersValidation, handleValidationErrors, calculatorController.power);

/**
 * @route POST /api/calculator/sqrt
 * @desc Pierwiastek kwadratowy
 * @body { a: number }
 * @access Public (opcjonalna autoryzacja dla historii)
 */
router.post('/sqrt', optionalAuth, oneNumberValidation, handleValidationErrors, calculatorController.sqrt);

/**
 * @route GET /api/calculator/history
 * @desc Pobieranie historii obliczeń użytkownika
 * @access Private
 */
router.get('/history', authenticateToken, calculatorController.getHistory);

/**
 * @route DELETE /api/calculator/history
 * @desc Czyszczenie historii obliczeń użytkownika
 * @access Private
 */
router.delete('/history', authenticateToken, calculatorController.clearHistory);

/**
 * @route GET /api/calculator/stats
 * @desc Pobieranie statystyk obliczeń użytkownika
 * @access Private
 */
router.get('/stats', authenticateToken, calculatorController.getStats);

module.exports = router;