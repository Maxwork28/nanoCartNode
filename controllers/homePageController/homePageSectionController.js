const HomePageSection = require("../../models/HomePage/HomePageSection");
const Item = require("../../models/Items/Item");
const Category = require("../../models/Category/Category");
const SubCategory = require("../../models/SubCategory/SubCategory");
const { apiResponse } = require("../../utils/apiResponse");

// Create a new homepage section
exports.createHomePageSection = async (req, res) => {
  try {
    const sectionData = req.body;
    
    // Check if section with same name already exists
    const existingSection = await HomePageSection.findOne({ 
      sectionName: sectionData.sectionName 
    });
    
    if (existingSection) {
      return res.status(409).json(
        apiResponse(409, false, "Homepage section with this name already exists")
      );
    }

    const section = new HomePageSection(sectionData);
    await section.save();

    return res.status(201).json(
      apiResponse(201, true, "Homepage section created successfully", { section })
    );
  } catch (error) {
    console.error("Error creating homepage section:", error.message);
    return res.status(500).json(apiResponse(500, false, error.message));
  }
};

// Get all homepage sections
exports.getAllHomePageSections = async (req, res) => {
  try {
    const sections = await HomePageSection.find().sort({ displayOrder: 1 });
    res.status(200).json(apiResponse(200, true, "Homepage sections retrieved successfully", sections));
  } catch (error) {
    console.error("Error fetching homepage sections:", error.message);
    return res.status(500).json(apiResponse(500, false, error.message));
  }
};

// Get homepage section by name
exports.getHomePageSectionByName = async (req, res) => {
  try {
    const { sectionName } = req.params;
    const section = await HomePageSection.getSectionByName(sectionName);
    
    if (!section) {
      return res.status(404).json(
        apiResponse(404, false, "Homepage section not found")
      );
    }
    
    res.status(200).json(apiResponse(200, true, "Homepage section retrieved successfully", section));
  } catch (error) {
    console.error("Error fetching homepage section:", error.message);
    return res.status(500).json(apiResponse(500, false, error.message));
  }
};

// Update homepage section
exports.updateHomePageSection = async (req, res) => {
  try {
    const { sectionId } = req.params;
    const updateData = req.body;
    
    const section = await HomePageSection.findByIdAndUpdate(
      sectionId,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!section) {
      return res.status(404).json(
        apiResponse(404, false, "Homepage section not found")
      );
    }
    
    res.status(200).json(apiResponse(200, true, "Homepage section updated successfully", section));
  } catch (error) {
    console.error("Error updating homepage section:", error.message);
    return res.status(500).json(apiResponse(500, false, error.message));
  }
};

// Delete homepage section
exports.deleteHomePageSection = async (req, res) => {
  try {
    const { sectionId } = req.params;
    
    const section = await HomePageSection.findByIdAndDelete(sectionId);
    
    if (!section) {
      return res.status(404).json(
        apiResponse(404, false, "Homepage section not found")
      );
    }
    
    res.status(200).json(apiResponse(200, true, "Homepage section deleted successfully"));
  } catch (error) {
    console.error("Error deleting homepage section:", error.message);
    return res.status(500).json(apiResponse(500, false, error.message));
  }
};

