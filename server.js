require('dotenv').config();

// Database connection
const connectDB = require('./config/database');
const app = require('./app');

const PORT = process.env.PORT || 3000;

// Connect to MongoDB tylko jeśli nie jesteśmy w trybie testowym
if (process.env.NODE_ENV !== 'test') {
  connectDB();
}

app.listen(PORT, () => {
  console.log(`🚀 Calculator REST API server running on port ${PORT}`);
  console.log(`📖 API documentation available at http://localhost:${PORT}`);
});

module.exports = app;