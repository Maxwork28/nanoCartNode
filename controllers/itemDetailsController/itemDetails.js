const mongoose = require("mongoose");
const ItemDetail = require("../../models/Items/ItemDetail");
const Item = require("../../models/Items/Item");
const { uploadMultipleImagesToS3, deleteFromS3 } = require("../../utils/s3Upload");
const { apiResponse } = require("../../utils/apiResponse");

// Utility function to get file extension
function getExtension(filename) {
  const match = filename && filename.match(/(\.[^\.]+)$/);
  if (match) {
    return match[0];
  }
  throw new Error("Invalid file name or extension not found.");
}

// CSV Parser utility for ItemDetails
const parseItemDetailsCSV = async (csvContent) => {
  console.log('🔍 [parseItemDetailsCSV] Starting CSV parsing...');
  console.log('📄 [parseItemDetailsCSV] CSV content length:', csvContent.length);
  
  try {
    const lines = csvContent.trim().split('\n');
    console.log('📊 [parseItemDetailsCSV] Number of lines:', lines.length);
    
    if (lines.length < 2) {
      throw new Error('CSV must have at least a header row and one data row');
    }

    const headers = lines[0].split(',').map(header => header.trim());
    console.log('📋 [parseItemDetailsCSV] Headers:', headers);
    
    const itemDetails = [];

    // Helper function to parse CSV line with proper quote handling
    const parseCSVLine = (line) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      let i = 0;
      
      while (i < line.length) {
        const char = line[i];
        
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            // Handle escaped quotes
            current += '"';
            i += 2;
          } else {
            // Toggle quote state
            inQuotes = !inQuotes;
            i++;
          }
        } else if (char === ',' && !inQuotes) {
          // End of field
          result.push(current.trim());
          current = '';
          i++;
        } else {
          current += char;
          i++;
        }
      }
      
      // Add the last field
      result.push(current.trim());
      return result;
    };

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Skip empty lines

      console.log(`📝 [parseItemDetailsCSV] Processing row ${i + 1}:`, line);

      const values = parseCSVLine(line);
      if (values.length !== headers.length) {
        throw new Error(`Row ${i + 1} has ${values.length} values but header has ${headers.length} columns`);
      }

      const itemDetail = {};
      headers.forEach((header, index) => {
        let value = values[index];
        
        // Remove quotes if present and unescape internal quotes
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
          // Unescape double quotes within the field - handle multiple levels of escaping
          while (value.includes('\\"')) {
            value = value.replace(/\\"/g, '"');
          }
          // Handle escaped backslashes
          while (value.includes('\\\\')) {
            value = value.replace(/\\\\/g, '\\');
          }
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
            console.log(`🔢 [parseItemDetailsCSV] Parsed ${header}:`, value);
          }
        }

        // Parse boolean fields
        if (header === 'isOutOfStock' || header === 'isItemDetail' || header === 'isSize' || header === 'isMultipleColor') {
          if (value !== undefined && value !== '') {
            value = value.toLowerCase() === 'true' || value === '1';
            console.log(`✅ [parseItemDetailsCSV] Parsed ${header}:`, value);
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
            console.log(`📍 [parseItemDetailsCSV] Parsed deliveryPincode:`, value);
          } catch (err) {
            throw new Error(`Row ${i + 1}: Invalid deliveryPincode format: ${value}`);
          }
        }

        // Parse text fields (sizeChart, howToMeasure, PPQ) - now handled as plain text
        if (['sizeChart', 'howToMeasure', 'PPQ'].includes(header) && value !== undefined && value !== '') {
          // Convert plain text to simple array format for compatibility
          if (header === 'howToMeasure') {
            // Convert "Screen Size: Measure diagonally from corner to corner, Unit: inches" to array format
            const parts = value.split(', ');
            value = parts.map(part => {
              if (part.includes(':')) {
                const [title, description] = part.split(': ');
                return { title: title.trim(), description: description.trim(), unit: 'inches' };
              }
              return { title: part.trim(), description: part.trim(), unit: 'inches' };
            });
          } else if (header === 'sizeChart') {
            // Convert "Size: 6.1 inches, Width: 71.5 mm, Height: 147.7 mm, Depth: 8.25 mm" to array format
            const parts = value.split(', ');
            const sizeData = {};
            parts.forEach(part => {
              if (part.includes(':')) {
                const [key, val] = part.split(': ');
                sizeData[key.trim().toLowerCase()] = val.trim();
              }
            });
            value = [sizeData];
          } else if (header === 'PPQ') {
            // Convert "minQty:1|maxQty:10|pricePerUnit:119999" to array format
            if (value.includes('|')) {
              const ppqData = {};
              value.split('|').forEach(part => {
                if (part.includes(':')) {
                  const [key, val] = part.split(':');
                  ppqData[key.trim()] = val.trim();
                }
              });
              
              if (ppqData.minQty && ppqData.pricePerUnit) {
                value = [{
                  minQty: Number(ppqData.minQty),
                  maxQty: ppqData.maxQty ? Number(ppqData.maxQty) : undefined,
                  pricePerUnit: Number(ppqData.pricePerUnit)
                }];
              } else {
                throw new Error(`Row ${i + 1}: Invalid PPQ format: missing required fields minQty or pricePerUnit`);
              }
            } else {
              throw new Error(`Row ${i + 1}: Invalid PPQ format: must use | separator`);
            }
          }
          console.log(`📋 [parseItemDetailsCSV] Parsed ${header}:`, value);
        }

        // Parse imagesByColor structure
        if (header === 'imagesByColor' && value !== undefined && value !== '') {
          try {
            if (value.includes('|')) {
              // Format: "color:Red|hexCode:#FF0000|sizes:size1,stock:50,skuId:SKU001,isOutOfStock:false|itemDetailImageIds:img001,img002|priority:1,2,3|isTbyb:false,false,false"
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
                const priorities = colorData.priority ? colorData.priority.split(',').map(p => Number(p.trim())) : [];
                const isTbybValues = colorData.isTbyb ? colorData.isTbyb.split(',').map(t => t.trim().toLowerCase() === 'true') : [];
                
                // Parse sizes with stock, skuId, and isOutOfStock
                let sizes = [];
                if (colorData.sizes) {
                  const sizeParts = colorData.sizes.split(',');
                  const sizeData = {};
                  sizeParts.forEach(part => {
                    if (part.includes(':')) {
                      const [key, val] = part.split(':');
                      sizeData[key.trim()] = val.trim();
                    }
                  });
                  
                  if (sizeData.size) {
                    sizes = [{
                      size: sizeData.size,
                      stock: sizeData.stock ? Number(sizeData.stock) : 0,
                      skuId: sizeData.skuId || `SKU_${Date.now()}`,
                      isOutOfStock: sizeData.isOutOfStock ? sizeData.isOutOfStock.toLowerCase() === 'true' : false
                    }];
                  }
                }
                
                value = [{
                  color: colorData.color,
                  hexCode: colorData.hexCode || '#000000',
                  sizes: sizes,
                  images: imageIds.map((imageId, idx) => ({
                    itemDetailImageId: imageId,
                    priority: priorities[idx] || idx + 1,
                    isTbyb: isTbybValues[idx] || false
                  }))
                }];
                console.log(`🎨 [parseItemDetailsCSV] Parsed imagesByColor:`, value);
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

      console.log(`✅ [parseItemDetailsCSV] Completed row ${i + 1}:`, itemDetail);
      itemDetails.push(itemDetail);
    }

    console.log(`🎉 [parseItemDetailsCSV] Successfully parsed ${itemDetails.length} item details`);
    return itemDetails;
  } catch (error) {
    console.error(`❌ [parseItemDetailsCSV] Error:`, error.message);
    throw new Error(`CSV parsing error: ${error.message}`);
  }
};

// Utility to resolve item names to IDs
const resolveItemNames = async (itemDetails) => {
  console.log('🔍 [resolveItemNames] Starting item name resolution...');
  console.log('📋 [resolveItemNames] Input itemDetails:', itemDetails);
  
  try {
    // Extract unique item names
    const itemNames = [...new Set(itemDetails.map(detail => detail.itemName).filter(Boolean))];
    console.log('🏷️ [resolveItemNames] Unique item names to resolve:', itemNames);

    // Fetch items by name
    const items = await Item.find({ 
      name: { $in: itemNames.map(name => new RegExp(`^${name}$`, 'i')) } 
    });
    console.log('🔍 [resolveItemNames] Found items in database:', items.map(item => ({ id: item._id, name: item.name })));

    if (items.length !== itemNames.length) {
      const foundNames = items.map(item => item.name);
      const missingNames = itemNames.filter(name => 
        !foundNames.some(foundName => 
          foundName.toLowerCase() === name.toLowerCase()
        )
      );
      console.error('❌ [resolveItemNames] Missing items:', missingNames);
      throw new Error(`Items not found: ${missingNames.join(', ')}`);
    }

    // Create a mapping of name to ID
    const nameToIdMap = {};
    items.forEach(item => {
      nameToIdMap[item.name.toLowerCase()] = item._id;
    });
    console.log('🗺️ [resolveItemNames] Name to ID mapping:', nameToIdMap);

    // Replace itemName with itemId in each item detail
    const resolvedItemDetails = itemDetails.map(detail => {
      if (detail.itemName) {
        const itemId = nameToIdMap[detail.itemName.toLowerCase()];
        if (!itemId) {
          throw new Error(`Item not found: ${detail.itemName}`);
        }
        console.log(`🔄 [resolveItemNames] Resolved "${detail.itemName}" to ID:`, itemId);
        return {
          ...detail,
          itemId: itemId,
          itemName: undefined // Remove itemName as it's no longer needed
        };
      }
      return detail;
    });

    console.log('✅ [resolveItemNames] Successfully resolved all item names');
    console.log('📋 [resolveItemNames] Resolved itemDetails:', resolvedItemDetails);
    return resolvedItemDetails;
  } catch (error) {
    console.error('❌ [resolveItemNames] Error:', error.message);
    throw new Error(`Error resolving item names: ${error.message}`);
  }
};

exports.createItemDetail = async (req, res) => {
  console.log('🚀 [createItemDetail] Starting item detail creation...');
  console.log('📋 [createItemDetail] Request body:', req.body);
  console.log('📁 [createItemDetail] Request files:', req.files ? req.files.length : 'No files');
  
  try {
    const {
      itemId,
      imagesByColor,
      sizeChart,
      howToMeasure,
      isSize,
      isMultipleColor,
      deliveryDescription,
      About,
      PPQ,
      deliveryPincode,
      returnPolicy,
    } = req.body;


    console.log(req.file);
    
    console.log('🔍 [createItemDetail] Extracted data:', {
      itemId,
      imagesByColor: imagesByColor ? 'Present' : 'Missing',
      sizeChart: sizeChart ? 'Present' : 'Missing',
      howToMeasure: howToMeasure ? 'Present' : 'Missing',
      deliveryDescription,
      About,
      deliveryPincode: deliveryPincode ? 'Present' : 'Missing',
      returnPolicy
    });
    
    // Safe JSON parse helper
    const safeParse = (data, name) => {
      if (typeof data === "string") {
        try {
          return JSON.parse(data);
        } catch (err) {
          throw new Error(`Invalid JSON in ${name}`);
        }
      }
      return data || [];
    };

    const parsedImagesByColor = safeParse(imagesByColor, "imagesByColor");
    const parsedSizeChart = safeParse(sizeChart, "sizeChart");
    const parsedHowToMeasure = safeParse(howToMeasure, "howToMeasure");
    const parsedPPQ = safeParse(PPQ, "PPQ");
    const parsedPincodes = safeParse(deliveryPincode, "deliveryPincode")
      .map((p) => Number(p))
      .filter((p) => !isNaN(p));

    console.log('✅ [createItemDetail] Parsed data:', {
      parsedImagesByColor: parsedImagesByColor.length,
      parsedSizeChart: parsedSizeChart.length,
      parsedHowToMeasure: parsedHowToMeasure.length,
      parsedPPQ: parsedPPQ.length,
      parsedPincodes
    });

    // Validate required fields
    if (!itemId || !parsedImagesByColor.length) {
      console.log('❌ [createItemDetail] Validation failed - missing required fields');
      return res.status(400).json(apiResponse(400, false, "itemId and imagesByColor are required."));
    }

    // Validate itemId
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      console.log('❌ [createItemDetail] Invalid itemId format:', itemId);
      return res.status(400).json(apiResponse(400, false, "Invalid itemId format."));
    }

    // Fetch and validate the Item document
    console.log('🔍 [createItemDetail] Fetching item document for itemId:', itemId);
    const itemDoc = await Item.findById(itemId);
    if (!itemDoc) {
      console.log('❌ [createItemDetail] Item not found for itemId:', itemId);
      return res.status(404).json(apiResponse(404, false, "Item not found."));
    }
    console.log('✅ [createItemDetail] Found item:', { id: itemDoc._id, name: itemDoc.name });

    // Check if an ItemDetail already exists for this itemId
    console.log('🔍 [createItemDetail] Checking for existing ItemDetail...');
    const existingItemDetail = await ItemDetail.findOne({ itemId });
    if (existingItemDetail) {
      console.log('❌ [createItemDetail] ItemDetail already exists for itemId:', itemId);
      return res.status(400).json(apiResponse(400, false, "ItemDetail already exists for this item."));
    }
    console.log('✅ [createItemDetail] No existing ItemDetail found');

    const itemDetailsId = new mongoose.Types.ObjectId();
    console.log('🆔 [createItemDetail] Generated new ItemDetail ID:', itemDetailsId);

    // Group uploaded images by fieldname (color), using lowercase for case-insensitive matching
    const filesByColor = {};
    for (const file of req.files || []) {
      const fieldColor = file.fieldname.toLowerCase();
      if (!filesByColor[fieldColor]) filesByColor[fieldColor] = [];
      filesByColor[fieldColor].push(file);
    }
    console.log('📁 [createItemDetail] Files grouped by color:', Object.keys(filesByColor));

    // Process each color block
    const finalImagesByColor = [];
    for (const colorBlock of parsedImagesByColor) {
      const { color, hexCode, sizes } = colorBlock;
      if (!color) {
        console.log('❌ [createItemDetail] Color block missing color field');
        return res.status(400).json(apiResponse(400, false, "Each color block must include a color field."));
      }

      console.log(`🎨 [createItemDetail] Processing color: ${color}`);

      const normalizedColor = color.toLowerCase();
      const files = filesByColor[normalizedColor] || [];
      let images = [];

      if (files.length > 5) {
        console.log(`❌ [createItemDetail] Too many images for color ${color}:`, files.length);
        return res.status(400).json(apiResponse(400, false, `Maximum 5 images allowed per color: ${color}`));
      }

      if (files.length > 0) {
        const folderName = `Nanocart/categories/${itemDoc.categoryId}/subCategories/${itemDoc.subCategoryId}/item/${itemId}/itemDetails/${itemDetailsId}/${color}`;
        console.log('📁 [createItemDetail] S3 folder path:', folderName);
        
        const renamedFiles = files.map((file, idx) => {
          try {
            return {
              ...file,
              originalname: `${color}_image_${idx + 1}${getExtension(file.originalname)}`,
            };
          } catch (err) {
            throw new Error(`Failed to process file ${file.originalname}: ${err.message}`);
          }
        });

        console.log('📁 [createItemDetail] Uploading files to S3...');
        const uploadedUrls = await uploadMultipleImagesToS3(renamedFiles, folderName);
        images = uploadedUrls.map((url, idx) => ({ url, priority: idx + 1 }));
        console.log('✅ [createItemDetail] Files uploaded successfully:', uploadedUrls);
      }

      finalImagesByColor.push({
        color,
        hexCode: hexCode || null, // Include hexCode, default to null if not provided
        images,
        sizes: sizes || [],
      });
    }

    console.log('🎨 [createItemDetail] Final imagesByColor structure:', finalImagesByColor);

    // Construct the item detail
    const itemDetail = new ItemDetail({
      _id: itemDetailsId,
      itemId,
      imagesByColor: finalImagesByColor,
      sizeChart: parsedSizeChart,
      howToMeasure: parsedHowToMeasure,
      isSize: isSize === "true" || isSize === true,
      isMultipleColor: isMultipleColor === "true" || isMultipleColor === true,
      deliveryDescription: deliveryDescription || "",
      About: About || "",
      PPQ: parsedPPQ,
      deliveryPincode: parsedPincodes,
      returnPolicy: returnPolicy || "30-day return policy available.",
    });

    console.log('💾 [createItemDetail] Saving ItemDetail to database...');
    await itemDetail.save();
    console.log('✅ [createItemDetail] ItemDetail saved successfully');

    console.log('🔄 [createItemDetail] Updating item.isItemDetail flag...');
    itemDoc.isItemDetail = true;
    await itemDoc.save();
    console.log('✅ [createItemDetail] Item updated successfully');

    console.log('🎉 [createItemDetail] ItemDetail creation completed successfully');
    return res.status(201).json(apiResponse(201, true, "ItemDetail created successfully", itemDetail));
  } catch (error) {
      console.error("❌ [createItemDetail] Error creating item detail:", {
      message: error.message,
      stack: error.stack,
      body: req.body,
      files: req.files,
    });
    return res.status(500).json(apiResponse(500, false, error.message));
  }
};

