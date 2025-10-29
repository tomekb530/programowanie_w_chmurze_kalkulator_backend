const Calculation = require('../models/Calculation');

/**
 * Pomocnicza funkcja do zapisywania operacji w historii
 */
const saveToHistory = async (userId, operation, operands, result, metadata = {}) => {
  try {
    const calculation = new Calculation({
      userId,
      operation,
      operands,
      result,
      metadata
    });
    
    await calculation.save();
    return calculation;
  } catch (error) {
    console.error('Error saving calculation to history:', error);
    throw error;
  }
};

/**
 * Dodawanie dwóch liczb
 */
const add = async (req, res) => {
  try {
    const { a, b } = req.body;
    const numA = parseFloat(a);
    const numB = parseFloat(b);
    
    const result = numA + numB;
    
    // Metadane żądania
    const metadata = {
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip || req.connection.remoteAddress
    };
    
    let calculation = null;
    if (req.user?.userId) {
      calculation = await saveToHistory(
        req.user.userId, 
        'addition', 
        { a: numA, b: numB }, 
        result, 
        metadata
      );
    }
    
    res.json({
      success: true,
      operation: 'addition',
      operands: { a: numA, b: numB },
      result,
      calculation_id: calculation?._id,
      saved_to_history: !!req.user
    });
  } catch (error) {
    console.error('Addition error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * Odejmowanie dwóch liczb
 */
const subtract = async (req, res) => {
  try {
    const { a, b } = req.body;
    const numA = parseFloat(a);
    const numB = parseFloat(b);
    
    const result = numA - numB;
    
    const metadata = {
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip || req.connection.remoteAddress
    };
    
    let calculation = null;
    if (req.user?.userId) {
      calculation = await saveToHistory(
        req.user.userId, 
        'subtraction', 
        { a: numA, b: numB }, 
        result, 
        metadata
      );
    }
    
    res.json({
      success: true,
      operation: 'subtraction',
      operands: { a: numA, b: numB },
      result,
      calculation_id: calculation?._id,
      saved_to_history: !!req.user
    });
  } catch (error) {
    console.error('Subtraction error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * Mnożenie dwóch liczb
 */
const multiply = async (req, res) => {
  try {
    const { a, b } = req.body;
    const numA = parseFloat(a);
    const numB = parseFloat(b);
    
    const result = numA * numB;
    
    const metadata = {
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip || req.connection.remoteAddress
    };
    
    let calculation = null;
    if (req.user?.userId) {
      calculation = await saveToHistory(
        req.user.userId, 
        'multiplication', 
        { a: numA, b: numB }, 
        result, 
        metadata
      );
    }
    
    res.json({
      success: true,
      operation: 'multiplication',
      operands: { a: numA, b: numB },
      result,
      calculation_id: calculation?._id,
      saved_to_history: !!req.user
    });
  } catch (error) {
    console.error('Multiplication error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * Dzielenie dwóch liczb
 */
const divide = async (req, res) => {
  try {
    const { a, b } = req.body;
    const numA = parseFloat(a);
    const numB = parseFloat(b);
    
    // Sprawdź dzielenie przez zero
    if (numB === 0) {
      return res.status(400).json({
        success: false,
        error: 'Division by zero',
        message: 'Cannot divide by zero'
      });
    }
    
    const result = numA / numB;
    
    const metadata = {
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip || req.connection.remoteAddress
    };
    
    let calculation = null;
    if (req.user?.userId) {
      calculation = await saveToHistory(
        req.user.userId, 
        'division', 
        { a: numA, b: numB }, 
        result, 
        metadata
      );
    }
    
    res.json({
      success: true,
      operation: 'division',
      operands: { a: numA, b: numB },
      result,
      calculation_id: calculation?._id,
      saved_to_history: !!req.user
    });
  } catch (error) {
    console.error('Division error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * Potęgowanie
 */
const power = async (req, res) => {
  try {
    const { a, b } = req.body;
    const numA = parseFloat(a);
    const numB = parseFloat(b);
    
    const result = Math.pow(numA, numB);
    
    // Sprawdź czy wynik jest skończony
    if (!isFinite(result)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid result',
        message: 'The result is not a finite number'
      });
    }
    
    const metadata = {
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip || req.connection.remoteAddress
    };
    
    let calculation = null;
    if (req.user?.userId) {
      calculation = await saveToHistory(
        req.user.userId, 
        'exponentiation', 
        { a: numA, b: numB }, 
        result, 
        metadata
      );
    }
    
    res.json({
      success: true,
      operation: 'exponentiation',
      operands: { a: numA, b: numB },
      result,
      calculation_id: calculation?._id,
      saved_to_history: !!req.user
    });
  } catch (error) {
    console.error('Power error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * Pierwiastek kwadratowy
 */
const sqrt = async (req, res) => {
  try {
    const { a } = req.body;
    const numA = parseFloat(a);
    
    // Sprawdź czy liczba jest nieujemna
    if (numA < 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid operand',
        message: 'Cannot calculate square root of a negative number'
      });
    }
    
    const result = Math.sqrt(numA);
    
    const metadata = {
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip || req.connection.remoteAddress
    };
    
    let calculation = null;
    if (req.user?.userId) {
      calculation = await saveToHistory(
        req.user.userId, 
        'square_root', 
        { a: numA }, 
        result, 
        metadata
      );
    }
    
    res.json({
      success: true,
      operation: 'square_root',
      operands: { a: numA },
      result,
      calculation_id: calculation?._id,
      saved_to_history: !!req.user
    });
  } catch (error) {
    console.error('Square root error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * Pobieranie historii obliczeń użytkownika
 */
const getHistory = async (req, res) => {
  try {
    // Sprawdź czy użytkownik jest zalogowany
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'You must be logged in to view calculation history'
      });
    }

    const { 
      limit = 20, 
      offset = 0, 
      operation = null,
      startDate = null,
      endDate = null 
    } = req.query;
    
    const options = {
      limit: Math.min(parseInt(limit) || 20, 100),
      offset: parseInt(offset) || 0,
      operation,
      startDate,
      endDate
    };
    
    const historyData = await Calculation.getUserHistory(req.user.userId, options);
    
    res.json({
      success: true,
      data: historyData.calculations,
      pagination: historyData.pagination,
      filters: {
        operation,
        startDate,
        endDate
      }
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * Czyszczenie historii obliczeń użytkownika
 */
const clearHistory = async (req, res) => {
  try {
    // Sprawdź czy użytkownik jest zalogowany
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'You must be logged in to clear calculation history'
      });
    }
    
    const deleteResult = await Calculation.deleteMany({ userId: req.user.userId });
    
    res.json({
      success: true,
      message: 'Calculation history cleared successfully',
      deletedCount: deleteResult.deletedCount
    });
  } catch (error) {
    console.error('Clear history error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * Pobieranie statystyk obliczeń użytkownika
 */
const getStats = async (req, res) => {
  try {
    // Sprawdź czy użytkownik jest zalogowany
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'You must be logged in to view calculation statistics'
      });
    }
    
    const stats = await Calculation.getUserStats(req.user.userId);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};

module.exports = {
  add,
  subtract,
  multiply,
  divide,
  power,
  sqrt,
  getHistory,
  clearHistory,
  getStats
};