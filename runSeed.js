const mongoose = require('mongoose');
require('dotenv').config();

async function runSeed() {
  try {
    console.log('Starting database seeding...');
    
    // Import and run the seed function
    const seedFunction = require('./seed');
    
    // The seed function will handle the database connection and seeding
    await seedFunction();
    
    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Error running seed:', error);
  } finally {
    // Ensure the connection is closed
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('Database connection closed.');
    }
    process.exit(0);
  }
}

runSeed();