exports.updateItemDetail = async (req, res) => {
  try {
    const { itemDetailsId } = req.params;
    const {
      imagesByColor,
      sizeChart,
      howToMeasure,
      isSize,
      isMultipleColor,
      deliveryDescription,
      About,
      PPQ,
      deliveryPincode,
      returnPolicy,
    } = req.body;

    // Validate itemDetailsId
    if (!mongoose.Types.ObjectId.isValid(itemDetailsId)) {
      return res.status(400).json(apiResponse(400, false, "Invalid itemDetailsId format."));
    }

    // Find item detail and populate the item reference
    const itemDetail = await ItemDetail.findById(itemDetailsId).populate("itemId");
    if (!itemDetail) {
      return res.status(404).json(apiResponse(404, false, "ItemDetail not found"));
    }

    // Safe JSON parse helper
    const safeParse = (value, name) => {
      if (typeof value === "string") {
        try {
          return JSON.parse(value);
        } catch (err) {
          throw new Error(`Invalid JSON in ${name}`);
        }
      }
      return value || [];
    };

    // Parse fields
    const parsedImagesByColor = safeParse(imagesByColor, "imagesByColor");
    const parsedSizeChart = safeParse(sizeChart, "sizeChart");
    const parsedHowToMeasure = safeParse(howToMeasure, "howToMeasure");
    const parsedPPQ = safeParse(PPQ, "PPQ");
    const parsedPincodes = safeParse(deliveryPincode, "deliveryPincode")
      .map((p) => Number(p))
      .filter((p) => !isNaN(p));

    // Build update object
    const updateObject = {
      ...(About !== undefined && { About }),
      ...(returnPolicy !== undefined && { returnPolicy }),
      ...(parsedPPQ.length && { PPQ: parsedPPQ }),
      ...(parsedPincodes.length && { deliveryPincode: parsedPincodes }),
      ...(parsedSizeChart.length && { sizeChart: parsedSizeChart }),
      ...(parsedHowToMeasure.length && { howToMeasure: parsedHowToMeasure }),
      ...(deliveryDescription !== undefined && { deliveryDescription }),
      ...(isSize !== undefined && { isSize: isSize === "true" || isSize === true }),
      ...(isMultipleColor !== undefined && { isMultipleColor: isMultipleColor === "true" || isMultipleColor === true }),
    };

    // Update imagesByColor
    if (parsedImagesByColor.length) {
      const newImagesByColor = [];
      const categoryId = itemDetail.itemId.categoryId;
      const subCategoryId = itemDetail.itemId.subCategoryId;
      const itemId = itemDetail.itemId._id;

      // Group uploaded images by fieldname (color)
      const filesByColor = {};
      for (const file of req.files || []) {
        const colorKey = file.fieldname;
        if (!filesByColor[colorKey]) filesByColor[colorKey] = [];
        filesByColor[colorKey].push(file);
      }

      for (const colorBlock of parsedImagesByColor) {
        const { color, hexCode, sizes } = colorBlock;
        if (!color) {
          return res.status(400).json(apiResponse(400, false, "Color is required in imagesByColor"));
        }

        const files = filesByColor[color] || [];
        const existingColorData = itemDetail.imagesByColor.find((entry) => entry.color === color) || { images: [], sizes: [], hexCode: null };

        if (files.length > 5) {
          return res.status(400).json(apiResponse(400, false, `Maximum 5 images allowed per color: ${color}`));
        }

        const folderPath = `Nanocart/categories/${categoryId}/subCategories/${subCategoryId}/item/${itemId}/itemDetails/${itemDetailsId}/${color}`;
        let finalImages = [...existingColorData.images];

        if (files.length > 0) {
          // Delete previous images from S3
          for (const image of existingColorData.images) {
            await deleteFromS3(image.url);
          }

          // Upload new images
          const renamedFiles = files.map((file, idx) => ({
            ...file,
            originalname: `${color}_image_${idx + 1}${getExtension(file.originalname)}`,
          }));

          const uploadedUrls = await uploadMultipleImagesToS3(renamedFiles, folderPath);
          finalImages = uploadedUrls.map((url, idx) => ({
            url,
            priority: idx + 1,
          }));
        }

        newImagesByColor.push({
          color,
          hexCode: hexCode || existingColorData.hexCode || null, // Retain existing or update hexCode
          images: finalImages,
          sizes: sizes || existingColorData.sizes,
        });
      }

      updateObject.imagesByColor = newImagesByColor;
    }

    // Update item detail
    const updatedItemDetail = await ItemDetail.findByIdAndUpdate(
      itemDetailsId,
      { $set: updateObject },
      { new: true }
    );

    return res.status(200).json(apiResponse(200, true, "ItemDetail updated successfully", updatedItemDetail));
  } catch (error) {
    console.error("Error updating item detail:", {
      message: error.message,
      stack: error.stack,
      body: req.body,
      files: req.files,
    });
    return res.status(500).json(apiResponse(500, false, error.message));
  }
};

