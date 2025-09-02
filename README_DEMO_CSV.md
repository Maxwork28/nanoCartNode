# Demo CSV File for Bulk Upload Testing

## 📁 File: `demo_items_upload.csv`

This file contains **20 realistic items** across multiple categories that you can use to test the bulk upload functionality.

## 🎯 What's Included

### Electronics
- **Smartphones**
  - iPhone 15 Pro - ₹129,999
  - Samsung Galaxy S24 - ₹89,999

- **Laptops**
  - MacBook Air M2 - ₹114,999
  - Dell XPS 13 - ₹99,999

- **Audio**
  - Sony WH-1000XM5 - ₹29,999
  - Apple AirPods Pro - ₹24,999

- **Cameras**
  - Canon EOS R6 - ₹189,999
  - GoPro Hero 11 - ₹39,999

### Clothing & Fashion
- **Running Shoes**
  - Nike Air Max 270 - ₹12,999
  - Adidas Ultraboost 22 - ₹15,999

- **Jeans**
  - Levi's 501 Original Jeans - ₹3,999

- **Dresses**
  - Zara Summer Dress - ₹2,999

### Home & Appliances
- **Kitchen Appliances**
  - Bosch Dishwasher - ₹45,999

- **Cooking Appliances**
  - Philips Air Fryer - ₹8,999

### Sports & Fitness
- **Fitness Equipment**
  - Yoga Mat Premium - ₹1,999
  - Dumbbells Set - ₹15,999

## 🚀 How to Use

### 1. **Important Note - Category Names**
✅ **Great news! This CSV file now uses category and subcategory NAMES instead of IDs!**

The system automatically resolves category names to their corresponding database IDs, making it much easier to use.

**Required Category Names in Database:**
- Electronics
- Clothing  
- Home Appliances
- Sports & Fitness

**Required Subcategory Names in Database:**
- Smartphones, Laptops, Audio, Cameras (under Electronics)
- Running Shoes, Jeans, Dresses (under Clothing)
- Kitchen Appliances, Cooking Appliances (under Home Appliances)
- Fitness Equipment (under Sports & Fitness)

**To check your existing categories:**
```bash
# Check your existing categories
GET /api/category

# Check your existing subcategories  
GET /api/subcategory
```

### 2. **Upload the CSV File**
```bash
POST /api/items/bulk-upload
Content-Type: multipart/form-data
Authorization: Bearer <your_admin_token>

Form Data:
- file: demo_items_upload.csv
```

### 3. **Upload Corresponding Images** (Optional)
After successful item upload, upload images with matching filenames:
```bash
POST /api/items/bulk-upload-images
Content-Type: multipart/form-data
Authorization: Bearer <your_admin_token>

Form Data:
- images: iphone15pro_001.jpg, mbair_m2_001.jpg, galaxy_s24_001.jpg, etc.
```

## 📊 Data Structure Analysis

### Required Fields (All Present)
- ✅ `name` - Product names
- ✅ `MRP` - Maximum Retail Prices (₹1,999 - ₹189,999)
- ✅ `totalStock` - Stock quantities (20 - 300)
- ✅ `categoryName` - Category names (e.g., "Electronics", "Clothing")
- ✅ `subCategoryName` - Subcategory names (e.g., "Smartphones", "Running Shoes")
- ✅ `itemImageId` - Unique image identifiers

### Optional Fields (Varied Examples)
- ✅ `description` - Detailed product descriptions
- ✅ `discountedPrice` - Sale prices (10-25% off MRP)
- ✅ `defaultColor` - Product colors
- ✅ `isItemDetail` - All set to `true`
- ✅ `filters` - Complex filter combinations
- ✅ `userAverageRating` - Ratings from 4.3 to 4.9

### Filter Examples
- **Simple**: `"Brand:Apple"`
- **Complex**: `"Brand:Apple|Type:Smartphone|Storage:256GB"`
- **Mixed**: `"Brand:Nike|Type:Running|Style:Casual"`

## 🔧 Customization Options

### 1. **Modify Prices**
- Update MRP and discountedPrice columns
- Ensure discountedPrice ≤ MRP
- Use realistic market prices

### 2. **Adjust Stock Levels**
- Modify totalStock based on your inventory
- Consider seasonal demand variations
- Set realistic availability numbers

### 3. **Update Categories**
- Replace category and subcategory names with ones that exist in your database
- Ensure category-subcategory relationships are valid
- Add new categories if needed

### 4. **Customize Filters**
- Modify filter keys and values
- Add industry-specific attributes
- Ensure consistency across similar products

## 🧪 Testing Scenarios

### 1. **Basic Upload Test**
- Upload with all required fields
- Verify successful insertion
- Check database entries

### 2. **Validation Test**
- Try uploading with missing required fields
- Test with invalid category/subcategory names
- Verify error messages

### 3. **Business Logic Test**
- Test discountedPrice > MRP scenarios
- Verify stock validation
- Check rating range validation

### 4. **Filter Parsing Test**
- Test simple filter formats
- Test complex multi-filter formats
- Verify filter array creation

## 📝 Sample API Response

### Success Response
```json
{
  "statusCode": 201,
  "success": true,
  "message": "20 items uploaded successfully.",
  "data": {
    "items": [
      {
        "_id": "64a1b2c3d4e5f6789012345",
        "name": "iPhone 15 Pro",
        "MRP": 129999,
        "totalStock": 75,
        "discountedPrice": 119999,
        "categoryId": "64a1b2c3d4e5f6789012345",
        "subCategoryId": "64a1b2c3d4e5f6789012346",
        "itemImageId": "iphone15pro_001"
      }
      // ... more items
    ]
  }
}
```

### Error Response
```json
{
  "statusCode": 400,
  "success": false,
  "message": "Category 'Electronics' not found"
}
```

## 🚨 Common Issues & Solutions

### 1. **Category Name Validation Errors**
- **Problem**: Invalid category/subcategory names
- **Solution**: Ensure category and subcategory names exist in your database

### 2. **Filter Parsing Errors**
- **Problem**: Incorrect filter format
- **Solution**: Use `Key:Value|Key:Value` format

### 3. **Business Logic Errors**
- **Problem**: discountedPrice > MRP
- **Solution**: Ensure sale price ≤ retail price

### 4. **File Format Issues**
- **Problem**: CSV not parsing correctly
- **Solution**: Check encoding (UTF-8) and comma separation

## 📚 Additional Resources

- **CSV Upload Guide**: `docs/CSV_UPLOAD_GUIDE.md`
- **API Documentation**: Check your API docs
- **Test Script**: `test_name_based_upload.js`

## 🎉 Ready to Test!

This demo file provides a comprehensive test of the bulk upload system with realistic data across multiple product categories. The system automatically resolves category names to IDs, making it much easier to use!

Happy testing! 🚀
