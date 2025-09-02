const fs = require('fs');
const path = require('path');

// Test CSV content using category and subcategory names
const testCSV = `name,description,MRP,totalStock,discountedPrice,defaultColor,isItemDetail,categoryName,subCategoryName,itemImageId,filters,userAverageRating
Test Smartphone,Test smartphone description,25000,50,22500,Black,true,Electronics,Smartphones,test_phone_001,Brand:TestBrand|Type:Smartphone,4.0
Test Laptop,Test laptop description,40000,25,36000,Silver,true,Electronics,Laptops,test_laptop_001,Brand:TestBrand|Type:Laptop,4.2
Test Shoes,Test running shoes,5000,100,4000,White,true,Clothing,Running Shoes,test_shoes_001,Brand:TestBrand|Type:Running,4.1`;

// Create test CSV file
const csvPath = path.join(__dirname, 'test_name_based_upload.csv');
fs.writeFileSync(csvPath, testCSV);

console.log('✅ Name-based CSV test file created successfully!');
console.log('📁 File location:', csvPath);
console.log('📊 File content:');
console.log('='.repeat(60));
console.log(testCSV);
console.log('='.repeat(60));

console.log('\n🚀 To test the name-based CSV upload:');
console.log('1. Use the file: test_name_based_upload.csv');
console.log('2. Upload via: POST /api/items/bulk-upload');
console.log('3. Ensure these categories exist in your database:');
console.log('   - Electronics (with subcategories: Smartphones, Laptops)');
console.log('   - Clothing (with subcategory: Running Shoes)');
console.log('4. The system will automatically resolve names to IDs!');

console.log('\n💡 Benefits of name-based approach:');
console.log('   ✅ No need to remember ObjectIds');
console.log('   ✅ More intuitive and user-friendly');
console.log('   ✅ Easier to maintain and update');
console.log('   ✅ Automatic validation of category relationships');

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