exports.deleteItemDetail = async (req, res) => {
  try {
    const { itemDetailsId } = req.params;

    // Validate itemDetailsId
    if (!mongoose.Types.ObjectId.isValid(itemDetailsId)) {
      return res.status(400).json(apiResponse(400, false, "Invalid ItemDetail ID"));
    }

    // Find item detail
    const itemDetail = await ItemDetail.findById(itemDetailsId);
    if (!itemDetail) {
      return res.status(404).json(apiResponse(404, false, "ItemDetail not found"));
    }

    // Delete images from S3
    for (const colorObj of itemDetail.imagesByColor || []) {
      for (const image of colorObj.images || []) {
        await deleteFromS3(image.url);
      }
    }

    // Delete item detail
    await ItemDetail.findByIdAndDelete(itemDetailsId);

    // Update the Item's isItemDetail flag
    await Item.findByIdAndUpdate(itemDetail.itemId, { isItemDetail: false });

    return res.status(200).json(apiResponse(200, true, "ItemDetail deleted successfully"));
  } catch (error) {
    console.error("Error deleting item detail:", error.message);
    return res.status(500).json(apiResponse(500, false, error.message));
  }
};

exports.getItemDetailById = async (req, res) => {
  try {
    const { itemDetailsId } = req.params;

    // Validate itemDetailsId
    if (!mongoose.Types.ObjectId.isValid(itemDetailsId)) {
      return res.status(400).json(apiResponse(400, false, "Invalid itemDetailsId format"));
    }

    // Fetch item detail and populate itemId
    const itemDetail = await ItemDetail.findById(itemDetailsId).populate("itemId");
    if (!itemDetail) {
      return res.status(404).json(apiResponse(404, false, "ItemDetail not found"));
    }

    return res.status(200).json(
      apiResponse(200, true, "ItemDetail fetched successfully", itemDetail)
    );
  } catch (error) {
    console.error("Error in getItemDetailById:", error);
    return res.status(500).json(
      apiResponse(500, false, "An error occurred while fetching item detail", { error: error.message })
    );
  }
};

