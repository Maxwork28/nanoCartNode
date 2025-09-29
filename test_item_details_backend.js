const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Import the parsing function from the controller
const { parseItemDetailsCSV, resolveItemNames } = require('./controllers/itemDetailsController/itemDetails');

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect('mongodb://localhost:27017/nanocart', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
}

// Test the CSV parsing function
async function testCSVParsing() {
  console.log('🧪 Testing Item Details CSV Parsing...\n');
  
  try {
    // Read the CSV template
    const csvPath = path.join(__dirname, 'docs', 'item_details_csv_template.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    
    console.log('📄 CSV Content Length:', csvContent.length, 'characters');
    
    // Test the parsing function
    console.log('🔍 Testing parseItemDetailsCSV function...');
    const parsedData = await parseItemDetailsCSV(csvContent);
    
    console.log('✅ CSV parsing successful!');
    console.log('📊 Parsed items count:', parsedData.length);
    
    // Show first parsed item
    if (parsedData.length > 0) {
      console.log('\n📋 First parsed item:');
      console.log(JSON.stringify(parsedData[0], null, 2));
    }
    
    return parsedData;
    
  } catch (error) {
    console.error('❌ CSV parsing error:', error.message);
    throw error;
  }
}

// Test item name resolution
async function testItemNameResolution(parsedData) {
  console.log('\n🔍 Testing Item Name Resolution...\n');
  
  try {
    // First, let's check what items exist in the database
    const Item = require('./models/Items/Item');
    const existingItems = await Item.find({}).limit(5);
    
    console.log('📋 Existing items in database:');
    existingItems.forEach(item => {
      console.log(`  - ${item.name} (ID: ${item._id})`);
    });
    
    if (existingItems.length === 0) {
      console.log('⚠️ No items found in database. Please seed the database first.');
      return null;
    }
    
    // Test resolution with existing items
    console.log('\n🔍 Testing item name resolution...');
    const resolvedData = await resolveItemNames(parsedData);
    
    console.log('✅ Item name resolution successful!');
    console.log('📊 Resolved items count:', resolvedData.length);
    
    // Show first resolved item
    if (resolvedData.length > 0) {
      console.log('\n📋 First resolved item:');
      console.log(JSON.stringify(resolvedData[0], null, 2));
    }
    
    return resolvedData;
    
  } catch (error) {
    console.error('❌ Item name resolution error:', error.message);
    throw error;
  }
}

// Test database insertion
async function testDatabaseInsertion(resolvedData) {
  console.log('\n🔍 Testing Database Insertion...\n');
  
  try {
    const ItemDetail = require('./models/Items/ItemDetail');
    
    // Check if ItemDetails already exist for these items
    const itemIds = resolvedData.map(item => item.itemId);
    const existingDetails = await ItemDetail.find({ itemId: { $in: itemIds } });
    
    if (existingDetails.length > 0) {
      console.log('⚠️ ItemDetails already exist for some items:');
      existingDetails.forEach(detail => {
        console.log(`  - Item ID: ${detail.itemId}`);
      });
      console.log('Skipping insertion to avoid duplicates.');
      return;
    }
    
    // Insert the data
    console.log('💾 Inserting ItemDetails into database...');
    const inserted = await ItemDetail.insertMany(resolvedData);
    
    console.log('✅ Database insertion successful!');
    console.log('📊 Inserted ItemDetails count:', inserted.length);
    
    // Show first inserted item
    if (inserted.length > 0) {
      console.log('\n📋 First inserted ItemDetail:');
      console.log(JSON.stringify(inserted[0], null, 2));
    }
    
    return inserted;
    
  } catch (error) {
    console.error('❌ Database insertion error:', error.message);
    throw error;
  }
}

// Main test function
async function runTests() {
  try {
    await connectDB();
    
    console.log('🚀 Starting Item Details CSV Upload Tests...\n');
    
    // Test 1: CSV Parsing
    const parsedData = await testCSVParsing();
    
    // Test 2: Item Name Resolution
    const resolvedData = await testItemNameResolution(parsedData);
    
    if (resolvedData) {
      // Test 3: Database Insertion
      await testDatabaseInsertion(resolvedData);
    }
    
    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the tests
runTests();
