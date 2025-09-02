// Test script for CSV parsing of item details
const fs = require('fs');
const mongoose = require('mongoose');

// Mock the CSV parsing function (copy from the controller)
const parseItemDetailsCSV = async (csvContent) => {
  try {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV must have at least a header row and one data row');
    }

    const headers = lines[0].split(',').map(header => header.trim());
    const itemDetails = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Skip empty lines

      const values = line.split(',').map(value => value.trim());
      if (values.length !== headers.length) {
        throw new Error(`Row ${i + 1} has ${values.length} values but header has ${headers.length} columns`);
      }

      const itemDetail = {};
      headers.forEach((header, index) => {
        let value = values[index];
        
        // Remove quotes if present
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }

        // Convert empty strings to undefined for optional fields
        if (value === '' || value === 'null' || value === 'undefined') {
          value = undefined;
        }

        // Parse numeric fields
        if (header === 'MRP' || header === 'discountedPrice' || header === 'discountPercentage' || header === 'totalStock') {
          if (value !== undefined && value !== '') {
            const numValue = Number(value);
            if (isNaN(numValue)) {
              throw new Error(`Row ${i + 1}: Invalid number for ${header}: ${value}`);
            }
            value = numValue;
          }
        }

        // Parse boolean fields
        if (header === 'isOutOfStock' || header === 'isItemDetail') {
          if (value !== undefined && value !== '') {
            value = value.toLowerCase() === 'true' || value === '1';
          }
        }

        // Parse array fields (deliveryPincode)
        if (header === 'deliveryPincode' && value !== undefined && value !== '') {
          try {
            if (value.includes('|')) {
              value = value.split('|').map(pincode => Number(pincode.trim())).filter(p => !isNaN(p));
            } else {
              value = [Number(value)].filter(p => !isNaN(p));
            }
          } catch (err) {
            throw new Error(`Row ${i + 1}: Invalid deliveryPincode format: ${value}`);
          }
        }

        // Parse JSON fields (sizeChart, howToMeasure, PPQ)
        if (['sizeChart', 'howToMeasure', 'PPQ'].includes(header) && value !== undefined && value !== '') {
          try {
            value = JSON.parse(value);
          } catch (err) {
            throw new Error(`Row ${i + 1}: Invalid JSON format for ${header}: ${value}`);
          }
        }

        // Parse imagesByColor structure
        if (header === 'imagesByColor' && value !== undefined && value !== '') {
          try {
            if (value.includes('|')) {
              // Format: "color:Red|hexCode:#FF0000|sizes:size1,size2|itemDetailImageIds:img001,img002"
              const colorBlocks = value.split('|');
              const colorData = {};
              
              colorBlocks.forEach(block => {
                if (block.includes(':')) {
                  const [key, val] = block.split(':');
                  colorData[key.trim()] = val.trim();
                }
              });

              if (colorData.color && colorData.itemDetailImageIds) {
                const imageIds = colorData.itemDetailImageIds.split(',').map(id => id.trim());
                const sizes = colorData.sizes ? colorData.sizes.split(',').map(size => size.trim()) : [];
                
                value = [{
                  color: colorData.color,
                  hexCode: colorData.hexCode || '#000000',
                  sizes: sizes.map(size => ({
                    size: size,
                    stock: 0,
                    isOutOfStock: false
                  })),
                  images: imageIds.map(imageId => ({
                    itemDetailImageId: imageId,
                    priority: 1
                  }))
                }];
              } else {
                throw new Error(`Row ${i + 1}: Invalid imagesByColor format: missing color or itemDetailImageIds`);
              }
            } else {
              throw new Error(`Row ${i + 1}: Invalid imagesByColor format: must use | separator`);
            }
          } catch (err) {
            throw new Error(`Row ${i + 1}: Invalid imagesByColor format: ${err.message}`);
          }
        }

        itemDetail[header] = value;
      });

      itemDetails.push(itemDetail);
    }

    return itemDetails;
  } catch (error) {
    throw new Error(`CSV parsing error: ${error.message}`);
  }
};

// Test the CSV parsing
try {
  console.log('Testing CSV parsing for item details...\n');
  
  // Read the demo CSV file
  const csvContent = fs.readFileSync('./demo_item_details_upload.csv', 'utf-8');
  console.log('CSV Content loaded successfully');
  
  // Parse the CSV
  const parsedData = await parseItemDetailsCSV(csvContent);
  console.log(`\n✅ Successfully parsed ${parsedData.length} item details`);
  
  // Display the first parsed item detail
  console.log('\n📋 First Item Detail:');
  console.log(JSON.stringify(parsedData[0], null, 2));
  
  // Validate structure
  console.log('\n🔍 Validation:');
  parsedData.forEach((detail, index) => {
    console.log(`Row ${index + 1}:`);
    console.log(`  - itemName: ${detail.itemName}`);
    console.log(`  - MRP: ${detail.MRP} (type: ${typeof detail.MRP})`);
    console.log(`  - defaultColor: ${detail.defaultColor}`);
    console.log(`  - deliveryPincode: ${Array.isArray(detail.deliveryPincode) ? detail.deliveryPincode.join(', ') : detail.deliveryPincode}`);
    console.log(`  - imagesByColor: ${detail.imagesByColor ? detail.imagesByColor.length + ' color(s)' : 'undefined'}`);
    if (detail.imagesByColor && detail.imagesByColor[0]) {
      console.log(`    - First color: ${detail.imagesByColor[0].color}`);
      console.log(`    - Images: ${detail.imagesByColor[0].images.map(img => img.itemDetailImageId).join(', ')}`);
    }
    console.log('');
  });
  
  console.log('✅ CSV parsing test completed successfully!');
  console.log('\n📝 Note: This test only validates CSV parsing. To test item name resolution,');
  console.log('   you would need to run this with a connected database.');
  
} catch (error) {
  console.error('❌ Error testing CSV parsing:', error.message);
  process.exit(1);
}