exports.getItemDetailsByItemId = async (req, res) => {
  try {
    const { itemId } = req.params;

    // Validate itemId
    if (!itemId) {
      return res.status(400).json(apiResponse(400, false, "itemId is required in request parameters"));
    }
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json(apiResponse(400, false, "Invalid itemId format"));
    }

    // Fetch item details and populate itemId
    const itemDetails = await ItemDetail.find({ itemId }).populate("itemId");

    if (!itemDetails || itemDetails.length === 0) {
      return res.status(404).json(apiResponse(404, false, "No item details found for this item"));
    }

    // Extract colors and hexCodes from imagesByColor for each item detail
    const colors = itemDetails.reduce((acc, detail) => {
      if (detail.imagesByColor && Array.isArray(detail.imagesByColor)) {
        const detailColors = detail.imagesByColor
          .map((entry) => ({
            color: entry.color,
            hexCode: entry.hexCode || null,
          }))
          .filter((item) => item.color); // Filter out entries with null/undefined color
        return [...acc, ...detailColors];
      }
      return acc;
    }, []);

    // Remove duplicates based on color and sort
    const uniqueColors = Array.from(
      new Map(colors.map((item) => [item.color, item])).values()
    ).sort((a, b) => a.color.localeCompare(b.color));

    // Send successful response
    return res.status(200).json({
      message: "Item details fetched successfully.",
      data: itemDetails,
      colors: uniqueColors,
    });
    
  } catch (error) {
    console.error("Error in getItemDetailsByItemId:", error);
    return res.status(500).json(
      apiResponse(500, false, "An error occurred while fetching item details", { error: error.message })
    );
  }
};

