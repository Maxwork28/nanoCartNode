const mongoose = require("mongoose");
const Category = require("../../models/Category/Category");
const SubCategory = require("../../models/SubCategory/SubCategory");
const Item = require("../../models/Items/Item");
const ItemDetail = require("../../models/Items/Item");
const HomePageSection = require("../../models/HomePage/HomePageSection");
const {
  uploadImageToS3,
  uploadMultipleImagesToS3,
  deleteFromS3,
  updateFromS3,
} = require("../../utils/s3Upload");
const { apiResponse } = require("../../utils/apiResponse");

// Utility to normalize names for comparison
const normalizeName = (str) => str.replace(/\s+/g, "").toLowerCase();

// Utility to capitalize strings
const capitalize = (str) => str.trim().charAt(0).toUpperCase() + str.trim().slice(1).toLowerCase();

// CSV Parser utility
const parseCSV = (csvContent) => {
  try {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV must have at least a header row and one data row');
    }

    // Function to parse a CSV line properly handling quoted fields
    const parseCSVLine = (line) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            // Escaped quote
            current += '"';
            i++; // Skip next quote
          } else {
            // Toggle quote state
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          // Field separator
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      
      // Add the last field
      result.push(current.trim());
      return result;
    };

    const headers = parseCSVLine(lines[0]);
    const items = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Skip empty lines

      const values = parseCSVLine(line);
      if (values.length !== headers.length) {
        throw new Error(`Row ${i + 1} has ${values.length} values but header has ${headers.length} columns`);
      }

      const item = {};
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
        if (header === 'MRP' || header === 'totalStock' || header === 'discountedPrice' || header === 'userAverageRating') {
          if (value !== undefined && value !== '') {
            const numValue = Number(value);
            if (isNaN(numValue)) {
              throw new Error(`Row ${i + 1}: Invalid number for ${header}: ${value}`);
            }
            value = numValue;
          }
        }

        // Parse boolean fields
        if (header === 'isItemDetail') {
          if (value !== undefined && value !== '') {
            value = value.toLowerCase() === 'true' || value === '1';
          }
        }

        // Parse array fields (filters)
        if (header === 'filters' && value !== undefined && value !== '') {
          try {
            // Handle filters in format: "Brand:TechBrand|Material:Cotton"
            if (value.includes('|')) {
              value = value.split('|').map(filter => {
                const [key, val] = filter.split(':');
                return { key: key.trim(), value: val.trim() };
              });
            } else if (value.includes(':')) {
              // Single filter
              const [key, val] = value.split(':');
              value = [{ key: key.trim(), value: val.trim() }];
            } else {
              value = [];
            }
          } catch (err) {
            throw new Error(`Row ${i + 1}: Invalid filters format: ${value}`);
          }
        }

        item[header] = value;
      });

      items.push(item);
    }

    return items;
  } catch (error) {
    throw new Error(`CSV parsing error: ${error.message}`);
  }
};

// Utility to resolve category and subcategory names to IDs
const resolveCategoryNames = async (items) => {
  try {
    // Extract unique category and subcategory names
    const categoryNames = [...new Set(items.map(item => item.categoryName).filter(Boolean))];
    const subCategoryNames = [...new Set(items.map(item => item.subCategoryName).filter(Boolean))];

    // Fetch categories and subcategories by name
    const categories = await Category.find({ 
      name: { $in: categoryNames.map(name => new RegExp(`^${name}$`, 'i')) } 
    });
    const subCategories = await SubCategory.find({ 
      name: { $in: subCategoryNames.map(name => new RegExp(`^${name}$`, 'i')) } 
    });

    // Create lookup maps
    const categoryMap = new Map();
    categories.forEach(cat => {
      categoryMap.set(cat.name.toLowerCase(), cat._id.toString());
    });

    const subCategoryMap = new Map();
    subCategories.forEach(subCat => {
      subCategoryMap.set(subCat.name.toLowerCase(), {
        id: subCat._id.toString(),
        categoryId: subCat.categoryId.toString()
      });
    });

    // Resolve names to IDs and validate relationships
    const resolvedItems = [];
    const errors = [];

    for (let i = 0; i < items.length; i++) {
      const item = { ...items[i] };
      const rowNumber = i + 2; // +2 because CSV has header row and arrays are 0-indexed

      // Resolve category name to ID
      if (item.categoryName) {
        const categoryId = categoryMap.get(item.categoryName.toLowerCase());
        if (!categoryId) {
          errors.push(`Row ${rowNumber}: Category "${item.categoryName}" not found`);
          continue;
        }
        item.categoryId = categoryId;
        delete item.categoryName;
      }

      // Resolve subcategory name to ID
      if (item.subCategoryName) {
        const subCategoryInfo = subCategoryMap.get(item.subCategoryName.toLowerCase());
        if (!subCategoryInfo) {
          errors.push(`Row ${rowNumber}: Subcategory "${item.subCategoryName}" not found`);
          continue;
        }
        item.subCategoryId = subCategoryInfo.id;
        delete item.subCategoryName;

        // Validate that subcategory belongs to the specified category
        if (item.categoryId && subCategoryInfo.categoryId !== item.categoryId) {
          errors.push(`Row ${rowNumber}: Subcategory "${item.subCategoryName}" does not belong to the specified category`);
          continue;
        }
      }

      // If we have both IDs, validate the relationship
      if (item.categoryId && item.subCategoryId) {
        const subCategoryInfo = subCategoryMap.get(item.subCategoryName?.toLowerCase() || '');
        if (subCategoryInfo && subCategoryInfo.categoryId !== item.categoryId) {
          errors.push(`Row ${rowNumber}: Subcategory does not belong to the specified category`);
          continue;
        }
      }

      resolvedItems.push(item);
    }

    if (errors.length > 0) {
      throw new Error(`Validation errors:\n${errors.join('\n')}`);
    }

    return resolvedItems;
  } catch (error) {
    throw new Error(`Category resolution error: ${error.message}`);
  }
};

