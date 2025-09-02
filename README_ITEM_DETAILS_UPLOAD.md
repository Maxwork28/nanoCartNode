# Item Details Bulk Upload Guide

This guide explains how to bulk upload item details using either JSON or CSV files, followed by bulk image uploads.

## Overview

The system supports two file formats for bulk uploading item details:
- **JSON**: Flexible format for complex data structures
- **CSV**: Simple spreadsheet format for easier data entry

## Step 1: Bulk Upload Item Details

### JSON Format

Upload a JSON file containing an array of item detail objects. Each object should have the following structure:

```json
[
  {
    "itemId": "68b0bd1bfbd64afb9636ac3d",
    "MRP": 129999,
    "discountedPrice": 119999,
    "discountPercentage": 7.7,
    "totalStock": 50,
    "defaultColor": "Titanium",
    "deliveryDescription": "Fast delivery within 2-3 business days",
    "returnPolicy": "30 days return policy with original packaging",
    "howToMeasure": [
      {
        "title": "Screen Size",
        "description": "Measure diagonally from corner to corner",
        "unit": "inches"
      }
    ],
    "about": "Premium iPhone 15 Pro with titanium finish and advanced camera system",
    "sizeChart": [
      {
        "size": "6.1 inches",
        "width": "71.5 mm",
        "height": "147.7 mm",
        "depth": "8.25 mm"
      }
    ],
    "isOutOfStock": false,
    "isItemDetail": true,
    "deliveryPincode": [400001, 400002, 400003],
    "imagesByColor": [
      {
        "color": "Titanium",
        "hexCode": "#8B7355",
        "sizes": [
          {
            "size": "6.1 inches",
            "stock": 0,
            "isOutOfStock": false
          }
        ],
        "images": [
          {
            "itemDetailImageId": "iphone15pro_titanium_001",
            "priority": 1
          },
          {
            "itemDetailImageId": "iphone15pro_titanium_002",
            "priority": 2
          }
        ]
      }
    ]
  }
]
```

### CSV Format

Upload a CSV file with headers and data rows. The CSV format uses special separators for complex fields:

#### CSV Headers
```
itemName,MRP,discountedPrice,discountPercentage,totalStock,defaultColor,deliveryDescription,returnPolicy,howToMeasure,about,sizeChart,isOutOfStock,isItemDetail,deliveryPincode,imagesByColor
```

#### CSV Data Format

**Simple Fields:**
- `itemName`: Name of existing item in the system (will be automatically resolved to itemId)
- `MRP`: Maximum retail price (number)
- `discountedPrice`: Discounted price (number)
- `discountPercentage`: Discount percentage (number)
- `totalStock`: Total available stock (number)
- `defaultColor`: Primary color name (string)
- `deliveryDescription`: Delivery information (string)
- `returnPolicy`: Return policy details (string)
- `isOutOfStock`: Stock status (true/false)
- `isItemDetail`: Item detail flag (true/false)

**Complex Fields (use | separator):**

**deliveryPincode:**
```
400001|400002|400003
```

**howToMeasure, sizeChart, PPQ (JSON format):**
```
[{"title":"Screen Size","description":"Measure diagonally","unit":"inches"}]
```

**imagesByColor (special CSV format):**
```
color:Titanium|hexCode:#8B7355|sizes:6.1 inches|itemDetailImageIds:img001,img002,img003
```

Where:
- `color`: Color name
- `hexCode`: Hex color code (optional, defaults to #000000)
- `sizes`: Comma-separated size names
- `itemDetailImageIds`: Comma-separated image IDs that will be matched with uploaded images

#### Example CSV Row
```
Smartphone X,129999,119999,7.7,50,Titanium,"Fast delivery within 2-3 business days","30 days return policy",[{"title":"Screen Size","description":"Measure diagonally from corner to corner","unit":"inches"}],"Premium Smartphone X with titanium finish and advanced camera system",[{"size":"6.1 inches","width":"71.5 mm","height":"147.7 mm","depth":"8.25 mm"}],false,true,"400001|400002|400003","color:Titanium|hexCode:#8B7355|sizes:6.1 inches|itemDetailImageIds:smartphone_x_titanium_001,smartphone_x_titanium_002,smartphone_x_titanium_003"
```

## Step 2: Bulk Upload Images

After creating item details, upload images that will be automatically matched:

### Image Naming Convention

Images must be named to match the `itemDetailImageId` from your data:
- **Filename**: `iphone15pro_titanium_001.jpg`
- **Matches**: `itemDetailImageId: "iphone15pro_titanium_001"`

### Image Upload Process

1. Select the item detail from the dropdown
2. Choose multiple image files
3. System automatically:
   - Extracts image ID from filename
   - Finds matching `itemDetailImageId` in the item detail
   - Uploads to S3 with organized folder structure
   - Updates the item detail with image URLs

### S3 Folder Structure

Images are organized in S3 as:
```
Nanocart/items/[itemDetailId]/colors/[color]/[filename]
```

## Frontend Usage

### Bulk Upload Modal

1. Click "Bulk Upload" button
2. Choose JSON or CSV file
3. Upload and wait for confirmation
4. System creates ItemDetail records and updates item flags

### Bulk Images Modal

1. Click "Bulk Images" button
2. Select item detail from dropdown
3. Choose multiple image files
4. Upload and wait for automatic matching

## Validation Rules

- `itemId` must exist in the system
- `imagesByColor` must have at least one color entry
- Each color must have at least one image with `itemDetailImageId`
- JSON fields must be valid JSON format
- CSV complex fields must use proper separators

## Error Handling

- Invalid file format: Check if file is valid JSON or CSV
- Missing itemId: Ensure item exists in system
- Invalid JSON in CSV: Check JSON syntax in complex fields
- Image matching fails: Verify filename matches `itemDetailImageId`

## Demo Files

- **JSON**: `demo_item_details_upload.json` - Complete JSON example
- **CSV**: `demo_item_details_upload.csv` - Complete CSV example

## Tips

- Use CSV for simple data entry and bulk operations
- Use JSON for complex nested structures
- Ensure image filenames exactly match `itemDetailImageId` values
- Test with small datasets first
- Check console logs for detailed error messages