exports.bulkUploadItemDetailsFromFile = async (req, res) => {
  console.log('🚀 [bulkUploadItemDetailsFromFile] Starting bulk upload...');
  console.log('📁 [bulkUploadItemDetailsFromFile] Request file:', req.file ? {
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size
  } : 'No file');
  
  try {
    if (!req.file) {
      console.log('❌ [bulkUploadItemDetailsFromFile] No file uploaded');
      return res.status(400).json(apiResponse(400, false, "No file uploaded."));
    }

    const fileContent = req.file.buffer.toString("utf-8");
    console.log('📄 [bulkUploadItemDetailsFromFile] File content length:', fileContent.length);
    console.log('📄 [bulkUploadItemDetailsFromFile] File content preview:', fileContent.substring(0, 200) + '...');
    
    let itemDetails;

    try {
      console.log('🔍 [bulkUploadItemDetailsFromFile] Attempting JSON parsing...');
      itemDetails = JSON.parse(fileContent);
      console.log('✅ [bulkUploadItemDetailsFromFile] JSON parsing successful');
      console.log('📋 [bulkUploadItemDetailsFromFile] Parsed JSON data:', itemDetails);
    } catch (err) {
      console.log('⚠️ [bulkUploadItemDetailsFromFile] JSON parsing failed, trying CSV...');
      console.log('❌ [bulkUploadItemDetailsFromFile] JSON error:', err.message);
      
      // If JSON parsing fails, try CSV parsing
      try {
        console.log('🔍 [bulkUploadItemDetailsFromFile] Starting CSV parsing...');
        itemDetails = await parseItemDetailsCSV(fileContent);
        console.log('✅ [bulkUploadItemDetailsFromFile] CSV parsing successful');
        
        // Resolve item names to IDs
        console.log('🔍 [bulkUploadItemDetailsFromFile] Starting item name resolution...');
        itemDetails = await resolveItemNames(itemDetails);
        console.log('✅ [bulkUploadItemDetailsFromFile] Item name resolution successful');
        
      } catch (csvErr) {
        console.error('❌ [bulkUploadItemDetailsFromFile] CSV parsing failed:', csvErr.message);
        return res.status(400).json(apiResponse(400, false, `Invalid file format. JSON or CSV expected. Error: ${csvErr.message}`));
      }
    }

    if (!Array.isArray(itemDetails)) {
      console.log('❌ [bulkUploadItemDetailsFromFile] Data is not an array:', typeof itemDetails);
      return res.status(400).json(apiResponse(400, false, "JSON or CSV should be an array of ItemDetails."));
    }

    console.log(`📊 [bulkUploadItemDetailsFromFile] Processing ${itemDetails.length} item details`);

    const itemIdsToUpdate = new Set();

    for (const [index, detail] of itemDetails.entries()) {
      console.log(`🔍 [bulkUploadItemDetailsFromFile] Processing item detail ${index + 1}/${itemDetails.length}:`, detail);
      
      if (!detail.itemId) {
        console.log(`❌ [bulkUploadItemDetailsFromFile] Missing itemId at index ${index}`);
        return res.status(400).json(apiResponse(400, false, `Missing itemId at index ${index}`));
      }

      console.log(`🔍 [bulkUploadItemDetailsFromFile] Checking if itemId exists:`, detail.itemId);
      const exists = await Item.exists({ _id: detail.itemId });
      console.log(`✅ [bulkUploadItemDetailsFromFile] Item exists check result:`, exists);
      
      if (!exists) {
        console.log(`❌ [bulkUploadItemDetailsFromFile] ItemId '${detail.itemId}' at index ${index} does not exist`);
        return res.status(400).json(
          apiResponse(400, false, `ItemId '${detail.itemId}' at index ${index} does not exist.`)
        );
      }

      itemIdsToUpdate.add(detail.itemId);

      // Clean up any image entries missing required fields
      if (detail.imagesByColor && Array.isArray(detail.imagesByColor)) {
        console.log(`🎨 [bulkUploadItemDetailsFromFile] Processing imagesByColor for item ${index + 1}:`, detail.imagesByColor);
                    detail.imagesByColor.forEach((colorEntry, colorIndex) => {
          if (colorEntry.images && Array.isArray(colorEntry.images)) {
                console.log(`🖼️ [bulkUploadItemDetailsFromFile] Processing images for color ${colorIndex}:`, colorEntry.images);
            colorEntry.images = colorEntry.images.map(img => ({
              itemDetailImageId: img.itemDetailImageId,
                  priority: img.priority,
                  isTbyb: img.isTbyb || false
              // url is omitted by design
            }));
                console.log(`✅ [bulkUploadItemDetailsFromFile] Cleaned images for color ${colorIndex}:`, colorEntry.images);
          }
        });
      }
    }

    console.log(`📊 [bulkUploadItemDetailsFromFile] Items to update:`, Array.from(itemIdsToUpdate));
    console.log('🚀 [bulkUploadItemDetailsFromFile] Starting ItemDetails insertion...');

    // Insert ItemDetails
    const inserted = await ItemDetail.insertMany(itemDetails);
    console.log(`✅ [bulkUploadItemDetailsFromFile] Successfully inserted ${inserted.length} ItemDetails:`, inserted.map(item => ({ id: item._id, itemId: item.itemId })));

    // Update isItemDetail = true for all involved Items
    console.log('🔄 [bulkUploadItemDetailsFromFile] Updating item.isItemDetail flags...');
    const updateResult = await Item.updateMany(
      { _id: { $in: Array.from(itemIdsToUpdate) } },
      { $set: { isItemDetail: true } }
    );
    console.log(`✅ [bulkUploadItemDetailsFromFile] Updated ${updateResult.modifiedCount} items`);

    console.log('🎉 [bulkUploadItemDetailsFromFile] Bulk upload completed successfully');
    return res.status(201).json(
      apiResponse(201, true, `${inserted.length} ItemDetails uploaded and Items updated.`, inserted)
    );
  } catch (error) {
    console.error("❌ [bulkUploadItemDetailsFromFile] Bulk Upload Error:", {
      message: error.message,
      stack: error.stack,
      body: req.body,
      file: req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      } : 'No file'
    });
    return res.status(500).json(apiResponse(500, false, "Internal Server Error."));
  }
};
exports.bulkUploadItemDetailImages = async (req, res) => {
  console.log('🚀 [bulkUploadItemDetailImages] Starting bulk image upload...');
  console.log('📋 [bulkUploadItemDetailImages] Request body:', req.body);
  console.log('📁 [bulkUploadItemDetailImages] Request files:', req.files ? {
    count: req.files.length,
    files: req.files.map(f => ({
      originalname: f.originalname,
      mimetype: f.mimetype,
      size: f.size,
      fieldname: f.fieldname
    }))
  } : 'No files');
  
  try {
    const { itemDetailId } = req.body;
    console.log('🔍 [bulkUploadItemDetailImages] Extracted itemDetailId:', itemDetailId);

    // Validate input - itemDetailId is now optional since we'll find it by image filename
    if (!req.files || req.files.length === 0) {
      console.log('❌ [bulkUploadItemDetailImages] Validation failed:', {
        hasFiles: !!req.files,
        fileCount: req.files ? req.files.length : 0
      });
      return res.status(400).json(
        apiResponse(400, false, "Missing image files.")
      );
    }

    console.log('✅ [bulkUploadItemDetailImages] Input validation passed');

    // Find item detail - either by provided ID or by searching through all item details
    let itemDetail = null;
    
    if (itemDetailId) {
      // If itemDetailId is provided, use it directly
      console.log('🔍 [bulkUploadItemDetailImages] Searching for ItemDetail with provided ID:', itemDetailId);
      itemDetail = await ItemDetail.findById(itemDetailId);
    if (!itemDetail) {
        console.log('❌ [bulkUploadItemDetailImages] ItemDetail not found for provided ID:', itemDetailId);
      return res.status(404).json(
        apiResponse(404, false, "ItemDetail not found.")
      );
      }
      console.log('✅ [bulkUploadItemDetailImages] Found ItemDetail by provided ID:', {
        id: itemDetail._id,
        itemId: itemDetail.itemId,
        imagesByColorCount: itemDetail.imagesByColor ? itemDetail.imagesByColor.length : 0
      });
    } else {
      // If no itemDetailId provided, we'll find it by matching image filenames
      console.log('🔍 [bulkUploadItemDetailImages] No itemDetailId provided, will find ItemDetail by image filename matching');
    }

    // Log the structure of imagesByColor for debugging (only if itemDetail exists)
    if (itemDetail && itemDetail.imagesByColor && itemDetail.imagesByColor.length > 0) {
      console.log('🎨 [bulkUploadItemDetailImages] Current imagesByColor structure:');
      itemDetail.imagesByColor.forEach((colorEntry, colorIndex) => {
        console.log(`  Color ${colorIndex}:`, {
          color: colorEntry.color,
          hexCode: colorEntry.hexCode,
          imagesCount: colorEntry.images ? colorEntry.images.length : 0,
          images: colorEntry.images ? colorEntry.images.map(img => ({
            itemDetailImageId: img.itemDetailImageId,
            url: img.url ? 'Present' : 'Missing',
            priority: img.priority,
            isTbyb: img.isTbyb
          })) : []
        });
      });
    } else if (itemDetail) {
      console.log('⚠️ [bulkUploadItemDetailImages] No imagesByColor structure found in ItemDetail');
    } else {
      console.log('ℹ️ [bulkUploadItemDetailImages] No ItemDetail provided, will search by image filename');
    }

    const uploadResults = [];
    const errors = [];

    console.log(`📤 [bulkUploadItemDetailImages] Processing ${req.files.length} files...`);

    // Process each file
    const uploadPromises = req.files.map(async (file, fileIndex) => {
      console.log(`📁 [bulkUploadItemDetailImages] Processing file ${fileIndex + 1}/${req.files.length}:`, {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        fieldname: file.fieldname
      });

      const itemDetailImageId = file.originalname.split(".")[0];
      console.log(`🆔 [bulkUploadItemDetailImages] Extracted itemDetailImageId: "${itemDetailImageId}" from filename: "${file.originalname}"`);
      
      let matched = false;
      let uploadedImageUrl = null;
      let matchedColorEntry = null;
      let matchedImageEntry = null;
      let currentItemDetail = itemDetail;

      // If no itemDetail was provided, search for it by matching image filenames
      if (!currentItemDetail) {
        console.log('🔍 [bulkUploadItemDetailImages] Searching for ItemDetail by image filename matching...');
        const allItemDetails = await ItemDetail.find({}).populate('itemId');
        console.log(`📊 [bulkUploadItemDetailImages] Found ${allItemDetails.length} total ItemDetails to search through`);
        
        for (const detail of allItemDetails) {
          if (detail.imagesByColor && detail.imagesByColor.length > 0) {
            for (const colorEntry of detail.imagesByColor) {
              if (colorEntry.images && colorEntry.images.length > 0) {
                const imageEntry = colorEntry.images.find(
                  (img) => img.itemDetailImageId === itemDetailImageId
                );
                
                if (imageEntry) {
                  console.log(`✅ [bulkUploadItemDetailImages] Found matching ItemDetail by image filename:`, {
                    itemDetailId: detail._id,
                    itemId: detail.itemId?._id,
                    color: colorEntry.color,
                    itemDetailImageId: imageEntry.itemDetailImageId
                  });
                  
                  currentItemDetail = detail;
                  matched = true;
                  matchedColorEntry = colorEntry;
                  matchedImageEntry = imageEntry;
                  break;
                }
              }
            }
            if (matched) break;
          }
        }
        
        if (!currentItemDetail) {
          console.log('❌ [bulkUploadItemDetailImages] No ItemDetail found matching image filename:', itemDetailImageId);
          errors.push(
            `No ItemDetail found matching image filename: ${itemDetailImageId}`
          );
          return null;
        }
      }

      // Search for matching image in imagesByColor
      console.log('🔍 [bulkUploadItemDetailImages] Searching for matching image in imagesByColor...');
      for (const colorEntry of currentItemDetail.imagesByColor) {
        console.log(`  Checking color: "${colorEntry.color}"`);
        
        if (colorEntry.images && colorEntry.images.length > 0) {
        const imageEntry = colorEntry.images.find(
          (img) => img.itemDetailImageId === itemDetailImageId
        );

        if (imageEntry) {
            console.log(`✅ [bulkUploadItemDetailImages] Found matching image in color "${colorEntry.color}":`, {
              itemDetailImageId: imageEntry.itemDetailImageId,
              priority: imageEntry.priority,
              isTbyb: imageEntry.isTbyb,
              hasUrl: !!imageEntry.url
            });
            
            matched = true;
            matchedColorEntry = colorEntry;
            matchedImageEntry = imageEntry;
            break;
          } else {
            console.log(`  No match found in color "${colorEntry.color}"`);
          }
        } else {
          console.log(`  No images found in color "${colorEntry.color}"`);
        }
      }

      if (matched) {
        const folderPath = `Nanocart/items/${currentItemDetail._id}/colors/${matchedColorEntry.color}`;
        console.log('📁 [bulkUploadItemDetailImages] S3 folder path:', folderPath);
        
        try {
          console.log('☁️ [bulkUploadItemDetailImages] Uploading to S3...');
            const uploadResult = await uploadMultipleImagesToS3([file], folderPath);
          console.log('✅ [bulkUploadItemDetailImages] S3 upload successful:', uploadResult);
          
          matchedImageEntry.url = uploadResult[0];
            uploadedImageUrl = uploadResult[0];
          
          console.log('🔄 [bulkUploadItemDetailImages] Updated image entry with URL:', {
            itemDetailImageId: matchedImageEntry.itemDetailImageId,
            newUrl: matchedImageEntry.url
          });
          
          } catch (uploadError) {
          console.error('❌ [bulkUploadItemDetailImages] S3 upload failed:', {
            error: uploadError.message,
            stack: uploadError.stack,
            file: file.originalname,
            itemDetailImageId: itemDetailImageId
          });
          
            errors.push(
              `Failed to upload image for itemDetailImageId: ${itemDetailImageId} - ${uploadError.message}`
            );
            return null;
          }
      } else {
        console.log('❌ [bulkUploadItemDetailImages] No matching image found for itemDetailImageId:', itemDetailImageId);
        errors.push(
          `No matching image found with itemDetailImageId: ${itemDetailImageId}`
        );
        return null;
      }

      const result = { 
        itemDetailImageId, 
        url: uploadedImageUrl, 
        itemDetailId: currentItemDetail._id,
        color: matchedColorEntry.color
      };
      console.log('✅ [bulkUploadItemDetailImages] File processing completed:', result);
      return result;
    });

    // Wait for all uploads to complete
    console.log('⏳ [bulkUploadItemDetailImages] Waiting for all uploads to complete...');
    const allResults = await Promise.all(uploadPromises);
    console.log('📊 [bulkUploadItemDetailImages] All uploads completed. Results:', allResults);
    
    uploadResults.push(
      ...allResults.filter((result) => result !== null)
    );

    console.log('📈 [bulkUploadItemDetailImages] Final results:', {
      totalFiles: req.files.length,
      successfulUploads: uploadResults.length,
      errors: errors.length,
      uploadResults: uploadResults,
      errors: errors
    });

    // Handle errors
    if (errors.length > 0) {
      console.log('⚠️ [bulkUploadItemDetailImages] Some images could not be processed. Errors:', errors);
      return res.status(400).json(
        apiResponse(400, false, "Some images could not be processed.", {
          errors,
          uploaded: uploadResults,
        })
      );
    }

    // Save updated item details
    console.log('💾 [bulkUploadItemDetailImages] Saving updated ItemDetails to database...');
    
    // Collect all unique item details that were updated and update their URLs
    const updatedItemDetails = new Set();
    if (itemDetail) {
      // If itemDetail was provided initially, we need to update its URLs too
      for (const result of uploadResults) {
        if (result && result.itemDetailId && result.itemDetailId.toString() === itemDetail._id.toString()) {
          // Find and update the specific image URL in the initial itemDetail
          for (const colorEntry of itemDetail.imagesByColor) {
            if (colorEntry.images && colorEntry.images.length > 0) {
              for (const image of colorEntry.images) {
                if (image.itemDetailImageId === result.itemDetailImageId) {
                  image.url = result.url;
                  console.log(`🔄 [bulkUploadItemDetailImages] Updated URL in initial itemDetail for ${result.itemDetailImageId}:`, result.url);
                  break;
                }
              }
            }
          }
        }
      }
      updatedItemDetails.add(itemDetail);
    }
    
    // Update URLs in the database documents before saving
    for (const result of uploadResults) {
      if (result && result.itemDetailId) {
        const detail = await ItemDetail.findById(result.itemDetailId);
        if (detail) {
          // Find and update the specific image URL in the database document
          for (const colorEntry of detail.imagesByColor) {
            if (colorEntry.images && colorEntry.images.length > 0) {
              for (const image of colorEntry.images) {
                if (image.itemDetailImageId === result.itemDetailImageId) {
                  image.url = result.url;
                  console.log(`🔄 [bulkUploadItemDetailImages] Updated URL in database document for ${result.itemDetailImageId}:`, result.url);
                  break;
                }
              }
            }
          }
          updatedItemDetails.add(detail);
        }
      }
    }
    
    console.log(`💾 [bulkUploadItemDetailImages] Saving ${updatedItemDetails.size} updated ItemDetails...`);
    
    // Log the URLs before saving to verify they're set
    Array.from(updatedItemDetails).forEach((detail, index) => {
      console.log(`📋 [bulkUploadItemDetailImages] ItemDetail ${index + 1} before saving:`, detail._id);
      if (detail.imagesByColor && detail.imagesByColor.length > 0) {
        detail.imagesByColor.forEach((colorEntry, colorIndex) => {
          console.log(`  Color ${colorIndex} (${colorEntry.color}):`);
          if (colorEntry.images && colorEntry.images.length > 0) {
            colorEntry.images.forEach((img, imgIndex) => {
              console.log(`    Image ${imgIndex + 1}: ${img.itemDetailImageId} - URL: ${img.url || 'Missing'}`);
            });
          }
        });
      }
    });
    
    // Save all updated item details
    const savePromises = Array.from(updatedItemDetails).map(async (detail) => {
      try {
        const saved = await detail.save();
        console.log(`✅ [bulkUploadItemDetails] Saved ItemDetail:`, saved._id);
        return saved;
      } catch (saveError) {
        console.error(`❌ [bulkUploadItemDetails] Failed to save ItemDetail ${detail._id}:`, saveError.message);
        throw saveError;
      }
    });
    
    const savedItemDetails = await Promise.all(savePromises);
    console.log(`✅ [bulkUploadItemDetails] Successfully saved ${savedItemDetails.length} ItemDetails`);

    // Log the final state of the first saved item detail for debugging
    const firstSavedDetail = savedItemDetails[0];
    if (firstSavedDetail && firstSavedDetail.imagesByColor && firstSavedDetail.imagesByColor.length > 0) {
      console.log('🎨 [bulkUploadItemDetailImages] Final imagesByColor structure (first saved detail):');
      firstSavedDetail.imagesByColor.forEach((colorEntry, colorIndex) => {
        console.log(`  Color ${colorIndex}:`, {
          color: colorEntry.color,
          hexCode: colorEntry.hexCode,
          imagesCount: colorEntry.images ? colorEntry.images.length : 0,
          images: colorEntry.images ? colorEntry.images.map(img => ({
            itemDetailImageId: img.itemDetailImageId,
            url: img.url ? 'Present' : 'Missing',
            priority: img.priority,
            isTbyb: img.isTbyb
          })) : []
        });
      });
    }

    console.log('🎉 [bulkUploadItemDetailImages] Bulk image upload completed successfully');

    // Send success response
    return res.status(200).json(
      apiResponse(200, true, "Images uploaded and mapped successfully.", {
        updatedItemDetails: savedItemDetails,
        uploadedImages: uploadResults
      })
    );
  } catch (error) {
    console.error("❌ [bulkUploadItemDetailImages] ItemDetail Image Bulk Upload Error:", {
      message: error.message,
      stack: error.stack,
      body: req.body,
      files: req.files ? {
        count: req.files.length,
        files: req.files.map(f => ({
          originalname: f.originalname,
          mimetype: f.mimetype,
          size: f.size
        }))
      } : 'No files'
    });
    return res.status(500).json(
      apiResponse(500, false, "Internal Server Error.")
    );
  }
};