exports.createItem = async (req, res) => {
  try {
    const {
      name,
      MRP,
      totalStock,
      subCategoryId,
      categoryId,
      description,
      defaultColor,
      discountedPrice,
      filters,
      metaTitle,
      metaDescription,
      searchKeywords,
    } = req.body;

    // Validate required fields
    if (!name || !MRP || !totalStock || !subCategoryId || !categoryId || !defaultColor) {
      return res.status(400).json(
        apiResponse(400, false, "Name, MRP, totalStock, subCategoryId, categoryId, and defaultColor are required")
      );
    }

    // Validate numeric fields
    if (isNaN(Number(MRP)) || Number(MRP) < 0) {
      return res.status(400).json(apiResponse(400, false, "MRP must be a valid positive number"));
    }
    if (isNaN(Number(totalStock)) || Number(totalStock) < 0) {
      return res.status(400).json(apiResponse(400, false, "totalStock must be a valid positive number"));
    }
    if (discountedPrice === undefined || discountedPrice === null) {
      return res.status(400).json(apiResponse(400, false, "discountedPrice is mandatory"));
    }
    if (isNaN(Number(discountedPrice)) || Number(discountedPrice) < 0) {
      return res.status(400).json(apiResponse(400, false, "discountedPrice must be a valid positive number"));
    }
    if (Number(discountedPrice) > Number(MRP)) {
      return res.status(400).json(apiResponse(400, false, "discountedPrice cannot be greater than MRP"));
    }

    // Validate Category and SubCategory existence and relationship
    const [categoryDetails, subCategoryDetails] = await Promise.all([
      Category.findById(categoryId),
      SubCategory.findById(subCategoryId),
    ]);

    if (!categoryDetails) {
      return res.status(400).json(apiResponse(400, false, "Category not found"));
    }
    if (!subCategoryDetails) {
      return res.status(400).json(apiResponse(400, false, "SubCategory not found"));
    }
    if (subCategoryDetails.categoryId.toString() !== categoryId) {
      return res.status(400).json(
        apiResponse(400, false, `SubCategory ${subCategoryId} does not belong to Category ${categoryId}`)
      );
    }

    // Parse and validate filters
    let parsedFilters = [];
    if (filters) {
      parsedFilters = typeof filters === "string" ? JSON.parse(filters) : filters;
      if (!Array.isArray(parsedFilters)) {
        return res.status(400).json(apiResponse(400, false, "Filters must be an array"));
      }
      for (let i = 0; i < parsedFilters.length; i++) {
        const filter = parsedFilters[i];
        if (!filter.key || !filter.value || typeof filter.key !== "string" || typeof filter.value !== "string") {
          return res.status(400).json(
            apiResponse(400, false, "Each filter must have a non-empty key and value as strings")
          );
        }
        parsedFilters[i].key = capitalize(filter.key);
        parsedFilters[i].value = capitalize(filter.value);
      }
    }

    // Normalize and capitalize name and defaultColor
    const capitalName = capitalize(name);
    const capitalDefaultColor = capitalize(defaultColor);

    // Check for duplicate name
    const normalizedInputName = normalizeName(capitalName);
    const existingItem = await Item.findOne({ name: new RegExp(`^${normalizedInputName}$`, "i") });
    if (existingItem) {
      return res.status(400).json(apiResponse(400, false, "Item with this name already exists"));
    }

    const itemId = new mongoose.Types.ObjectId();

    // Upload image if provided (optional)
    let imageUrl = null;
    if (req.file) {
      imageUrl = await uploadImageToS3(
        req.file,
        `Nanocart/categories/${categoryId}/subCategories/${subCategoryId}/item/${itemId}`
      );
    }

    // Parse searchKeywords if provided
    let parsedSearchKeywords = [];
    if (searchKeywords) {
      if (typeof searchKeywords === "string") {
        try {
          parsedSearchKeywords = JSON.parse(searchKeywords);
        } catch {
          // If JSON parsing fails, treat as comma-separated string
          parsedSearchKeywords = searchKeywords.split(',').map(keyword => keyword.trim()).filter(keyword => keyword);
        }
      } else if (Array.isArray(searchKeywords)) {
        parsedSearchKeywords = searchKeywords.map(keyword => keyword.trim()).filter(keyword => keyword);
      }
    }

    // Create item
    const item = new Item({
      _id: itemId,
      name: capitalName,
      description: description || undefined,
      MRP: Number(MRP),
      totalStock: Number(totalStock),
      discountedPrice: Number(discountedPrice),
      categoryId,
      subCategoryId,
      filters: parsedFilters,
      image: imageUrl,
      defaultColor: capitalDefaultColor,
      metaTitle: metaTitle || undefined,
      metaDescription: metaDescription || undefined,
      searchKeywords: parsedSearchKeywords,
    });

    await item.save();
    return res.status(201).json(apiResponse(201, true, "Item created successfully", item));
  } catch (error) {
    console.error("Error creating item:", error.message);
    return res.status(500).json(apiResponse(500, false, error.message));
  }
};

