# Item Details CSV Upload Guide

## Overview
This guide explains how to use the bulk CSV upload feature for Item Details in the NanoCart admin panel.

## CSV Template Structure

### Required Fields
- `itemName` - Name of the item (must exist in database)
- `imagesByColor` - Complex field defining colors, sizes, and image IDs
- `isSize` - Boolean indicating if item has sizes
- `isMultipleColor` - Boolean indicating if item has multiple colors

### Optional Fields
- `sizeChart` - Size chart information
- `howToMeasure` - Measurement instructions
- `deliveryDescription` - Delivery information
- `About` - Item description
- `PPQ` - Price per quantity information
- `deliveryPincode` - Delivery pincodes
- `returnPolicy` - Return policy
- `metaTitle` - SEO title
- `metaDescription` - SEO description
- `searchKeywords` - SEO keywords

## Field Format Details

### 1. itemName
```
"Classic Cotton T-Shirt"
```
- Must match exactly with an existing item in the database
- Case-sensitive

### 2. imagesByColor (Complex Field)
```
"color:White|hexCode:#FFFFFF|sizes:size:XS,stock:20,skuId:SKU_WHITE_XS_001,isOutOfStock:false|itemDetailImageIds:classic_cotton_tshirt_001,classic_cotton_tshirt_002|priority:1,2|isTbyb:true,false"
```

**Structure:**
- `color:ColorName` - Color name (e.g., White, Blue, Red)
- `hexCode:#HEXCODE` - Hex color code (e.g., #FFFFFF, #0066CC)
- `sizes:size:SIZE,stock:STOCK,skuId:SKU_ID,isOutOfStock:BOOLEAN` - Size information
- `itemDetailImageIds:ID1,ID2,ID3` - Comma-separated image IDs
- `priority:1,2,3` - Comma-separated priority numbers
- `isTbyb:true,false,false` - Comma-separated TBYB flags

### 3. sizeChart
```
"Size:XS,chest:34,length:26"
```
- Format: `Size:SIZE,measurement1:value1,measurement2:value2`
- Multiple measurements separated by commas

### 4. howToMeasure
```
"Chest:Measure around the fullest part of your chest,Length:Measure from shoulder to desired length"
```
- Format: `Measurement:Instructions,Measurement:Instructions`
- Multiple measurements separated by commas

### 5. PPQ (Price Per Quantity)
```
"minQty:1|maxQty:20|pricePerUnit:999"
```
- Format: `minQty:MIN|maxQty:MAX|pricePerUnit:PRICE`
- Use `|` as separator

### 6. deliveryPincode
```
"400001|400002|400003|400004|400005"
```
- Format: `PINCODE1|PINCODE2|PINCODE3`
- Use `|` as separator

### 7. searchKeywords
```
"t-shirt size chart,cotton shirt measurements,men clothing sizes,shirt details"
```
- Format: `keyword1,keyword2,keyword3`
- Comma-separated keywords

## Image Upload Process

### Step 1: Upload CSV
1. Use the CSV template provided
2. Upload via admin panel bulk upload feature
3. System will create ItemDetail records with image placeholders

### Step 2: Upload Images
1. Name your image files exactly as specified in `itemDetailImageIds`
2. Example: If CSV has `classic_cotton_tshirt_001`, name your image `classic_cotton_tshirt_001.jpg`
3. Upload images via bulk image upload feature
4. System will automatically match filenames to `itemDetailImageIds`

## Example CSV Row

```csv
"Classic Cotton T-Shirt","color:White|hexCode:#FFFFFF|sizes:size:XS,stock:20,skuId:SKU_WHITE_XS_001,isOutOfStock:false|itemDetailImageIds:classic_cotton_tshirt_001,classic_cotton_tshirt_002|priority:1,2|isTbyb:true,false","Size:XS,chest:34,length:26","Chest:Measure around the fullest part of your chest,Length:Measure from shoulder to desired length",true,true,"Delivered in 2-4 days","Premium cotton t-shirt made from 100% organic cotton for ultimate comfort and style","minQty:1|maxQty:20|pricePerUnit:999","400001|400002|400003|400004|400005","30-day return policy with free exchange","Classic Cotton T-Shirt Details - Size Chart & Measurements","Complete size chart and measurement guide for the premium cotton t-shirt with delivery and return information","t-shirt size chart,cotton shirt measurements,men clothing sizes,shirt details"
```

## Image ID Mapping

Based on the CSV template, here are the image IDs you need to create:

1. **classic_cotton_tshirt_001** - Classic Cotton T-Shirt (White, Priority 1, TBYB)
2. **classic_cotton_tshirt_002** - Classic Cotton T-Shirt (White, Priority 2)
3. **formal_business_shirt_001** - Formal Business Shirt (Blue, Priority 1, TBYB)
4. **formal_business_shirt_002** - Formal Business Shirt (Blue, Priority 2)
5. **slim_fit_jeans_001** - Slim Fit Jeans (Blue, Priority 1, TBYB)
6. **slim_fit_jeans_002** - Slim Fit Jeans (Blue, Priority 2)
7. **elegant_evening_dress_001** - Elegant Evening Dress (Black, Priority 1, TBYB)
8. **elegant_evening_dress_002** - Elegant Evening Dress (Black, Priority 2)
9. **casual_summer_top_001** - Casual Summer Top (Pink, Priority 1, TBYB)
10. **casual_summer_top_002** - Casual Summer Top (Pink, Priority 2)

## Troubleshooting

### Common Issues

1. **"Item not found" Error**
   - Ensure item names in CSV exactly match existing items in database
   - Check for typos and case sensitivity

2. **"Invalid imagesByColor format" Error**
   - Ensure proper use of `|` and `:` separators
   - Check that all required fields are present

3. **"Missing itemDetailImageIds" Error**
   - Ensure `itemDetailImageIds` field is present in imagesByColor
   - Check that image IDs are comma-separated

4. **Image Upload Issues**
   - Ensure image filenames exactly match `itemDetailImageIds`
   - Check file extensions (.jpg, .png, .webp)
   - Verify file sizes are under 5MB

### Validation Checklist

- [ ] Item names exist in database
- [ ] CSV format follows template exactly
- [ ] All required fields are present
- [ ] Boolean fields use `true`/`false`
- [ ] Numeric fields contain valid numbers
- [ ] Image IDs are unique and descriptive
- [ ] Image files are named correctly
- [ ] File sizes are under limits

## API Endpoints

- **CSV Upload**: `POST /api/item-details/bulk-upload`
- **Image Upload**: `POST /api/item-details/bulk-upload-images`

## File Locations

- **CSV Template**: `docs/item_details_csv_template.csv`
- **Test Script**: `test_item_details_csv.js`
- **Documentation**: `docs/ITEM_DETAILS_CSV_UPLOAD_GUIDE.md`
