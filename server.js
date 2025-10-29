const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Database connection
const connectDB = require('./config/database');

// Routes
const calculatorRoutes = require('./routes/calculator');
const authRoutes = require('./routes/auth');

// Middleware
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();


app.use(helmet()); 
app.use(cors()); 
app.use(morgan('combined')); 
app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 


app.use('/api/auth', authRoutes);
app.use('/api/calculator', calculatorRoutes);


app.get('/', (req, res) => {
  res.json({
    message: 'Calculator REST API with Authentication',
    version: '2.0.0',
    features: ['MongoDB integration', 'User authentication', 'Personal calculation history'],
    auth_endpoints: {
      register: 'POST /api/auth/register',
      login: 'POST /api/auth/login',
      profile: 'GET /api/auth/profile',
      update_profile: 'PUT /api/auth/profile',
      change_password: 'PUT /api/auth/change-password'
    },
    calculator_endpoints: {
      add: 'POST /api/calculator/add',
      subtract: 'POST /api/calculator/subtract',
      multiply: 'POST /api/calculator/multiply',
      divide: 'POST /api/calculator/divide',
      power: 'POST /api/calculator/power',
      sqrt: 'POST /api/calculator/sqrt',
      history: 'GET /api/calculator/history (requires auth)',
      stats: 'GET /api/calculator/stats (requires auth)',
      clear_history: 'DELETE /api/calculator/history (requires auth)'
    },
    usage: {
      authentication: 'Include "Authorization: Bearer <token>" header for protected endpoints',
      calculation_history: 'History is automatically saved for authenticated users'
    }
  });
});


app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: 'The requested endpoint does not exist'
  });
});


app.use(errorHandler);


app.listen(PORT, () => {
  console.log(`Calculator REST API server running on port ${PORT}`);
});

module.exports = app;