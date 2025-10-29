const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Routes
const calculatorRoutes = require('./routes/calculator');
const authRoutes = require('./routes/auth');

// Middleware
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Middleware
app.use(helmet()); 
app.use(cors()); 
app.use(morgan('combined')); 
app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/calculator', calculatorRoutes);

// Główna ścieżka
app.get('/', (req, res) => {
  res.json({
    message: 'Calculator REST API',
    version: '1.0.0',
    endpoints: {
      register: 'POST /api/auth/register',
      login: 'POST /api/auth/login',
      profile: 'GET /api/auth/profile',
      add: 'POST /api/calculator/add',
      subtract: 'POST /api/calculator/subtract',
      multiply: 'POST /api/calculator/multiply',
      divide: 'POST /api/calculator/divide',
      power: 'POST /api/calculator/power',
      sqrt: 'POST /api/calculator/sqrt',
      history: 'GET /api/calculator/history',
      stats: 'GET /api/calculator/stats'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: 'The requested endpoint does not exist'
  });
});

// Error handler
app.use(errorHandler);

module.exports = app;