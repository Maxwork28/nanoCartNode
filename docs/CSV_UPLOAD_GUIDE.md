# CSV Bulk Upload Guide for Items

## Overview
The bulk upload system now supports both JSON and CSV formats for creating multiple items at once. This guide explains how to prepare and upload CSV files.

## Supported File Formats
- **CSV (.csv)** - Comma-separated values (recommended for non-technical users)
- **JSON (.json)** - JavaScript Object Notation (for developers)

## CSV Template Structure

### Required Fields
| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `name` | String | ✅ Yes | Product name | "Smartphone X" |
| `MRP` | Number | ✅ Yes | Maximum Retail Price | 50000 |
| `totalStock` | Number | ✅ Yes | Available stock quantity | 100 |
| `categoryName` | String | ✅ Yes | Category name from database | "Electronics" |
| `subCategoryName` | String | ✅ Yes | Subcategory name from database | "Smartphones" |
| `itemImageId` | String | ✅ Yes | Unique identifier for image matching | "img001" |

### Optional Fields
| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `description` | String | ❌ No | Product description | "High-end smartphone" |
| `discountedPrice` | Number | ❌ No | Sale price (must ≤ MRP) | 45000 |
| `defaultColor` | String | ❌ No | Default product color | "Black" |
| `isItemDetail` | Boolean | ❌ No | Has detailed specifications | true |
| `filters` | String | ❌ No | Product filters (see format below) | "Brand:TechBrand\|Type:Smartphone" |
| `userAverageRating` | Number | ❌ No | Average user rating (0-5) | 4.5 |

## CSV Format Rules

### 1. Header Row
- First row must contain column names
- Column names are case-sensitive
- Use exact field names from the template

### 2. Data Rows
- One product per row
- Values separated by commas
- No empty rows between data

### 3. Special Formatting

#### Filters Field
Filters use a special format: `Key:Value|Key:Value`

**Examples:**
- Single filter: `"Brand:TechBrand"`
- Multiple filters: `"Brand:TechBrand|Type:Smartphone|Color:Black"`

#### Boolean Fields
- `true`, `1`, `yes` → true
- `false`, `0`, `no` → false
- Empty or `null` → undefined

#### Numeric Fields
- Must be valid numbers
- No currency symbols
- No commas in numbers

## Sample CSV Content

```csv
name,description,MRP,totalStock,discountedPrice,defaultColor,isItemDetail,categoryName,subCategoryName,itemImageId,filters,userAverageRating
Smartphone X,High-end smartphone with latest features,50000,100,45000,Black,true,Electronics,Smartphones,img001,Brand:TechBrand|Type:Smartphone,4.5
Gaming Laptop Pro,High-performance gaming laptop,80000,50,72000,Black,true,Electronics,Laptops,img002,Brand:GamingBrand|Type:Laptop,4.8
Cotton T-Shirt,Comfortable everyday t-shirt,1000,200,800,Blue,true,Clothing,T-Shirts,img003,Material:Cotton|Style:Casual,4.0
```

## Upload Process

### 1. Prepare Your CSV File
- Use the template provided
- Ensure all required fields are filled
- Validate category and subcategory names exist in your database
- Save as `.csv` format

### 2. Upload via API
```bash
POST /api/items/bulk-upload
Content-Type: multipart/form-data
Authorization: Bearer <admin_token>

Form Data:
- file: your_items.csv
```

### 3. Upload Images (Optional)
After uploading items, you can upload corresponding images:
```bash
POST /api/items/bulk-upload-images
Content-Type: multipart/form-data
Authorization: Bearer <admin_token>

Form Data:
- images: img001.jpg, img002.jpg, img003.jpg
```

**Note:** Image filenames must match the `itemImageId` values from your CSV.

## Validation Rules

### Business Logic
- `discountedPrice` cannot exceed `MRP`
- `totalStock` must be ≥ 0
- `userAverageRating` must be between 0-5
- `categoryName` and `subCategoryName` must exist and be related

### Data Types
- `MRP`, `totalStock`, `discountedPrice`, `userAverageRating` → Numbers
- `categoryName`, `subCategoryName` → Valid category/subcategory names from database
- `isItemDetail` → Boolean
- `filters` → String (parsed to array of objects)

## Error Handling

### Common Errors
1. **Missing Required Fields** - Check all required columns are present
2. **Invalid Category Names** - Verify category and subcategory names exist in database
3. **Invalid Numbers** - Ensure numeric fields contain valid numbers
4. **Filter Format Error** - Use correct `Key:Value|Key:Value` format
5. **File Format** - Ensure file is saved as `.csv`

### Error Response Format
```json
{
  "statusCode": 400,
  "success": false,
  "message": "Detailed error message"
}
```

## Best Practices

### 1. Data Preparation
- Use consistent naming conventions
- Validate data before upload
- Ensure category and subcategory names match your database exactly
- Test with small datasets first

### 2. File Management
- Use descriptive filenames
- Include date in filename for version control
- Keep backup of original data
- Validate CSV format in Excel/Google Sheets

### 3. Testing
- Start with 5-10 items
- Verify all fields are correctly parsed
- Check image uploads work
- Validate database entries

## Troubleshooting

### CSV Not Parsing
- Check file encoding (use UTF-8)
- Ensure no special characters in headers
- Verify comma separation
- Check for empty rows

### Validation Errors
- Verify category and subcategory names exist in database
- Check numeric field formats
- Ensure required fields are not empty
- Validate filter format

### Upload Failures
- Check file size (max 10MB)
- Verify admin permissions
- Ensure proper authentication
- Check server logs for detailed errors

## Support

For technical support or questions about CSV upload:
1. Check this documentation
2. Review error messages carefully
3. Validate your CSV format
4. Contact development team with specific error details
