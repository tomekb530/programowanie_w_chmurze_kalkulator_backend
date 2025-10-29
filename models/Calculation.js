const mongoose = require('mongoose');

const calculationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  operation: {
    type: String,
    required: true,
    enum: ['addition', 'subtraction', 'multiplication', 'division', 'exponentiation', 'square_root'],
    index: true
  },
  operands: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  result: {
    type: Number,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  // Opcjonalne metadane
  metadata: {
    userAgent: String,
    ipAddress: String,
    sessionId: String
  }
}, {
  timestamps: true
});

// Indeksy złożone dla optymalizacji zapytań
calculationSchema.index({ userId: 1, timestamp: -1 });
calculationSchema.index({ userId: 1, operation: 1, timestamp: -1 });

// Metoda statyczna do pobierania historii użytkownika
calculationSchema.statics.getUserHistory = async function(userId, options = {}) {
  const {
    limit = 20,
    offset = 0,
    operation = null,
    startDate = null,
    endDate = null
  } = options;

  const query = { userId };
  
  // Filtrowanie po operacji
  if (operation) {
    query.operation = operation;
  }
  
  // Filtrowanie po dacie
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }

  const total = await this.countDocuments(query);
  const calculations = await this.find(query)
    .sort({ timestamp: -1 })
    .limit(Math.min(limit, 100)) // Max 100 na stronę
    .skip(offset)
    .select('-__v');

  return {
    calculations,
    pagination: {
      total,
      limit: Math.min(limit, 100),
      offset,
      hasMore: offset + limit < total
    }
  };
};

// Metoda statyczna do pobierania statystyk użytkownika
calculationSchema.statics.getUserStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$operation',
        count: { $sum: 1 },
        lastUsed: { $max: '$timestamp' }
      }
    },
    { $sort: { count: -1 } }
  ]);

  const totalCalculations = await this.countDocuments({ userId });
  
  return {
    totalCalculations,
    operationStats: stats,
    firstCalculation: await this.findOne({ userId }).sort({ timestamp: 1 }).select('timestamp'),
    lastCalculation: await this.findOne({ userId }).sort({ timestamp: -1 }).select('timestamp')
  };
};

// Middleware do usuwania obliczeń gdy użytkownik zostanie usunięty
calculationSchema.statics.deleteUserCalculations = async function(userId) {
  return await this.deleteMany({ userId });
};

const Calculation = mongoose.model('Calculation', calculationSchema);

module.exports = Calculation;