// Utility to convert a string to MongoDB ObjectId
const toObjectId = (id) => {
  try {
    if (!id || typeof id !== "string") {
      throw new Error("ID must be a non-empty string.");
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid ObjectId format.");
    }
    return new mongoose.Types.ObjectId(id);
  } catch (error) {
    throw new Error(`Failed to convert to ObjectId: ${error.message}`);
  }
};

//For Admin Controller
// Update stock for a specific itemDetailId and skuId
exports.updateStock = async (req, res) => {
  try {
    const {itemDetailId}=req.params;
    const { skuId, stock } = req.body;

    // Validate input
    if (!itemDetailId || !skuId || stock === undefined) {
      return res.status(400).json(apiResponse(400, false, "itemDetailId, skuId, and stock are required."));
    }

    let objectId;
    try {
      objectId = toObjectId(itemDetailId);
    } catch (error) {
      return res.status(400).json(apiResponse(400, false, "Invalid itemDetailId format."));
    }

    if (typeof stock !== "number" || stock < 0) {
      return res.status(400).json(apiResponse(400, false, "Stock must be a non-negative number."));
    }

    // Find ItemDetail
    const itemDetail = await ItemDetail.findById(objectId);
    if (!itemDetail) {
      return res.status(404).json(apiResponse(404, false, "ItemDetail not found."));
    }

    // Find and update the specific SKU in imagesByColor
    let skuFound = false;
    for (const colorEntry of itemDetail.imagesByColor) {
      const sizeEntry = colorEntry.sizes.find((size) => size.skuId === skuId);
      if (sizeEntry) {
        sizeEntry.stock += stock; // Increment stock
        sizeEntry.isOutOfStock = sizeEntry.stock === 0; // Update isOutOfStock
        skuFound = true;
        break;
      }
    }

    if (!skuFound) {
      return res.status(404).json(apiResponse(404, false, "SKU not found for this ItemDetail."));
    }

    // Save updated ItemDetail
    await itemDetail.save();

    return res.status(200).json(
      apiResponse(200, true, "Stock updated successfully.", {
        itemDetailId,
        skuId,
        stock: itemDetail.imagesByColor.find((entry) => entry.sizes.some((size) => size.skuId === skuId)).sizes.find((size) => size.skuId === skuId).stock,
      })
    );
  } catch (error) {
    console.error("Error updating stock:", {
      message: error.message,
      stack: error.stack,
      body: req.body,
    });
    return res.status(500).json(apiResponse(500, false, "An error occurred while updating stock."));
  }
};

