const fs = require('fs');
const path = require('path');

// Test CSV content
const testCSV = `name,description,MRP,totalStock,discountedPrice,defaultColor,isItemDetail,categoryId,subCategoryId,itemImageId,filters,userAverageRating
Test Smartphone,Test smartphone description,25000,50,22500,Black,true,64a1b2c3d4e5f6789012345,64a1b2c3d4e5f6789012346,test_img001,Brand:TestBrand|Type:Smartphone,4.0
Test Laptop,Test laptop description,40000,25,36000,Silver,true,64a1b2c3d4e5f6789012345,64a1b2c3d4e5f6789012347,test_img002,Brand:TestBrand|Type:Laptop,4.2`;

// Create test CSV file
const csvPath = path.join(__dirname, 'test_items.csv');
fs.writeFileSync(csvPath, testCSV);

console.log('✅ Test CSV file created successfully!');
console.log('📁 File location:', csvPath);
console.log('📊 File content:');
console.log('='.repeat(50));
console.log(testCSV);
console.log('='.repeat(50));

console.log('\n🚀 To test the CSV upload:');
console.log('1. Use the file: test_items.csv');
console.log('2. Upload via: POST /api/items/bulk-upload');
console.log('3. Ensure categoryId and subCategoryId exist in your database');
console.log('4. Check the CSV_UPLOAD_GUIDE.md for detailed instructions');

// Clean up function
const cleanup = () => {
  if (fs.existsSync(csvPath)) {
    fs.unlinkSync(csvPath);
    console.log('\n🧹 Test file cleaned up');
  }
};

// Clean up on exit
process.on('exit', cleanup);
process.on('SIGINT', () => {
  cleanup();
  process.exit();
});
