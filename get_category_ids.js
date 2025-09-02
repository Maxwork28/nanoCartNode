const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Category = require('./models/Category/Category');
const SubCategory = require('./models/SubCategory/SubCategory');

async function getCategoryIds() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/nanoCart', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Get all categories
    console.log('\n📂 CATEGORIES:');
    console.log('='.repeat(60));
    const categories = await Category.find().select('_id name description');
    categories.forEach(cat => {
      console.log(`ID: ${cat._id} | Name: ${cat.name} | Description: ${cat.description || 'N/A'}`);
    });

    // Get all subcategories with their parent category
    console.log('\n📁 SUB-CATEGORIES:');
    console.log('='.repeat(60));
    const subCategories = await SubCategory.find()
      .populate('categoryId', 'name')
      .select('_id name description categoryId');
    
    subCategories.forEach(subCat => {
      console.log(`ID: ${subCat._id} | Name: ${subCat.name} | Parent: ${subCat.categoryId?.name || 'N/A'} | Description: ${subCat.description || 'N/A'}`);
    });

    // Generate CSV template with names (recommended approach)
    console.log('\n📝 CSV TEMPLATE WITH NAMES (RECOMMENDED):');
    console.log('='.repeat(60));
    console.log('name,description,MRP,totalStock,discountedPrice,defaultColor,isItemDetail,categoryName,subCategoryName,itemImageId,filters,userAverageRating');
    
    // Generate sample rows for each subcategory using names
    subCategories.forEach((subCat, index) => {
      const sampleNames = [
        'Sample Product 1',
        'Sample Product 2', 
        'Sample Product 3'
      ];
      
      sampleNames.forEach((name, nameIndex) => {
        const itemImageId = `sample_${subCat._id.toString().slice(-6)}_${nameIndex + 1}`;
        const filters = `Category:${subCat.categoryId?.name || 'Unknown'}|Type:${subCat.name}`;
        
        console.log(`${name},Sample description for ${subCat.name},9999,100,7999,Black,true,${subCat.categoryId?.name || 'Unknown'},${subCat.name},${itemImageId},${filters},4.5`);
      });
    });

    // Also show ID-based template for backward compatibility
    console.log('\n📝 CSV TEMPLATE WITH IDs (BACKWARD COMPATIBLE):');
    console.log('='.repeat(60));
    console.log('name,description,MRP,totalStock,discountedPrice,defaultColor,isItemDetail,categoryId,subCategoryId,itemImageId,filters,userAverageRating');
    
    subCategories.forEach((subCat, index) => {
      const sampleNames = [
        'Sample Product 1',
        'Sample Product 2', 
        'Sample Product 3'
      ];
      
      sampleNames.forEach((name, nameIndex) => {
        const itemImageId = `sample_${subCat._id.toString().slice(-6)}_${nameIndex + 1}`;
        const filters = `Category:${subCat.categoryId?.name || 'Unknown'}|Type:${subCat.name}`;
        
        console.log(`${name},Sample description for ${subCat.name},9999,100,7999,Black,true,${subCat.categoryId?._id || 'INVALID'},${subCat._id},${itemImageId},${filters},4.5`);
      });
    });

    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Use the name-based CSV template above (recommended)');
    console.log('2. Or use the ID-based template for backward compatibility');
    console.log('3. Test the bulk upload functionality');
    console.log('4. Check the README_DEMO_CSV.md for detailed instructions');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
  }
}

// Run the function
getCategoryIds();