// Fetch stock details for a specific itemDetailId and skuId
exports.getStockDetails = async (req, res) => {
  try {
    const { itemDetailId, skuId } = req.params;

    // Validate input
    if (!itemDetailId || !skuId) {
      return res.status(400).json(apiResponse(400, false, "itemDetailId and skuId are required."));
    }

    let objectId;
    try {
      objectId = toObjectId(itemDetailId);
    } catch (error) {
      return res.status(400).json(apiResponse(400, false, "Invalid itemDetailId format."));
    }

    // Find ItemDetail
    const itemDetail = await ItemDetail.findById(objectId).populate("itemId");
    if (!itemDetail) {
      return res.status(404).json(apiResponse(404, false, "ItemDetail not found."));
    }

    // Find the specific SKU in imagesByColor
    let stockDetails = null;
    for (const colorEntry of itemDetail.imagesByColor) {
      const sizeEntry = colorEntry.sizes.find((size) => size.skuId === skuId);
      if (sizeEntry) {
        stockDetails = {
          itemDetailId,
          skuId,
          color: colorEntry.color,
          size: sizeEntry.size,
          stock: sizeEntry.stock,
          isOutOfStock: sizeEntry.isOutOfStock,
        };
        break;
      }
    }

    if (!stockDetails) {
      return res.status(404).json(apiResponse(404, false, "SKU not found for this ItemDetail."));
    }

    return res.status(200).json(apiResponse(200, true, "Stock details fetched successfully.", stockDetails));
  } catch (error) {
    console.error("Error fetching stock details:", {
      message: error.message,
      stack: error.stack,
    });
    return res.status(500).json(apiResponse(500, false, "An error occurred while fetching stock details."));
  }
};