// Get items for a specific homepage section based on its configuration
exports.getSectionItems = async (req, res) => {
  try {
    const { sectionName } = req.params;
    const { 
      filters: queryFilters, 
      sortBy: querySortBy, 
      page = 1, 
      limit 
    } = req.query;
    
    const section = await HomePageSection.getSectionByName(sectionName);
    
    if (!section) {
      return res.status(404).json(
        apiResponse(404, false, "Homepage section not found")
      );
    }

    const { dataConfig } = section;
    
    // Prepare request body for findItems function
    const findItemsBody = {
      categoryId: dataConfig.categories && dataConfig.categories.length > 0 ? dataConfig.categories[0] : null,
      subCategoryId: dataConfig.subcategories && dataConfig.subcategories.length > 0 ? dataConfig.subcategories[0] : null,
      filters: queryFilters ? JSON.parse(queryFilters) : [],
      sortBy: querySortBy || dataConfig.sortBy || 'latestAddition',
      page: parseInt(page),
      limit: parseInt(limit) || dataConfig.itemLimit || 8
    };

    // If multiple categories/subcategories, we'll need to handle them differently
    if (dataConfig.categories && dataConfig.categories.length > 1) {
      findItemsBody.categoryIds = dataConfig.categories;
    }
    if (dataConfig.subcategories && dataConfig.subcategories.length > 1) {
      findItemsBody.subCategoryIds = dataConfig.subcategories;
    }

    // Add specific items if configured
    if (dataConfig.items && dataConfig.items.length > 0) {
      findItemsBody.specificItems = dataConfig.items;
    }

    console.log(`🔍 Homepage section ${sectionName} - findItems request:`, findItemsBody);

    // Create a mock request object for findItems
    const mockReq = {
      body: findItemsBody
    };

    // Create a mock response object to capture the result
    let findItemsResult = null;
    const mockRes = {
      status: (code) => ({
        json: (data) => {
          findItemsResult = { statusCode: code, data };
        }
      })
    };

    // Import and call the findItems function
    const { findItems } = require('../itemController/item');
    await findItems(mockReq, mockRes);

    if (!findItemsResult || !findItemsResult.data.success) {
      return res.status(500).json(
        apiResponse(500, false, "Error fetching section items")
      );
    }

    const { items, currentPage, totalPages, totalItems } = findItemsResult.data.data;

    return res.status(200).json(
      apiResponse(200, true, `Items for ${sectionName} section retrieved successfully`, {
        section: {
          _id: section._id,
          sectionName: section.sectionName,
          title: section.title,
          subtitle: section.subtitle,
          description: section.description,
          campaign: section.campaign,
          theme: section.theme
        },
        items,
        totalItems,
        currentPage,
        totalPages,
        config: {
          appliedFilters: queryFilters ? JSON.parse(queryFilters) : [],
          sortBy: findItemsBody.sortBy,
          limit: findItemsBody.limit
        }
      })
    );

  } catch (error) {
    console.error("Error fetching section items:", error.message);
    return res.status(500).json(
      apiResponse(500, false, "Error fetching section items", { error: error.message })
    );
  }
};

// Toggle section active status
exports.toggleSectionStatus = async (req, res) => {
  try {
    const { sectionId } = req.params;

    const section = await HomePageSection.findById(sectionId);
    
    if (!section) {
      return res.status(404).json(
        apiResponse(404, false, "Homepage section not found")
      );
    }

    section.isActive = !section.isActive;
    await section.save();

    res.status(200).json(
      apiResponse(200, true, `Section ${section.isActive ? 'activated' : 'deactivated'} successfully`, section)
    );
  } catch (error) {
    console.error("Error toggling section status:", error.message);
    return res.status(500).json(apiResponse(500, false, error.message));
  }
};

// Update section display order
exports.updateSectionOrder = async (req, res) => {
  try {
    const { sections } = req.body; // Array of { sectionId, displayOrder }
    
    const updatePromises = sections.map(({ sectionId, displayOrder }) =>
      HomePageSection.findByIdAndUpdate(sectionId, { displayOrder })
    );
    
    await Promise.all(updatePromises);
    
    res.status(200).json(apiResponse(200, true, "Section order updated successfully"));
  } catch (error) {
    console.error("Error updating section order:", error.message);
    return res.status(500).json(apiResponse(500, false, error.message));
  }
};

// Remove items from all homepage sections (but keep items in database)
exports.removeItemsFromAllSections = async (req, res) => {
  try {
    const { itemIds } = req.body; // Array of item IDs to remove from sections
    
    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json(apiResponse(400, false, "Item IDs array is required"));
    }

    // Remove items from all homepage sections
    const result = await HomePageSection.updateMany(
      {},
      { $pull: { "dataConfig.items": { $in: itemIds } } }
    );

    console.log(`✅ Removed ${itemIds.length} items from ${result.modifiedCount} homepage sections`);

    return res.status(200).json(apiResponse(200, true, 
      `Successfully removed ${itemIds.length} items from ${result.modifiedCount} homepage sections. Items remain in database.`));
  } catch (error) {
    console.error('Error removing items from homepage sections:', error.message);
    return res.status(500).json(apiResponse(500, false, 'Internal server error while removing items from sections'));
  }
};

