const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoURI = process.env.DOCDBCONNST
    
    const conn = await mongoose.connect(mongoURI, {
      
      maxPoolSize: 10, 
      serverSelectionTimeoutMS: 5000, 
      socketTimeoutMS: 45000 
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
    });

    
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed through app termination');
        process.exit(0);
      } catch (error) {
        console.error('Error during MongoDB disconnect:', error);
        process.exit(1);
      }
    });

  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    
    
    console.log('Retrying MongoDB connection in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};

module.exports = connectDB;