exports.updateTbybStatus = async (req, res) => {
  try {
    const {itemDetailId} = req.params;
    const {color, imageId} = req.body;

    // Validate required fields
    if (!itemDetailId || !color || !imageId) {
      return res.status(400).json({ 
        success: false, 
        message: 'itemDetailId, color, and imageId are required' 
      });
    }

    // Find and update the item detail
    const itemDetail = await ItemDetail.findById(itemDetailId);
    
    if (!itemDetail) {
      return res.status(404).json({ 
        success: false, 
        message: 'Item detail not found' 
      });
    }

    // Find the color entry
    const colorEntry = itemDetail.imagesByColor.find(
      entry => entry.color.toLowerCase() === color.toLowerCase()
    );

    if (!colorEntry) {
      return res.status(404).json({ 
        success: false, 
        message: `Color ${color} not found` 
      });
    }

    // Find and update the image
    const image = colorEntry.images.find(
      img => img._id.toString() === imageId
    );

    if (!image) {
      return res.status(404).json({ 
        success: false, 
        message: 'Image not found' 
      });
    }

    // Update isTbyb to true for the specified image
    image.isTbyb = true;

    // Check and set other images' isTbyb to false if any are true
    itemDetail.imagesByColor.forEach(colorEntry => {
      colorEntry.images.forEach(img => {
        if (img._id.toString() !== imageId && img.isTbyb === true) {
          img.isTbyb = false;
        }
      });
    });

    // Save the updated document
    await itemDetail.save();

    // Prepare response with requested data
    const response = {
      success: true,
      data: {
        itemDetailId: itemDetail._id,
        color: colorEntry.color,
        imageId: image._id,
        isTbyb: image.isTbyb
      },
      itemDetail
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Error updating isTbyb status:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error while updating isTbyb status',
      error: error.message 
    });
  }
};