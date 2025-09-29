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
  try {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV must have at least a header row and one data row');
    }
    
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
          result.push(current ? current.trim() : '');
          current = '';
          i++;
        } else {
          current += char;
          i++;
        }
      }
      
      // Add the last field
      result.push(current ? current.trim() : '');
      return result;
    };
    
    const headers = parseCSVLine(lines[0]);
    
    // Validate that this is an item details CSV by checking for required fields
    const requiredFields = ['itemName', 'About', 'deliveryDescription'];
    const missingFields = requiredFields.filter(field => !headers.includes(field));
    if (missingFields.length > 0) {
      throw new Error(`This appears to be a regular items CSV, not an item details CSV. Missing required fields: ${missingFields.join(', ')}. Please use the item details CSV template.`);
    }
    
    const itemDetails = [];
    for (let i = 1; i < lines.length; i++) {
      try {
        const line = lines[i].trim();
        if (!line) continue; // Skip empty lines
        
        const values = parseCSVLine(line);
        
        if (values.length !== headers.length) {
          throw new Error(`Row ${i + 1} has ${values.length} values but header has ${headers.length} columns`);
        }
        
        const itemDetail = {};
        headers.forEach((header, index) => {
          let value = values[index];
          
          // Handle undefined values - this is the key fix
          if (value === undefined || value === null) {
            value = '';
          }
          
          // Ensure value is a string before calling trim
          if (typeof value !== 'string') {
            value = String(value || '');
          }
        
        // Remove quotes if present and unescape internal quotes
        if (value && value.startsWith('"') && value.endsWith('"')) {
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
          }
        }
        // Parse boolean fields
        if (header === 'isOutOfStock' || header === 'isItemDetail' || header === 'isSize' || header === 'isMultipleColor') {
          if (value !== undefined && value !== '') {
            value = value.toLowerCase() === 'true' || value === '1';
          }
        }
          // Parse array fields (deliveryPincode)
          if (header === 'deliveryPincode' && value !== undefined && value !== '') {
            try {
              if (value.includes('|')) {
                value = value.split('|').map(pincode => Number((pincode || '').trim())).filter(p => !isNaN(p));
              } else {
                value = [Number(value)].filter(p => !isNaN(p));
              }
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
                return { title: (title || '').trim(), description: (description || '').trim(), unit: 'inches' };
              }
              return { title: (part || '').trim(), description: (part || '').trim(), unit: 'inches' };
            });
          } else if (header === 'sizeChart') {
            // Convert "size:XS|inches:chest:34,length:26|cm:chest:86,length:66" to array format
            if (value.includes('|')) {
              const parts = value.split('|');
              const sizeData = {};
              
              parts.forEach(part => {
                if (part.includes(':')) {
                  const colonIndex = part.indexOf(':');
                  const key = part.substring(0, colonIndex);
                  const val = part.substring(colonIndex + 1);
                  const trimmedKey = (key || '').trim();
                  const trimmedVal = (val || '').trim();
                  
                  if (trimmedKey === 'size') {
                    sizeData.size = trimmedVal;
                  } else if (trimmedKey === 'inches' || trimmedKey === 'cm') {
                    // Parse measurements like "chest:34,length:26"
                    const measurements = {};
                    if (trimmedVal.includes(',')) {
                      trimmedVal.split(',').forEach(measurement => {
                        if (measurement.includes(':')) {
                          const [measureKey, measureVal] = measurement.split(':');
                          measurements[(measureKey || '').trim()] = Number((measureVal || '').trim()) || 0;
                        }
                      });
                    } else if (trimmedVal.includes(':')) {
                      const [measureKey, measureVal] = trimmedVal.split(':');
                      measurements[(measureKey || '').trim()] = Number((measureVal || '').trim()) || 0;
                    }
                    sizeData[trimmedKey] = measurements;
                  }
                }
              });
              
              value = [sizeData];
            } else {
              // Fallback for old format
              const parts = value.split(', ');
              const sizeData = {};
              parts.forEach(part => {
                if (part.includes(':')) {
                  const [key, val] = part.split(': ');
                  sizeData[(key || '').trim().toLowerCase()] = (val || '').trim();
                }
              });
              value = [sizeData];
            }
          } else if (header === 'PPQ') {
            // Convert "minQty:1|maxQty:10|pricePerUnit:119999" to array format
            if (value.includes('|')) {
              const ppqData = {};
              value.split('|').forEach(part => {
                if (part.includes(':')) {
                  const [key, val] = part.split(':');
                  ppqData[(key || '').trim()] = (val || '').trim();
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
                  colorData[(key || '').trim()] = (val || '').trim();
                }
              });
              if (colorData.color && colorData.itemDetailImageIds) {
                const imageIds = colorData.itemDetailImageIds.split(',').map(id => (id || '').trim());
                const priorities = colorData.priority ? colorData.priority.split(',').map(p => Number((p || '').trim())) : [];
                const isTbybValues = colorData.isTbyb ? colorData.isTbyb.split(',').map(t => (t || '').trim().toLowerCase() === 'true') : [];
                // Parse sizes with stock, skuId, and isOutOfStock
                let sizes = [];
                if (colorData.sizes) {
                  // Handle tilde-separated format: "XS~20~SKU_WHITE_XS_001~false"
                  if (colorData.sizes.includes('~')) {
                    const sizeParts = colorData.sizes.split('~');
                    if (sizeParts.length >= 4) {
                      sizes = [{
                        size: sizeParts[0] || '',
                        stock: sizeParts[1] ? Number(sizeParts[1]) : 0,
                        skuId: sizeParts[2] || `SKU_${Date.now()}`,
                        isOutOfStock: sizeParts[3] ? sizeParts[3].toLowerCase() === 'true' : false
                      }];
                    }
                  } else {
                    // Handle comma-separated format: "size1,stock:50,skuId:SKU001,isOutOfStock:false"
                    const sizeParts = colorData.sizes.split(',');
                    const sizeData = {};
                    sizeParts.forEach(part => {
                      if (part.includes(':')) {
                        const [key, val] = part.split(':');
                        sizeData[(key || '').trim()] = (val || '').trim();
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
      } catch (rowError) {
        throw new Error(`Error processing row ${i + 1}: ${rowError.message}`);
      }
    }
    return itemDetails;
  } catch (error) {
    throw new Error(`CSV parsing error: ${error.message}`);
  }
};
// Utility to resolve item names to IDs
const resolveItemNames = async (itemDetails) => {
  try {
    // Extract unique item names
    const itemNames = [...new Set(itemDetails.map(detail => detail.itemName).filter(Boolean))];
    // Fetch items by name
    const items = await Item.find({ 
      name: { $in: itemNames.map(name => new RegExp(`^${name}$`, 'i')) } 
    });
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
    // Replace itemName with itemId in each item detail
    const resolvedItemDetails = itemDetails.map(detail => {
      if (detail.itemName) {
        const itemId = nameToIdMap[detail.itemName.toLowerCase()];
        if (!itemId) {
          throw new Error(`Item not found: ${detail.itemName}`);
        }
        return {
          ...detail,
          itemId: itemId,
          itemName: undefined // Remove itemName as it's no longer needed
        };
      }
      return detail;
    });
    return resolvedItemDetails;
  } catch (error) {
    console.error('❌ [resolveItemNames] Error:', error.message);
    throw new Error(`Error resolving item names: ${error.message}`);
  }
};
exports.createItemDetail = async (req, res) => {
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
    // Validate required fields
    if (!itemId || !parsedImagesByColor.length) {
      return res.status(400).json(apiResponse(400, false, "itemId and imagesByColor are required."));
    }
    // Validate itemId
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json(apiResponse(400, false, "Invalid itemId format."));
    }
    // Fetch and validate the Item document
    const itemDoc = await Item.findById(itemId);
    if (!itemDoc) {
      return res.status(404).json(apiResponse(404, false, "Item not found."));
    }
    // Check if an ItemDetail already exists for this itemId
    const existingItemDetail = await ItemDetail.findOne({ itemId });
    if (existingItemDetail) {
      return res.status(400).json(apiResponse(400, false, "ItemDetail already exists for this item."));
    }
    const itemDetailsId = new mongoose.Types.ObjectId();
    // Group uploaded images by fieldname (color), using lowercase for case-insensitive matching
    const filesByColor = {};
    for (const file of req.files || []) {
      const fieldColor = file.fieldname.toLowerCase();
      if (!filesByColor[fieldColor]) filesByColor[fieldColor] = [];
      filesByColor[fieldColor].push(file);
    }
    // Process each color block
    const finalImagesByColor = [];
    for (const colorBlock of parsedImagesByColor) {
      const { color, hexCode, sizes } = colorBlock;
      if (!color) {
        return res.status(400).json(apiResponse(400, false, "Each color block must include a color field."));
      }
      const normalizedColor = color.toLowerCase();
      const files = filesByColor[normalizedColor] || [];
      let images = [];
      if (files.length > 5) {
        return res.status(400).json(apiResponse(400, false, `Maximum 5 images allowed per color: ${color}`));
      }
      if (files.length > 0) {
        const folderName = `Nanocart/categories/${itemDoc.categoryId}/subCategories/${itemDoc.subCategoryId}/item/${itemId}/itemDetails/${itemDetailsId}/${color}`;
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
        const uploadedUrls = await uploadMultipleImagesToS3(renamedFiles, folderName);
        images = uploadedUrls.map((url, idx) => ({ url, priority: idx + 1 }));
      }
      finalImagesByColor.push({
        color,
        hexCode: hexCode || null, // Include hexCode, default to null if not provided
        images,
        sizes: sizes || [],
      });
    }
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
    await itemDetail.save();
    itemDoc.isItemDetail = true;
    await itemDoc.save();
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
  try {
    if (!req.file) {
      return res.status(400).json(apiResponse(400, false, "No file uploaded."));
    }
    const fileContent = req.file.buffer.toString("utf-8");
    let itemDetails;
    try {
      itemDetails = JSON.parse(fileContent);
    } catch (err) {
      // If JSON parsing fails, try CSV parsing
      try {
        itemDetails = await parseItemDetailsCSV(fileContent);
        // Resolve item names to IDs
        itemDetails = await resolveItemNames(itemDetails);
      } catch (csvErr) {
        return res.status(400).json(apiResponse(400, false, `CSV parsing failed: ${csvErr.message}. Please ensure you're using the correct item details CSV template.`));
      }
    }
    if (!Array.isArray(itemDetails)) {
      return res.status(400).json(apiResponse(400, false, "JSON or CSV should be an array of ItemDetails."));
    }
    const itemIdsToUpdate = new Set();
    for (const [index, detail] of itemDetails.entries()) {
      if (!detail.itemId) {
        return res.status(400).json(apiResponse(400, false, `Missing itemId at index ${index}`));
      }
      const exists = await Item.exists({ _id: detail.itemId });
      if (!exists) {
        return res.status(400).json(
          apiResponse(400, false, `ItemId '${detail.itemId}' at index ${index} does not exist.`)
        );
      }
      itemIdsToUpdate.add(detail.itemId);
      // Clean up any image entries missing required fields
      if (detail.imagesByColor && Array.isArray(detail.imagesByColor)) {
                    detail.imagesByColor.forEach((colorEntry, colorIndex) => {
          if (colorEntry.images && Array.isArray(colorEntry.images)) {
            colorEntry.images = colorEntry.images.map(img => ({
              itemDetailImageId: img.itemDetailImageId,
                  priority: img.priority,
                  isTbyb: img.isTbyb || false
              // url is omitted by design
            }));
          }
        });
      }
    }
    // Insert ItemDetails
    const inserted = await ItemDetail.insertMany(itemDetails);
    // Update isItemDetail = true for all involved Items
    const updateResult = await Item.updateMany(
      { _id: { $in: Array.from(itemIdsToUpdate) } },
      { $set: { isItemDetail: true } }
    );
    return res.status(201).json(
      apiResponse(201, true, `${inserted.length} ItemDetails uploaded and Items updated.`, inserted)
    );
  } catch (error) {
    console.error("Bulk Upload Error:", error.message);
    return res.status(500).json(apiResponse(500, false, "Internal Server Error."));
  }
};
exports.bulkUploadItemDetailImages = async (req, res) => {
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
    // Validate input - itemDetailId is now optional since we'll find it by image filename
    if (!req.files || req.files.length === 0) {
      return res.status(400).json(
        apiResponse(400, false, "Missing image files.")
      );
    }
    // Find item detail - either by provided ID or by searching through all item details
    let itemDetail = null;
    if (itemDetailId) {
      // If itemDetailId is provided, use it directly
      itemDetail = await ItemDetail.findById(itemDetailId);
    if (!itemDetail) {
      return res.status(404).json(
        apiResponse(404, false, "ItemDetail not found.")
      );
      }
    } else {
      // If no itemDetailId provided, we'll find it by matching image filenames
    }
    // Log the structure of imagesByColor for debugging (only if itemDetail exists)
    if (itemDetail && itemDetail.imagesByColor && itemDetail.imagesByColor.length > 0) {
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
    } else {
    }
    const uploadResults = [];
    const errors = [];
    // Process each file
    const uploadPromises = req.files.map(async (file, fileIndex) => {
      const itemDetailImageId = file.originalname.split(".")[0];
      let matched = false;
      let uploadedImageUrl = null;
      let matchedColorEntry = null;
      let matchedImageEntry = null;
      let currentItemDetail = itemDetail;
      // If no itemDetail was provided, search for it by matching image filenames
      if (!currentItemDetail) {
        const allItemDetails = await ItemDetail.find({}).populate('itemId');
        for (const detail of allItemDetails) {
          if (detail.imagesByColor && detail.imagesByColor.length > 0) {
            for (const colorEntry of detail.imagesByColor) {
              if (colorEntry.images && colorEntry.images.length > 0) {
                const imageEntry = colorEntry.images.find(
                  (img) => img.itemDetailImageId === itemDetailImageId
                );
                if (imageEntry) {
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
          errors.push(
            `No ItemDetail found matching image filename: ${itemDetailImageId}`
          );
          return null;
        }
      }
      // Search for matching image in imagesByColor
      for (const colorEntry of currentItemDetail.imagesByColor) {
        console.log(`  Checking color: "${colorEntry.color}"`);
        if (colorEntry.images && colorEntry.images.length > 0) {
        const imageEntry = colorEntry.images.find(
          (img) => img.itemDetailImageId === itemDetailImageId
        );
        if (imageEntry) {
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
        try {
            const uploadResult = await uploadMultipleImagesToS3([file], folderPath);
          matchedImageEntry.url = uploadResult[0];
            uploadedImageUrl = uploadResult[0];
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
      return result;
    });
    // Wait for all uploads to complete
    const allResults = await Promise.all(uploadPromises);
    uploadResults.push(
      ...allResults.filter((result) => result !== null)
    );
    // Handle errors
    if (errors.length > 0) {
      return res.status(400).json(
        apiResponse(400, false, "Some images could not be processed.", {
          errors,
          uploaded: uploadResults,
        })
      );
    }
    // Save updated item details
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
                  break;
                }
              }
            }
          }
          updatedItemDetails.add(detail);
        }
      }
    }
    // Log the URLs before saving to verify they're set
    Array.from(updatedItemDetails).forEach((detail, index) => {
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
        return saved;
      } catch (saveError) {
        console.error(`❌ [bulkUploadItemDetails] Failed to save ItemDetail ${detail._id}:`, saveError.message);
        throw saveError;
      }
    });
    const savedItemDetails = await Promise.all(savePromises);
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

exports.downloadItemDetailsCSVTemplate = async (req, res) => {
  try {
    // Read the CSV template file
    const fs = require('fs');
    const path = require('path');
    const templatePath = path.join(__dirname, '../../docs/item_details_csv_template.csv');
    
    if (!fs.existsSync(templatePath)) {
      return res.status(404).json(apiResponse(404, false, "CSV template file not found."));
    }

    const csvContent = fs.readFileSync(templatePath, 'utf8');
    
    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="item_details_template.csv"');
    
    return res.send(csvContent);
  } catch (error) {
    console.error("Error downloading CSV template:", error);
    return res.status(500).json(apiResponse(500, false, "Internal Server Error."));
  }
};