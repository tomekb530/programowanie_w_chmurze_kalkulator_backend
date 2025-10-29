/**
 * Middleware do obsługi błędów
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Domyślna odpowiedź błędu
  let error = {
    success: false,
    error: 'Internal Server Error',
    message: 'Something went wrong on the server'
  };

  // Różne typy błędów
  if (err.name === 'ValidationError') {
    error.error = 'Validation Error';
    error.message = err.message;
    return res.status(400).json(error);
  }

  if (err.name === 'CastError') {
    error.error = 'Invalid Data Format';
    error.message = 'Invalid data format provided';
    return res.status(400).json(error);
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    error.error = 'File Too Large';
    error.message = 'File size exceeds the limit';
    return res.status(413).json(error);
  }

  // Błąd syntax JSON
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    error.error = 'Invalid JSON';
    error.message = 'Request body contains invalid JSON';
    return res.status(400).json(error);
  }

  // W środowisku development pokazuj więcej szczegółów
  if (process.env.NODE_ENV === 'development') {
    error.stack = err.stack;
    error.details = err;
  }

  res.status(err.status || 500).json(error);
};

module.exports = errorHandler;