exports.deleteItem = async (req, res) => {
  try {
    const { itemId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json(apiResponse(400, false, "Invalid Item ID"));
    }

    // Find item
    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json(apiResponse(404, false, "Item not found"));
    }

    // Delete item image from S3
    if (item.image) {
      await deleteFromS3(item.image);
    }

    // Delete related item details
    const itemDetails = await ItemDetail.find({ itemId });
    for (const itemDetail of itemDetails) {
      for (const colorObj of itemDetail.imagesByColor || []) {
        for (const image of colorObj.images || []) {
          await deleteFromS3(image.url);
        }
      }
    }
    await ItemDetail.deleteMany({ itemId });

    // Delete item
    await Item.findByIdAndDelete(itemId);

    return res.status(200).json(apiResponse(200, true, "Item and related item details deleted successfully"));
  } catch (error) {
    console.error("Error deleting item:", error.message);
    return res.status(500).json(apiResponse(500, false, error.message));
  }
};

exports.updateItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { name, description, MRP, totalStock, discountedPrice, defaultColor, itemImageId, categoryId, subCategoryId, metaTitle, metaDescription, searchKeywords } = req.body;
    let { filters } = req.body;

    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json(apiResponse(400, false, "Invalid Item ID"));
    }

    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json(apiResponse(404, false, "Item not found"));
    }

    // Validate Category and SubCategory if provided
    if (categoryId || subCategoryId) {
      const [categoryDetails, subCategoryDetails] = await Promise.all([
        categoryId ? Category.findById(categoryId) : Promise.resolve(null),
        subCategoryId ? SubCategory.findById(subCategoryId) : Promise.resolve(null),
      ]);

      if (categoryId && !categoryDetails) {
        return res.status(400).json(apiResponse(400, false, "Category not found"));
      }
      if (subCategoryId && !subCategoryDetails) {
        return res.status(400).json(apiResponse(400, false, "SubCategory not found"));
      }
      if (categoryId && subCategoryId && subCategoryDetails.categoryId.toString() !== categoryId) {
        return res.status(400).json(
          apiResponse(400, false, `SubCategory ${subCategoryId} does not belong to Category ${categoryId}`)
        );
      }
    }

    const newMRP = MRP !== undefined ? Number(MRP) : item.MRP;
    const newDiscountedPrice = discountedPrice !== undefined ? Number(discountedPrice) : item.discountedPrice;

    // Validate numeric fields
    if (MRP !== undefined && (isNaN(newMRP) || newMRP < 0)) {
      return res.status(400).json(apiResponse(400, false, "MRP must be a valid positive number"));
    }
    if (totalStock !== undefined && (isNaN(Number(totalStock)) || Number(totalStock) < 0)) {
      return res.status(400).json(apiResponse(400, false, "totalStock must be a valid positive number"));
    }
    if (discountedPrice !== undefined && (isNaN(newDiscountedPrice) || newDiscountedPrice < 0)) {
      return res.status(400).json(apiResponse(400, false, "discountedPrice must be a valid positive number"));
    }

    // Custom validation block
    if (MRP !== undefined && discountedPrice === undefined) {
      return res.status(400).json(apiResponse(400, false, "discountedPrice is mandatory when MRP is provided"));
    }
    if (MRP !== undefined && discountedPrice !== undefined && newDiscountedPrice > newMRP) {
      return res.status(400).json(apiResponse(400, false, "discountedPrice cannot be greater than MRP"));
    }
    if (MRP === undefined && discountedPrice !== undefined && newDiscountedPrice > item.MRP) {
      return res.status(400).json(apiResponse(400, false, "discountedPrice cannot be greater than existing MRP"));
    }

    // Update image if provided
    let newCategoryId = categoryId || item.categoryId;
    let newSubCategoryId = subCategoryId || item.subCategoryId;
    if (req.file && item.image) {
      const newImageUrl = await updateFromS3(
        item.image,
        req.file,
        `Nanocart/categories/${newCategoryId}/subCategories/${newSubCategoryId}/item/${itemId}`
      );
      item.image = newImageUrl;
    } else if (req.file) {
      const newImageUrl = await uploadImageToS3(
        req.file,
        `Nanocart/categories/${newCategoryId}/subCategories/${newSubCategoryId}/item/${itemId}`
      );
      item.image = newImageUrl;
    }

    if (name) {
      const normalizedInputName = normalizeName(capitalize(name));
      const existingItem = await Item.findOne({
        name: new RegExp(`^${normalizedInputName}$`, "i"),
        _id: { $ne: itemId },
      });
      if (existingItem) {
        return res.status(400).json(apiResponse(400, false, "Item with this name already exists"));
      }
      item.name = capitalize(name);
    }
    if (description) item.description = description;
    if (MRP !== undefined) item.MRP = newMRP;
    if (totalStock !== undefined) item.totalStock = Number(totalStock);
    if (discountedPrice !== undefined) item.discountedPrice = newDiscountedPrice;
    if (defaultColor) item.defaultColor = capitalize(defaultColor);
    if (itemImageId) item.itemImageId = itemImageId;
    if (categoryId) item.categoryId = categoryId;
    if (subCategoryId) item.subCategoryId = subCategoryId;
    if (metaTitle !== undefined) item.metaTitle = metaTitle;
    if (metaDescription !== undefined) item.metaDescription = metaDescription;
    
    // Handle searchKeywords update
    if (searchKeywords !== undefined) {
      let parsedSearchKeywords = [];
      if (searchKeywords) {
        if (typeof searchKeywords === "string") {
          try {
            parsedSearchKeywords = JSON.parse(searchKeywords);
          } catch {
            // If JSON parsing fails, treat as comma-separated string
            parsedSearchKeywords = searchKeywords.split(',').map(keyword => keyword.trim()).filter(keyword => keyword);
          }
        } else if (Array.isArray(searchKeywords)) {
          parsedSearchKeywords = searchKeywords.map(keyword => keyword.trim()).filter(keyword => keyword);
        }
      }
      item.searchKeywords = parsedSearchKeywords;
    }

    // Parse filters if provided
    if (typeof filters === "string") {
      try {
        filters = JSON.parse(filters);
      } catch {
        return res.status(400).json(apiResponse(400, false, "Invalid JSON format for filters"));
      }
    }

    if (Array.isArray(filters) && filters.length > 0) {
      for (let i = 0; i < filters.length; i++) {
        const filter = filters[i];
        if (!filter.key || !filter.value || typeof filter.key !== "string" || typeof filter.value !== "string") {
          return res.status(400).json(
            apiResponse(400, false, "Each filter must have a non-empty key and value as strings")
          );
        }
        filters[i].key = capitalize(filter.key.trim());
        filters[i].value = capitalize(filter.value.trim());
      }
      item.filters = filters;
    }

    await item.save();
    return res.status(200).json(apiResponse(200, true, "Item updated successfully", item));
  } catch (error) {
    console.error("Error updating item:", error.message);
    return res.status(500).json(apiResponse(500, false, error.message));
  }
};

