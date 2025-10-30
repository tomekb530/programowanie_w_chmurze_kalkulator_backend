/**
 * Middleware do obsługi błędów
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Domyślna odpowiedź błędu
  let error = {
    success: false,
    error: 'Błąd wewnętrzny serwera',
    message: 'Coś poszło nie tak na serwerze'
  };

  // Różne typy błędów
  if (err.name === 'ValidationError') {
    error.error = 'Błąd walidacji';
    error.message = err.message;
    return res.status(400).json(error);
  }

  if (err.name === 'CastError') {
    error.error = 'Nieprawidłowy format danych';
    error.message = 'Podano dane w nieprawidłowym formacie';
    return res.status(400).json(error);
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    error.error = 'Plik za duży';
    error.message = 'Rozmiar pliku przekracza limit';
    return res.status(413).json(error);
  }

  // Błąd syntax JSON
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    error.error = 'Nieprawidłowy JSON';
    error.message = 'Ciało żądania zawiera nieprawidłowy JSON';
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