// Remove categories from all homepage sections (but keep categories in database)
exports.removeCategoriesFromAllSections = async (req, res) => {
  try {
    const { categoryIds } = req.body; // Array of category IDs to remove from sections
    
    if (!categoryIds || !Array.isArray(categoryIds) || categoryIds.length === 0) {
      return res.status(400).json(apiResponse(400, false, "Category IDs array is required"));
    }

    // Remove categories from all homepage sections
    const result = await HomePageSection.updateMany(
      {},
      { $pull: { "dataConfig.categories": { $in: categoryIds } } }
    );

    console.log(`✅ Removed ${categoryIds.length} categories from ${result.modifiedCount} homepage sections`);

    return res.status(200).json(apiResponse(200, true, 
      `Successfully removed ${categoryIds.length} categories from ${result.modifiedCount} homepage sections. Categories remain in database.`));
  } catch (error) {
    console.error('Error removing categories from homepage sections:', error.message);
    return res.status(500).json(apiResponse(500, false, 'Internal server error while removing categories from sections'));
  }
};

// Remove subcategories from all homepage sections (but keep subcategories in database)
exports.removeSubCategoriesFromAllSections = async (req, res) => {
  try {
    const { subcategoryIds } = req.body; // Array of subcategory IDs to remove from sections
    
    if (!subcategoryIds || !Array.isArray(subcategoryIds) || subcategoryIds.length === 0) {
      return res.status(400).json(apiResponse(400, false, "Subcategory IDs array is required"));
    }

    // Remove subcategories from all homepage sections
    const result = await HomePageSection.updateMany(
      {},
      { $pull: { "dataConfig.subcategories": { $in: subcategoryIds } } }
    );

    console.log(`✅ Removed ${subcategoryIds.length} subcategories from ${result.modifiedCount} homepage sections`);

    return res.status(200).json(apiResponse(200, true, 
      `Successfully removed ${subcategoryIds.length} subcategories from ${result.modifiedCount} homepage sections. Subcategories remain in database.`));
  } catch (error) {
    console.error('Error removing subcategories from homepage sections:', error.message);
    return res.status(500).json(apiResponse(500, false, 'Internal server error while removing subcategories from sections'));
  }
};

// Clear all items from all homepage sections (but keep items in database)
exports.clearAllItemsFromSections = async (req, res) => {
  try {
    // Clear items from all homepage sections
    const result = await HomePageSection.updateMany(
      {},
      { $set: { "dataConfig.items": [] } }
    );

    console.log(`✅ Cleared all items from ${result.modifiedCount} homepage sections`);

    return res.status(200).json(apiResponse(200, true, 
      `Successfully cleared all items from ${result.modifiedCount} homepage sections. Items remain in database.`));
  } catch (error) {
    console.error('Error clearing items from homepage sections:', error.message);
    return res.status(500).json(apiResponse(500, false, 'Internal server error while clearing items from sections'));
  }
};

// Clear all categories from all homepage sections (but keep categories in database)
exports.clearAllCategoriesFromSections = async (req, res) => {
  try {
    // Clear categories from all homepage sections
    const result = await HomePageSection.updateMany(
      {},
      { $set: { "dataConfig.categories": [] } }
    );

    console.log(`✅ Cleared all categories from ${result.modifiedCount} homepage sections`);

    return res.status(200).json(apiResponse(200, true, 
      `Successfully cleared all categories from ${result.modifiedCount} homepage sections. Categories remain in database.`));
  } catch (error) {
    console.error('Error clearing categories from homepage sections:', error.message);
    return res.status(500).json(apiResponse(500, false, 'Internal server error while clearing categories from sections'));
  }
};

// Clear all subcategories from all homepage sections (but keep subcategories in database)
exports.clearAllSubCategoriesFromSections = async (req, res) => {
  try {
    // Clear subcategories from all homepage sections
    const result = await HomePageSection.updateMany(
      {},
      { $set: { "dataConfig.subcategories": [] } }
    );

    console.log(`✅ Cleared all subcategories from ${result.modifiedCount} homepage sections`);

    return res.status(200).json(apiResponse(200, true, 
      `Successfully cleared all subcategories from ${result.modifiedCount} homepage sections. Subcategories remain in database.`));
  } catch (error) {
    console.error('Error clearing subcategories from homepage sections:', error.message);
    return res.status(500).json(apiResponse(500, false, 'Internal server error while clearing subcategories from sections'));
  }
};