exports.getAllItem = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const totalItems = await Item.countDocuments();

    if (totalItems === 0) {
      return res.status(404).json(apiResponse(404, false, "No items found"));
    }

    const items = await Item.find().skip(skip).limit(limit);

    res.status(200).json(
      apiResponse(200, true, "Items fetched successfully", {
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
        totalItems,
        items,
      })
    );
  } catch (error) {
    console.error("Error fetching items:", error.message);
    res.status(500).json(apiResponse(500, false, error.message));
  }
};

exports.getItemById = async (req, res) => {
  try {
    const { itemId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json(apiResponse(400, false, "Invalid Item ID"));
    }

    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json(apiResponse(404, false, "Item not found"));
    }

    res.status(200).json(apiResponse(200, true, "Item retrieved successfully", item));
  } catch (error) {
    console.error("Error fetching item:", error.message);
    res.status(500).json(apiResponse(500, false, error.message));
  }
};

exports.getItemByCategoryId = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json(apiResponse(400, false, "Invalid Category ID"));
    }

    const totalItems = await Item.countDocuments({ categoryId });

    if (totalItems === 0) {
      return res.status(404).json(apiResponse(404, false, "No items found for this category"));
    }

    const items = await Item.find({ categoryId }).skip(skip).limit(limit);

    res.status(200).json(
      apiResponse(200, true, "Items retrieved successfully", {
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
        totalItems,
        items,
      })
    );
  } catch (error) {
    console.error("Error fetching items by category:", error.message);
    res.status(500).json(apiResponse(500, false, error.message));
  }
};

exports.getItemBySubCategoryId = async (req, res) => {
  try {
    const { subcategoryId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    if (!mongoose.Types.ObjectId.isValid(subcategoryId)) {
      return res.status(400).json(apiResponse(400, false, "Invalid SubCategory ID"));
    }

    const totalItems = await Item.countDocuments({ subCategoryId: subcategoryId });

    if (totalItems === 0) {
      return res.status(404).json(apiResponse(404, false, "No items found for this subcategory"));
    }

    const items = await Item.find({ subCategoryId: subcategoryId }).skip(skip).limit(limit);

    res.status(200).json(
      apiResponse(200, true, "Items retrieved successfully", {
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
        totalItems,
        items,
      })
    );
  } catch (error) {
    console.error("Error fetching items by subcategory:", error.message);
    res.status(500).json(apiResponse(500, false, error.message));
  }
};

exports.getItemsByFilters = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const queryParams = { ...req.query };
    delete queryParams.page;
    delete queryParams.limit;

    const filterConditions = [];
    for (const [key, value] of Object.entries(queryParams)) {
      if (key && value) {
        filterConditions.push({
          filters: {
            $elemMatch: {
              key: key,
              value: value,
            },
          },
        });
      }
    }

    const query = filterConditions.length > 0 ? { $and: filterConditions } : {};

    const totalItems = await Item.countDocuments(query);
    const items = await Item.find(query).skip(skip).limit(limit);

    return res.status(200).json(
      apiResponse(200, true, "Items fetched successfully", {
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
        totalItems,
        items,
      })
    );
  } catch (error) {
    console.error("Error in getItemsByFilters:", error.message);
    res.status(500).json(apiResponse(500, false, error.message));
  }
};

exports.getSortedItems = async (req, res) => {
  try {
    const { sortBy, page = 1, limit = 10 } = req.query;

    const validSortOptions = ["latest", "popularity", "priceLowToHigh", "priceHighToLow", "offer"];
    if (sortBy && !validSortOptions.includes(sortBy)) {
      return res.status(400).json(apiResponse(400, false, "Invalid sortBy parameter"));
    }

    let sortOptions = {};
    switch (sortBy) {
      case "latest":
        sortOptions = { createdAt: -1 };
        break;
      case "popularity":
        sortOptions = { userAverageRating: -1 };
        break;
      case "priceLowToHigh":
        sortOptions = { MRP: 1 };
        break;
      case "priceHighToLow":
        sortOptions = { MRP: -1 };
        break;
      case "offer":
        sortOptions = { discountPercentage: -1 };
        break;
      default:
        sortOptions = { createdAt: -1 };
    }

    const items = await Item.find()
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .select("name MRP discountedPrice discountPercentage image userAverageRating")
      .lean();

    return res.status(200).json(
      apiResponse(200, true, "Items fetched successfully", {
        count: items.length,
        page: Number(page),
        limit: Number(limit),
        items,
      })
    );
  } catch (error) {
    console.error("Error in getSortedItems:", error.message);
    const message = error.name === "MongoNetworkError" ? "Database connection error" : "Server error while fetching sorted items";
    return res.status(500).json(apiResponse(500, false, message));
  }
};

const buildSearchRegex = (input) => {
  const sanitized = input.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${sanitized}\\b`, "i");
};

exports.searchItems = async (req, res) => {
  try {
    const {
      keyword,
      category,
      subCategory,
      minPrice,
      maxPrice,
      color,
      size,
      fabric,
      occasion,
      pattern,
      type,
      border,
      rating,
      page = 1,
      limit = 10,
    } = req.query;

    const query = {};

    if (minPrice && isNaN(minPrice)) {
      return res.status(400).json(apiResponse(400, false, "Invalid minPrice parameter"));
    }
    if (maxPrice && isNaN(maxPrice)) {
      return res.status(400).json(apiResponse(400, false, "Invalid maxPrice parameter"));
    }
    if (rating && (isNaN(rating) || rating < 0 || rating > 5)) {
      return res.status(400).json(apiResponse(400, false, "Invalid rating parameter (must be between 0 and 5)"));
    }

    if (keyword && keyword.trim()) {
      const regex = buildSearchRegex(keyword.trim());
      query.$or = [
        { name: { $regex: regex } },
        { description: { $regex: regex } },
        { "filters.value": { $regex: regex } },
      ];
    }

    if (category && mongoose.Types.ObjectId.isValid(category)) {
      query.categoryId = category;
    }
    if (subCategory && mongoose.Types.ObjectId.isValid(subCategory)) {
      query.subCategoryId = subCategory;
    }

    if (minPrice || maxPrice) {
      query.discountedPrice = {};
      if (minPrice) query.discountedPrice.$gte = Number(minPrice);
      if (maxPrice) query.discountedPrice.$lte = Number(maxPrice);
    }

    const filterConditions = [];
    if (color) filterConditions.push({ $elemMatch: { key: "Color", value: new RegExp(`\\b${color}\\b`, "i") } });
    if (size) filterConditions.push({ $elemMatch: { key: "Size", value: new RegExp(`\\b${size}\\b`, "i") } });
    if (fabric) filterConditions.push({ $elemMatch: { key: "Fabric", value: new RegExp(`\\b${fabric}\\b`, "i") } });
    if (occasion) filterConditions.push({ $elemMatch: { key: "Occasion", value: new RegExp(`\\b${occasion}\\b`, "i") } });
    if (pattern) filterConditions.push({ $elemMatch: { key: "Pattern", value: new RegExp(`\\b${pattern}\\b`, "i") } });
    if (type) filterConditions.push({ $elemMatch: { key: "Type", value: new RegExp(`\\b${type}\\b`, "i") } });
    if (border) filterConditions.push({ $elemMatch: { key: "Border", value: new RegExp(`\\b${border}\\b`, "i") } });

    if (filterConditions.length > 0) {
      query.filters = { $and: filterConditions };
    }

    if (rating) {
      query.userAverageRating = { $gte: Number(rating) };
    }

    const items = await Item.find(query)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .select("name MRP discountedPrice discountPercentage image userAverageRating filters")
      .lean();

    return res.status(200).json(
      apiResponse(200, true, "Items fetched successfully", {
        count: items.length,
        page: Number(page),
        limit: Number(limit),
        items,
      })
    );
  } catch (error) {
    console.error("Search error:", error.message);
    const message = error.name === "MongoNetworkError" ? "Database connection error" : "Server error during item search";
    return res.status(500).json(apiResponse(500, false, message));
  }
};

exports.bulkUploadItemsFromFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json(apiResponse(400, false, "No file uploaded."));
    }

    // Determine file type (JSON or CSV)
    const fileContent = req.file.buffer.toString("utf-8");
    let items;

    if (req.file.originalname.endsWith('.csv')) {
      try {
        items = parseCSV(fileContent);
      } catch (err) {
        return res.status(400).json(apiResponse(400, false, `CSV parsing error: ${err.message}`));
      }
    } else {
      try {
        items = JSON.parse(fileContent);
      } catch (err) {
        return res.status(400).json(apiResponse(400, false, "Invalid JSON format."));
      }
    }

    if (!Array.isArray(items)) {
      return res.status(400).json(apiResponse(400, false, "JSON or CSV should be an array of items."));
    }

    // Resolve category and subcategory names to IDs if they exist
    let resolvedItems = items;
    if (items.some(item => item.categoryName || item.subCategoryName)) {
      try {
        resolvedItems = await resolveCategoryNames(items);
      } catch (error) {
        return res.status(400).json(apiResponse(400, false, error.message));
      }
    }

    // Validate required fields and IDs
    const categoryIds = [...new Set(resolvedItems.map((item) => item.categoryId))];
    const subCategoryIds = [...new Set(resolvedItems.map((item) => item.subCategoryId))];

    // Check if all categoryIds exist
    const categories = await Category.find({ _id: { $in: categoryIds } });
    const validCategoryIds = new Set(categories.map((cat) => cat._id.toString()));
    for (const item of resolvedItems) {
      if (!validCategoryIds.has(item.categoryId)) {
        return res.status(400).json(apiResponse(400, false, `Invalid categoryId: ${item.categoryId}`));
      }
    }

    // Check if all subCategoryIds exist and belong to the specified categoryId
    const subCategories = await SubCategory.find({ _id: { $in: subCategoryIds } });
    const validSubCategoryIds = new Set(subCategories.map((subCat) => subCat._id.toString()));
    for (const item of resolvedItems) {
      if (!validSubCategoryIds.has(item.subCategoryId)) {
        return res.status(400).json(apiResponse(400, false, `Invalid subCategoryId: ${item.subCategoryId}`));
      }
      const subCategory = subCategories.find((subCat) => subCat._id.toString() === item.subCategoryId);
      if (!subCategory || subCategory.categoryId.toString() !== item.categoryId) {
        return res.status(400).json(
          apiResponse(400, false, `subCategoryId ${item.subCategoryId} does not belong to categoryId ${item.categoryId}`)
        );
      }
    }

    // Validate required fields for each item
    for (const item of resolvedItems) {
      console.log(item);
      if (!item.name || !item.MRP || !item.totalStock || !item.categoryId || !item.subCategoryId || !item.itemImageId) {
        return res.status(400).json(
          apiResponse(400, false, "Each item must have name, MRP, totalStock, categoryId, subCategoryId, and itemImageId.")
        );
      }
      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(item.categoryId) || !mongoose.Types.ObjectId.isValid(item.subCategoryId)) {
        return res.status(400).json(
          apiResponse(400, false, `Invalid ObjectId format for categoryId or subCategoryId in item: ${item.name}`)
        );
      }
      // Validate numeric fields
      if (isNaN(Number(item.MRP)) || Number(item.MRP) < 0) {
        return res.status(400).json(apiResponse(400, false, `Invalid MRP for item: ${item.name}`));
      }
      if (isNaN(Number(item.totalStock)) || Number(item.totalStock) < 0) {
        return res.status(400).json(apiResponse(400, false, `Invalid totalStock for item: ${item.name}`));
      }
      if (item.discountedPrice && (isNaN(Number(item.discountedPrice)) || Number(item.discountedPrice) < 0)) {
        return res.status(400).json(apiResponse(400, false, `Invalid discountedPrice for item: ${item.name}`));
      }
      if (item.discountedPrice && Number(item.discountedPrice) > Number(item.MRP)) {
        return res.status(400).json(
          apiResponse(400, false, `discountedPrice cannot be greater than MRP for item: ${item.name}`)
        );
      }
    }

    // Insert all items into DB
    const insertedItems = await Item.insertMany(resolvedItems, { ordered: false });

    return res.status(201).json(
      apiResponse(201, true, `${insertedItems.length} items uploaded successfully.`, { items: insertedItems })
    );
  } catch (error) {
    console.error("Bulk Upload Error:", error);
    if (error.name === "MongoBulkWriteError" && error.code === 11000) {
      return res.status(400).json(apiResponse(400, false, "Duplicate item detected. Check name or itemImageId."));
    }
    return res.status(500).json(apiResponse(500, false, "Internal Server Error."));
  }
};

exports.bulkUploadItemImages = async (req, res) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json(apiResponse(400, false, "No image files uploaded."));
    }

    // Validate file mimetypes
    const validMimetypes = ["image/jpeg", "image/png", "image/webp"];
    for (const file of req.files) {
      if (!validMimetypes.includes(file.mimetype)) {
        return res.status(400).json(
          apiResponse(400, false, `Invalid file type for ${file.originalname}. Only JPEG, PNG, or WebP allowed.`)
        );
      }
    }

    // Extract itemImageId from each file's originalname (without extension)
    const imageData = req.files.map((file) => {
      const itemImageId = file.originalname.split(".")[0];
      return { file, itemImageId };
    });

    // Find items in the database matching the itemImageIds
    const itemImageIds = imageData.map((data) => data.itemImageId);
    const items = await Item.find({ itemImageId: { $in: itemImageIds } });

    // Map files to their corresponding items and construct folderName
    const filesToUpload = imageData
      .filter((data) => items.some((item) => item.itemImageId === data.itemImageId))
      .map((data) => {
        const item = items.find((item) => item.itemImageId === data.itemImageId);
        return {
          file: data.file,
          folderName: `Nanocart/categories/${item.categoryId}/subCategories/${item.subCategoryId}/item/${item._id}`,
        };
      });

    // Check if any files were matched
    if (filesToUpload.length === 0) {
      return res.status(400).json(apiResponse(400, false, "No uploaded files match any items in the database."));
    }

    // Upload images to S3
    const uploadPromises = filesToUpload.map(({ file, folderName }) =>
      uploadMultipleImagesToS3([file], folderName)
    );
    const uploadResults = await Promise.all(uploadPromises);
    const imageUrls = uploadResults.flat();

    // Update items with S3 URLs
    const updatePromises = imageData.map(async (data, index) => {
      const item = items.find((item) => item.itemImageId === data.itemImageId);
      if (item) {
        item.image = imageUrls[index];
        await item.save();
        return { itemImageId: data.itemImageId, imageUrl: imageUrls[index] };
      }
    });

    const updatedItems = await Promise.all(updatePromises);

    return res.status(200).json(
      apiResponse(200, true, `${updatedItems.filter((item) => item).length} images uploaded and items updated successfully.`, {
        items: updatedItems.filter((item) => item),
      })
    );
  } catch (error) {
    console.error("Bulk Image Upload Error:", error);
    return res.status(500).json(apiResponse(500, false, "Internal Server Error."));
  }
};

exports.findItems = async (req, res) => {
  try {
    // Log incoming request body
    console.log('📥 Request body:', JSON.stringify(req.body, null, 2));

    const {
      categoryId,
      subCategoryId,
      categoryIds, // Array of category IDs
      subCategoryIds, // Array of subcategory IDs
      specificItems, // Array of specific item IDs
      filters = [], // Default to empty array to ensure no filters initially
      name,
      keyword,
      sortBy = 'latestAddition', // Default sorting
      page = 1, // Default to page 1
      limit = 10, // Default to 10 items per page
    } = req.body;

    // Log extracted parameters
    console.log('🛠️ Parameters:', {
      categoryId,
      subCategoryId,
      categoryIds,
      subCategoryIds,
      specificItems,
      filters,
      name,
      keyword,
      sortBy,
      page,
      limit,
    });

    // Build the query object
    let query = {};

    // Add categoryId to query if provided
    if (categoryId) {
      query.categoryId = categoryId;
      console.log('✅ Added categoryId to query:', categoryId);
    }

    // Add categoryIds to query if provided (array of category IDs)
    if (categoryIds && Array.isArray(categoryIds) && categoryIds.length > 0) {
      query.categoryId = { $in: categoryIds };
      console.log('✅ Added categoryIds to query:', categoryIds);
    }

    // Add subCategoryId to query if provided
    if (subCategoryId) {
      query.subCategoryId = subCategoryId;
      console.log('✅ Added subCategoryId to query:', subCategoryId);
    }

    // Add subCategoryIds to query if provided (array of subcategory IDs)
    if (subCategoryIds && Array.isArray(subCategoryIds) && subCategoryIds.length > 0) {
      query.subCategoryId = { $in: subCategoryIds };
      console.log('✅ Added subCategoryIds to query:', subCategoryIds);
    }

    // Add specificItems to query if provided (array of specific item IDs)
    if (specificItems && Array.isArray(specificItems) && specificItems.length > 0) {
      query._id = { $in: specificItems };
      console.log('✅ Added specificItems to query:', specificItems);
    }

    // Handle filters, including price range
    if (filters && Array.isArray(filters) && filters.length > 0) {
      // Group filters by key to implement OR logic within each filter type
      const filterGroups = {};
      
      filters.forEach(filter => {
        if (!filterGroups[filter.key]) {
          filterGroups[filter.key] = [];
        }
        filterGroups[filter.key].push(filter);
      });

      // Create filter conditions with OR logic within each group
      const filterConditions = Object.entries(filterGroups).map(([key, groupFilters]) => {
        if (key === 'Price range') {
          // Handle price range filters - for now, use the first valid price range
          // Price ranges are typically exclusive, so we'll use the first one
          const firstFilter = groupFilters[0];
          if (firstFilter && firstFilter.value) {
            const match = firstFilter.value.match(/₹(\d+)\s*-\s*₹(\d+)/);
            if (match) {
              const [, min, max] = match;
              console.log('💰 Parsed price range:', { min: Number(min), max: Number(max) });
              return { 
                filters: { 
                  $elemMatch: { 
                    key: firstFilter.key, 
                    value: { $gte: Number(min), $lte: Number(max) } 
                  } 
                } 
              };
            } else {
              console.warn('⚠️ Invalid price range format:', firstFilter.value);
              return { 
                filters: { 
                  $elemMatch: { 
                    key: firstFilter.key, 
                    value: firstFilter.value 
                  } 
                } 
              };
            }
          }
          return null;
        } else {
          // Handle other filters with OR logic - use $in for multiple values of same key
          const values = groupFilters.map(filter => {
            console.log('🔍 Adding filter:', filter);
            return filter.value;
          });
          
          return { 
            filters: { 
              $elemMatch: { 
                key: key, 
                value: { $in: values } 
              } 
            } 
          };
        }
      });

      // Use AND logic between different filter types, OR logic within each type
      if (filterConditions.length > 1) {
        query.$and = filterConditions;
      } else {
        Object.assign(query, filterConditions[0]);
      }
      
      console.log('✅ Added filters to query:', JSON.stringify(query, null, 2));
      console.log('🔍 Filter conditions created:', filterConditions.length);
    } else {
      console.log('ℹ️ No filters applied (filters array is empty)');
    }

    // Add name to query if provided (case-insensitive partial match)
    if (name) {
      query.name = { $regex: name, $options: 'i' };
      console.log('✅ Added name to query:', name);
    }

    // Add keyword search for name and description if provided
    if (keyword) {
      query.$text = { $search: keyword };
      console.log('✅ Added keyword to query:', keyword);
    }

    // Log final query
    console.log('🔎 Final MongoDB query:', JSON.stringify(query, null, 2));

    // Define sorting options
    const sortOptions = {
      latestAddition: { createdAt: -1 }, // Newest first
      popularity: { userAverageRating: -1 }, // Highest rated first
      priceHighToLow: { discountedPrice: -1 }, // Highest price first
      priceLowToHigh: { discountedPrice: 1 }, // Lowest price first
      offer: { discountPercentage: -1 }, // Highest discount first
    };

    // Validate sortBy parameter
    const validSortBy = sortOptions[sortBy] ? sortBy : 'latestAddition';
    console.log('🗂️ Selected sortBy:', validSortBy, 'Sort options:', sortOptions[validSortBy]);

    // Handle filter options request (when filters array is empty and no items are needed)
    if (filters.length === 0 && !name && !keyword && limit === 1) {
      console.log('ℹ️ Fetching filter options (minimal request detected)');
      // Mock filter options (replace with actual logic to fetch filter metadata)
      const filterOptions = [
        { key: 'Color', values: ['Red', 'Blue', 'Green'] },
        { key: 'Occasion', values: ['Casual', 'Formal', 'Party'] },
        { key: 'Price range', values: [] }, // Added to match frontend expectation
      ];
      console.log('📋 Returning filter options:', JSON.stringify(filterOptions, null, 2));
      return res.status(200).json({
        success: true,
        data: { filters: filterOptions },
      });
    }

    // Calculate pagination
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;
    console.log('📄 Pagination:', { page: pageNum, limit: limitNum, skip });

    // Get total count for pagination
    const totalItems = await Item.countDocuments(query);
    const totalPages = Math.ceil(totalItems / limitNum);
    console.log('📊 Total items:', totalItems, 'Total pages:', totalPages);

    // Execute the query with pagination
    const items = await Item.find(query)
      .populate('categoryId', 'name')
      .populate('subCategoryId', 'name')
      .sort(sortOptions[validSortBy])
      .skip(skip)
      .limit(limitNum)
      .lean();

    console.log('✅ Retrieved items:', items.length, 'Items:', JSON.stringify(items, null, 2));

    // Send response
    res.status(200).json({
      success: true,
      data: {
        items,
        currentPage: pageNum,
        totalPages,
        totalItems,
      },
    });
  } catch (error) {
    console.error('❌ Error finding items:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Error fetching items',
      error: error.message,
    });
  }
};

// Add existing items to section from CSV (by item names)
exports.addExistingItemsToSection = async (req, res) => {
  console.log("addExistingItemsToSection");
  try {
    const { sectionId } = req.params;
    
    if (!req.file) {
      return res.status(400).json(apiResponse(400, false, "CSV file is required"));
    }

    // Parse CSV file to get item names
    const fileContent = req.file.buffer.toString("utf-8");
    let itemNames;
    
    try {
      const parsedData = parseCSV(fileContent);
      // Extract item names from CSV
      itemNames = parsedData.map(item => item.name).filter(name => name && name.trim());
    } catch (err) {
      return res.status(400).json(apiResponse(400, false, `CSV parsing error: ${err.message}`));
    }

    if (!itemNames || itemNames.length === 0) {
      return res.status(400).json(apiResponse(400, false, "No valid item names found in CSV"));
    }

    // Find existing items by names
    const existingItems = await Item.find({ 
      name: { $in: itemNames } 
    }).populate('categoryId subCategoryId');

    if (existingItems.length === 0) {
      return res.status(404).json(apiResponse(404, false, "No existing items found with the provided names"));
    }

    // Get the section
    const section = await HomePageSection.findById(sectionId);
    
    if (!section) {
      return res.status(404).json(apiResponse(404, false, "Section not found"));
    }

    // Extract item IDs, category IDs, and subcategory IDs
    const itemIds = existingItems.map(item => item._id);
    const categoryIds = existingItems
      .map(item => item.categoryId?._id)
      .filter(id => id); // Remove null/undefined
    const subcategoryIds = existingItems
      .map(item => item.subCategoryId?._id)
      .filter(id => id); // Remove null/undefined

    // Remove duplicates
    const uniqueItemIds = [...new Set(itemIds)];
    const uniqueCategoryIds = [...new Set(categoryIds)];
    const uniqueSubcategoryIds = [...new Set(subcategoryIds)];

    // Update section with new items, categories, and subcategories
    const updateData = {
      "dataConfig.items": [...new Set([...(section.dataConfig.items || []), ...uniqueItemIds])],
      "dataConfig.categories": [...new Set([...(section.dataConfig.categories || []), ...uniqueCategoryIds])],
      "dataConfig.subcategories": [...new Set([...(section.dataConfig.subcategories || []), ...uniqueSubcategoryIds])]
    };

    await HomePageSection.findByIdAndUpdate(sectionId, {
      $set: updateData
    });

    // Find items that weren't found
    const foundItemNames = existingItems.map(item => item.name);
    const notFoundItems = itemNames.filter(name => !foundItemNames.includes(name));

    const responseMessage = `Successfully added ${existingItems.length} existing items to the section.`;
    const notFoundMessage = notFoundItems.length > 0 ? ` Items not found: ${notFoundItems.join(', ')}` : '';

    return res.status(200).json(apiResponse(200, true, responseMessage + notFoundMessage, {
      addedItems: existingItems.length,
      addedCategories: uniqueCategoryIds.length,
      addedSubcategories: uniqueSubcategoryIds.length,
      notFoundItems: notFoundItems,
      items: existingItems.map(item => ({
        name: item.name,
        category: item.categoryId?.name || 'No category',
        subcategory: item.subCategoryId?.name || 'No subcategory'
      }))
    }));

  } catch (error) {
    console.error('Error adding existing items to section:', error.message);
    return res.status(500).json(apiResponse(500, false, 'Internal server error while adding items to section'));
  }
};

// Download CSV template for existing items
exports.downloadExistingItemsTemplate = async (req, res) => {
  console.log("downloadExistingItemsTemplate");
  try {
    console.log('📥 Downloading existing items template...');
    
    // Get all items from the database (limit to 50 for template)
    const sampleItems = await Item.find({}).limit(50).select('name').sort({ createdAt: -1 });
    
    console.log(`📊 Found ${sampleItems.length} items in database`);
    
    let csvContent = 'name\n';
    
    if (sampleItems.length > 0) {
      console.log('📝 Adding actual item names to template:');
      sampleItems.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.name}`);
        csvContent += `"${item.name}"\n`;
      });
    } else {
      console.log('⚠️ No items found in database, using example names');
      // If no items exist, provide example names
      csvContent += `"Classic Cotton T-Shirt"\n`;
      csvContent += `"Formal Business Shirt"\n`;
      csvContent += `"Slim Fit Jeans"\n`;
      csvContent += `"Elegant Evening Dress"\n`;
      csvContent += `"Casual Summer Top"\n`;
      csvContent += `"A-Line Skirt"\n`;
      csvContent += `"Kids Cartoon T-Shirt"\n`;
      csvContent += `"Princess Dress for Girls"\n`;
      csvContent += `"Limited Edition Hoodie"\n`;
      csvContent += `"Designer Handbag"\n`;
    }

    console.log('📤 Sending CSV template with', sampleItems.length > 0 ? sampleItems.length : 10, 'items');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="existing_items_template.csv"');
    res.send(csvContent);
  } catch (error) {
    console.error('❌ Error downloading existing items template:', error.message);
    return res.status(500).json(apiResponse(500, false, 'Internal server error while downloading template'));
  }
};