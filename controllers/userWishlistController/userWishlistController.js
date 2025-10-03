const mongoose = require("mongoose");
const User = require("../../models/User/User"); // Adjust path as needed
const Item = require("../../models/Items/Item"); // Adjust path as needed
const ItemDetail = require("../../models/Items/ItemDetail"); // Adjust path as needed
const UserWishlist = require("../../models/User/UserWishlist"); // Adjust path as needed
const { apiResponse } = require("../../utils/apiResponse"); // Adjust path as needed

// Add Item to Wishlist
exports.addToWishlist = async (req, res) => {
  try {
    console.log("🚀 [addToWishlist] Starting addToWishlist");
    console.log("📦 [addToWishlist] Request body:", req.body);
    console.log("👤 [addToWishlist] Request user:", req.user);
    
    const { userId } = req.user;
    const { itemId, color } = req.body;
    
    console.log("🔍 [addToWishlist] Extracted userId:", userId);
    console.log("🔍 [addToWishlist] Extracted itemId:", itemId);
    console.log("🔍 [addToWishlist] Extracted color:", color);

    // Validate required fields
    console.log("✅ [addToWishlist] Validating required fields...");
    if (!itemId) {
      console.log("❌ [addToWishlist] Missing required field - itemId:", !!itemId);
      return res.status(400).json(apiResponse(400, false, "itemId is required"));
    }
    console.log("✅ [addToWishlist] Required fields present");
    console.log("🎨 [addToWishlist] Color provided:", !!color, "Value:", color);
    
    console.log("✅ [addToWishlist] Validating ObjectId...");
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      console.log("❌ [addToWishlist] Invalid itemId format:", itemId);
      return res.status(400).json(apiResponse(400, false, "Invalid itemId"));
    }
    console.log("✅ [addToWishlist] ObjectId is valid");

    // Validate userId
    console.log("👤 [addToWishlist] Checking if user exists...");
    const userExists = await User.exists({ _id: userId });
    console.log("👤 [addToWishlist] User exists:", !!userExists);
    if (!userExists) {
      console.log("❌ [addToWishlist] User not found:", userId);
      return res.status(404).json(apiResponse(404, false, "User not found"));
    }
    console.log("✅ [addToWishlist] User validation passed");

    // Validate itemId
    console.log("📦 [addToWishlist] Checking if item exists...");
    const item = await Item.findById(itemId);
    console.log("📦 [addToWishlist] Item found:", !!item);
    if (item) {
      console.log("📦 [addToWishlist] Item details:", { id: item._id, name: item.name });
    }
    if (!item) {
      console.log("❌ [addToWishlist] Item not found:", itemId);
      return res.status(404).json(apiResponse(404, false, "Item not found"));
    }
    console.log("✅ [addToWishlist] Item validation passed");

    // Validate color against ItemDetail (only if color is provided)
    let validatedColor = color;

    if (color) {
      console.log("🎨 [addToWishlist] Color provided, validating against ItemDetail...");
    const itemDetail = await ItemDetail.findOne({ itemId });
      console.log("🎨 [addToWishlist] ItemDetail found:", !!itemDetail);
      if (itemDetail) {
        console.log("🎨 [addToWishlist] ItemDetail colors available:", itemDetail.imagesByColor?.map(entry => entry.color));
      }
    if (!itemDetail) {
        console.log("❌ [addToWishlist] ItemDetail not found for itemId:", itemId);
      return res.status(404).json(apiResponse(404, false, "ItemDetail not found for this item"));
    }
      
      console.log("🎨 [addToWishlist] Checking if color exists in ItemDetail...");
    const colorExists = itemDetail.imagesByColor.some(
      (entry) => entry.color.toLowerCase() === color.toLowerCase()
    );
      console.log("🎨 [addToWishlist] Color exists:", colorExists);
      console.log("🎨 [addToWishlist] Requested color:", color);
      console.log("🎨 [addToWishlist] Available colors:", itemDetail.imagesByColor.map(entry => entry.color));
      
    if (!colorExists) {
        console.log("❌ [addToWishlist] Color not available:", color);
      return res.status(400).json(apiResponse(400, false, `Color ${color} not available for this item`));
      }
      console.log("✅ [addToWishlist] Color validation passed");
    } else {
      console.log("🎨 [addToWishlist] No color provided, using default color from item...");
      // Use the item's defaultColor if no color is provided
      if (item.defaultColor) {
        validatedColor = item.defaultColor;
        console.log("🎨 [addToWishlist] Using item's defaultColor:", validatedColor);
      } else {
        validatedColor = 'default';
        console.log("🎨 [addToWishlist] No defaultColor found, using 'default'");
      }
    }

    console.log("💝 [addToWishlist] Checking existing wishlist...");
    let wishlist = await UserWishlist.findOne({ userId });
    console.log("💝 [addToWishlist] Existing wishlist found:", !!wishlist);
    
    if (!wishlist) {
      // Create new wishlist
      console.log("💝 [addToWishlist] Creating new wishlist for user:", userId);
      wishlist = new UserWishlist({
        userId,
        items: [{ itemId, color: validatedColor }],
      });
      console.log("💝 [addToWishlist] New wishlist created with item:", { itemId, color: validatedColor });
    } else {
      console.log("💝 [addToWishlist] Existing wishlist items:", wishlist.items.map(i => ({ itemId: i.itemId.toString(), color: i.color })));
      
      // Check for duplicate itemId and color combination
      console.log("💝 [addToWishlist] Checking for duplicates...");
      const alreadyAdded = wishlist.items.some(
        (i) => i.itemId.toString() === itemId && i.color.toLowerCase() === validatedColor.toLowerCase()
      );
      console.log("💝 [addToWishlist] Item already in wishlist:", alreadyAdded);
      
      if (alreadyAdded) {
        console.log("❌ [addToWishlist] Duplicate item found:", { itemId, color: validatedColor });
        return res.status(400).json(apiResponse(400, false, "Item with this color already in wishlist"));
      }

      console.log("💝 [addToWishlist] Adding new item to existing wishlist");
      wishlist.items.push({ itemId, color: validatedColor });
      console.log("💝 [addToWishlist] Wishlist updated, total items:", wishlist.items.length);
    }

    console.log("💾 [addToWishlist] Saving wishlist to database...");
    await wishlist.save();
    console.log("✅ [addToWishlist] Wishlist saved successfully");

    // Populate item and itemDetail for response
    console.log("📋 [addToWishlist] Fetching populated wishlist for response...");
    const populatedWishlist = await UserWishlist.findById(wishlist._id);
    console.log("📋 [addToWishlist] Populated wishlist:", populatedWishlist);
    // .populate({
    //   path: "items.itemId",
    //   select: "name MRP image categoryId subCategoryId",
    //   populate: [
    //     { path: "categoryId", select: "name" },
    //     { path: "subCategoryId", select: "name" },
    //   ],
    // });

    console.log("🎉 [addToWishlist] Successfully added item to wishlist");
    return res.status(200).json(
      apiResponse(200, true, "Item added to wishlist successfully", populatedWishlist)
    );
  } catch (error) {
    console.error("💥 [addToWishlist] Error in addToWishlist:", {
      message: error.message,
      stack: error.stack,
      body: req.body,
      userId: req.user?.userId,
    });
    return res.status(error.statusCode || 500).json(apiResponse(error.statusCode || 500, false, error.message));
  }
};

// Remove Item from Wishlist
exports.removeItemFromWishlist = async (req, res) => {
  try {
    console.log("🗑️ [removeItemFromWishlist] Starting removeItemFromWishlist");
    console.log("📦 [removeItemFromWishlist] Request body:", req.body);
    console.log("👤 [removeItemFromWishlist] Request user:", req.user);
    
    const { userId } = req.user;
    const { itemId, color } = req.body;
    
    console.log("🔍 [removeItemFromWishlist] Extracted userId:", userId);
    console.log("🔍 [removeItemFromWishlist] Extracted itemId:", itemId);
    console.log("🔍 [removeItemFromWishlist] Extracted color:", color);

    // Validate required fields
    console.log("✅ [removeItemFromWishlist] Validating required fields...");
    if (!itemId) {
      console.log("❌ [removeItemFromWishlist] Missing required field - itemId:", !!itemId);
      return res.status(400).json(apiResponse(400, false, "itemId is required"));
    }
    console.log("✅ [removeItemFromWishlist] Required fields present");
    console.log("🎨 [removeItemFromWishlist] Color provided:", !!color, "Value:", color);
    
    console.log("✅ [removeItemFromWishlist] Validating ObjectId...");
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      console.log("❌ [removeItemFromWishlist] Invalid itemId format:", itemId);
      return res.status(400).json(apiResponse(400, false, "Invalid itemId"));
    }
    console.log("✅ [removeItemFromWishlist] ObjectId is valid");

    console.log("💝 [removeItemFromWishlist] Finding user wishlist...");
    const wishlist = await UserWishlist.findOne({ userId });
    console.log("💝 [removeItemFromWishlist] Wishlist found:", !!wishlist);
    if (wishlist) {
      console.log("💝 [removeItemFromWishlist] Current wishlist items:", wishlist.items.map(i => ({ itemId: i.itemId.toString(), color: i.color })));
    }
    if (!wishlist) {
      console.log("❌ [removeItemFromWishlist] Wishlist not found for user:", userId);
      return res.status(404).json(apiResponse(404, false, "Wishlist not found"));
    }

    const initialLength = wishlist.items.length;
    console.log("🗑️ [removeItemFromWishlist] Initial wishlist length:", initialLength);
    
    // Remove item that matches itemId (and color if provided)
    console.log("🗑️ [removeItemFromWishlist] Filtering items to remove...");
    if (color) {
      // If color is provided, match both itemId and color
    wishlist.items = wishlist.items.filter(
      (i) => !(i.itemId.toString() === itemId && i.color.toLowerCase() === color.toLowerCase())
    );
      console.log("🗑️ [removeItemFromWishlist] Removed item with itemId and color:", { itemId, color });
    } else {
      // If no color provided, remove any item with matching itemId
      wishlist.items = wishlist.items.filter(
        (i) => i.itemId.toString() !== itemId
      );
      console.log("🗑️ [removeItemFromWishlist] Removed item with itemId only:", { itemId });
    }
    
    const finalLength = wishlist.items.length;
    console.log("🗑️ [removeItemFromWishlist] Final wishlist length:", finalLength);
    console.log("🗑️ [removeItemFromWishlist] Items removed:", initialLength - finalLength);

    if (initialLength === wishlist.items.length) {
      console.log("❌ [removeItemFromWishlist] No items were removed - item not found:", { itemId, color });
      return res.status(404).json(apiResponse(404, false, "Item with this color not found in wishlist"));
    }

    console.log("💾 [removeItemFromWishlist] Saving updated wishlist...");
    await wishlist.save();
    console.log("✅ [removeItemFromWishlist] Wishlist saved successfully");

    // Populate item for response
    console.log("📋 [removeItemFromWishlist] Fetching populated wishlist for response...");
    const populatedWishlist = await UserWishlist.findById(wishlist._id);
    console.log("📋 [removeItemFromWishlist] Populated wishlist:", populatedWishlist);
    // .populate({
    //   path: "items.itemId",
    //   select: "name MRP image categoryId subCategoryId",
    //   populate: [
    //     { path: "categoryId", select: "name" },
    //     { path: "subCategoryId", select: "name" },
    //   ],
    // });

    console.log("🎉 [removeItemFromWishlist] Successfully removed item from wishlist");
    return res.status(200).json(
      apiResponse(200, true, "Item removed from wishlist", populatedWishlist)
    );
  } catch (error) {
    console.error("💥 [removeItemFromWishlist] Error in removeItemFromWishlist:", {
      message: error.message,
      stack: error.stack,
      body: req.body,
      userId: req.user?.userId,
    });
    return res.status(error.statusCode || 500).json(apiResponse(error.statusCode || 500, false, error.message));
  }
};



exports.getUserWishlist = async (req, res) => {
  try {
    console.log("📋 [getUserWishlist] Starting getUserWishlist");
    console.log("👤 [getUserWishlist] Request user:", req.user);
    
    const { userId } = req.user;
    console.log("🔍 [getUserWishlist] Extracted userId:", userId);

    // Fetch wishlist and populate itemId
    console.log("💝 [getUserWishlist] Fetching wishlist from database...");
    const wishlist = await UserWishlist.findOne({ userId })
      .populate({
        path: "items.itemId",
        model: "Item",
        select: "name description MRP discountedPrice",
      })
      .lean();

    console.log("💝 [getUserWishlist] Fetched wishlist:", JSON.stringify(wishlist, null, 2));
    console.log("💝 [getUserWishlist] Wishlist found:", !!wishlist);
    console.log("💝 [getUserWishlist] Items count:", wishlist?.items?.length || 0);

    if (!wishlist || wishlist.items.length === 0) {
      console.log("📭 [getUserWishlist] Wishlist is empty for user:", userId);
      return res
        .status(200)
        .json(apiResponse(200, true, "Wishlist is empty", { userId, items: [] }));
    }

    // Fetch priority 1 image URL from ItemDetail for each item based on itemId and color
    const enhancedItems = await Promise.all(
      wishlist.items.map(async (item) => {
        if (!item.itemId) {
          console.warn(`Null itemId found in wishlist item:`, item);
          return { ...item, url: null };
        }

        // Find ItemDetail matching itemId and color, and get priority 1 image
        const itemDetail = await ItemDetail.findOne(
          {
            itemId: item.itemId._id,
            "imagesByColor.color": item.color,
          },
          {
            "imagesByColor.$": 1, // Get only the matching color object
          }
        ).lean();

        if (!itemDetail) {
          console.warn(`No ItemDetail found for itemId: ${item.itemId._id}, color: ${item.color}`);
          return { ...item, url: null };
        }

        // Get the priority 1 image URL
        const priorityOneImage = itemDetail.imagesByColor[0]?.images.find(
          (img) => img.priority === 1
        );

        return {
          ...item,
          url: priorityOneImage ? priorityOneImage.url : null,
        };
      })
    );

    // Update wishlist items with enhanced data
    wishlist.items = enhancedItems;

    return res
      .status(200)
      .json(apiResponse(200, true, "Wishlist fetched successfully", wishlist));
  } catch (error) {
    console.error("💥 [getUserWishlist] Error in getUserWishlist:", {
      message: error.message,
      stack: error.stack,
      userId: req.user?.userId,
    });
    return res.status(500).json(apiResponse(500, false, error.message));
  }
};


exports.getUserWishlistByAdmin = async (req, res) => {
  try {
    console.log("👑 [getUserWishlistByAdmin] Starting getUserWishlistByAdmin");
    console.log("👤 [getUserWishlistByAdmin] Request params:", req.params);
    
    const { userId } = req.params;
    console.log("🔍 [getUserWishlistByAdmin] Extracted userId:", userId);

    // Fetch wishlist and populate itemId
    console.log("💝 [getUserWishlistByAdmin] Fetching wishlist from database...");
    const wishlist = await UserWishlist.findOne({ userId })
      .populate({
        path: "items.itemId",
        model: "Item",
        select: "name description MRP discountedPrice",
      })
      .lean();

    console.log("💝 [getUserWishlistByAdmin] Fetched wishlist:", JSON.stringify(wishlist, null, 2));
    console.log("💝 [getUserWishlistByAdmin] Wishlist found:", !!wishlist);
    console.log("💝 [getUserWishlistByAdmin] Items count:", wishlist?.items?.length || 0);

    if (!wishlist || wishlist.items.length === 0) {
      console.log("📭 [getUserWishlistByAdmin] Wishlist is empty for user:", userId);
      return res
        .status(200)
        .json(apiResponse(200, true, "Wishlist is empty", { userId, items: [] }));
    }

    // Fetch priority 1 image URL from ItemDetail for each item based on itemId and color
    const enhancedItems = await Promise.all(
      wishlist.items.map(async (item) => {
        if (!item.itemId) {
          console.warn(`Null itemId found in wishlist item:`, item);
          return { ...item, url: null };
        }

        // Find ItemDetail matching itemId and color, and get priority 1 image
        const itemDetail = await ItemDetail.findOne(
          {
            itemId: item.itemId._id,
            "imagesByColor.color": item.color,
          },
          {
            "imagesByColor.$": 1, // Get only the matching color object
          }
        ).lean();

        if (!itemDetail) {
          console.warn(`No ItemDetail found for itemId: ${item.itemId._id}, color: ${item.color}`);
          return { ...item, url: null };
        }

        // Get the priority 1 image URL
        const priorityOneImage = itemDetail.imagesByColor[0]?.images.find(
          (img) => img.priority === 1
        );

        return {
          ...item,
          url: priorityOneImage ? priorityOneImage.url : null,
        };
      })
    );

    // Update wishlist items with enhanced data
    wishlist.items = enhancedItems;

    return res
      .status(200)
      .json(apiResponse(200, true, "Wishlist fetched successfully", wishlist));
  } catch (error) {
    console.error("💥 [getUserWishlist] Error in getUserWishlist:", {
      message: error.message,
      stack: error.stack,
      userId: req.user?.userId,
    });
    return res.status(500).json(apiResponse(500, false, error.message));
  }
};

// Filter Wishlist Items
exports.filterWishlistItems = async (req, res) => {
  try {
    console.log("🔍 [filterWishlistItems] Starting filterWishlistItems");
    console.log("📦 [filterWishlistItems] Request body:", req.body);
    console.log("👤 [filterWishlistItems] Request user:", req.user);
    
    const { userId } = req.user;
    const { filters, sortBy = "latestAddition" } = req.body;
    
    console.log("🔍 [filterWishlistItems] Extracted userId:", userId);
    console.log("🔍 [filterWishlistItems] Filters:", filters);
    console.log("🔍 [filterWishlistItems] Sort by:", sortBy);

    // Fetch wishlist and populate itemId with more details
    console.log("💝 [filterWishlistItems] Fetching wishlist from database...");
    const wishlist = await UserWishlist.findOne({ userId })
      .populate({
        path: "items.itemId",
        model: "Item",
        select: "name description MRP discountedPrice categoryId subCategoryId defaultColor",
        populate: [
          { path: "categoryId", select: "name" },
          { path: "subCategoryId", select: "name" },
        ],
      })
      .lean();

    console.log("💝 [filterWishlistItems] Wishlist found:", !!wishlist);
    console.log("💝 [filterWishlistItems] Items count:", wishlist?.items?.length || 0);

    if (!wishlist || wishlist.items.length === 0) {
      console.log("📭 [filterWishlistItems] Wishlist is empty for user:", userId);
      return res
        .status(200)
        .json(apiResponse(200, true, "Wishlist is empty", { userId, items: [], totalItems: 0 }));
    }

    // Fetch enhanced data for each item
    const enhancedItems = await Promise.all(
      wishlist.items.map(async (item) => {
        if (!item.itemId) {
          console.warn(`Null itemId found in wishlist item:`, item);
          return null;
        }

        // Find ItemDetail matching itemId and color
        const itemDetail = await ItemDetail.findOne(
          {
            itemId: item.itemId._id,
            "imagesByColor.color": item.color,
          },
          {
            "imagesByColor.$": 1,
          }
        ).lean();

        const priorityOneImage = itemDetail?.imagesByColor[0]?.images?.find(
          (img) => img.priority === 1
        );

        // Calculate discount
        const mrp = item.itemId.MRP || 0;
        const discountedPrice = item.itemId.discountedPrice || mrp;
        const discount = mrp > 0 ? Math.round(((mrp - discountedPrice) / mrp) * 100) : 0;

        return {
          id: item.itemId._id,
          name: item.itemId.name,
          description: item.itemId.description,
          price: discountedPrice,
          originalPrice: mrp,
          discount: discount.toString(),
          image: priorityOneImage?.url || null,
          color: item.color,
          category: item.itemId.categoryId?.name || 'Uncategorized',
          subCategory: item.itemId.subCategoryId?.name || 'Uncategorized',
          rating: 4.5, // Default rating - could be fetched from reviews
          url: priorityOneImage?.url || null,
        };
      })
    );

    // Filter out null items
    const validItems = enhancedItems.filter(item => item !== null);

    // Apply filters if provided
    let filteredItems = validItems;
    if (filters && Object.keys(filters).length > 0) {
      console.log("🔍 [filterWishlistItems] Applying filters:", filters);
      
      filteredItems = validItems.filter(item => {
        // Color filter
        if (filters.Color && filters.Color.length > 0) {
          const itemColor = item.color || 'default';
          if (!filters.Color.some(filterColor => 
            itemColor.toLowerCase().includes(filterColor.toLowerCase())
          )) {
            return false;
          }
        }

        // Price Range filter
        if (filters.PriceRange && filters.PriceRange.length > 0) {
          const price = item.price || 0;
          const priceMatch = filters.PriceRange.some(range => {
            switch (range) {
              case "Under ₹500":
                return price < 500;
              case "₹500 - ₹1000":
                return price >= 500 && price <= 1000;
              case "₹1000 - ₹1500":
                return price >= 1000 && price <= 1500;
              case "₹1500 - ₹2000":
                return price >= 1500 && price <= 2000;
              case "Above ₹2000":
                return price > 2000;
              default:
                return true;
            }
          });
          
          if (!priceMatch) {
            return false;
          }
        }

        // Pattern filter (based on item name/category)
        if (filters.Pattern && filters.Pattern.length > 0) {
          const searchText = (item.name + ' ' + item.category).toLowerCase();
          if (!filters.Pattern.some(pattern => 
            searchText.includes(pattern.toLowerCase())
          )) {
            return false;
          }
        }

        // Fabric filter (based on item name/description)
        if (filters.Fabric && filters.Fabric.length > 0) {
          const searchText = (item.name + ' ' + item.description).toLowerCase();
          if (!filters.Fabric.some(fabric => 
            searchText.includes(fabric.toLowerCase())
          )) {
            return false;
          }
        }

        // Occasion filter (based on item name/category)
        if (filters.Occasion && filters.Occasion.length > 0) {
          const searchText = (item.name + ' ' + item.category).toLowerCase();
          if (!filters.Occasion.some(occasion => 
            searchText.includes(occasion.toLowerCase())
          )) {
            return false;
          }
        }

        // Border filter (based on item name/description)
        if (filters.Border && filters.Border.length > 0) {
          const searchText = (item.name + ' ' + item.description).toLowerCase();
          if (!filters.Border.some(border => 
            searchText.includes(border.toLowerCase())
          )) {
            return false;
          }
        }

        return true;
      });
    }

    // Apply sorting
    console.log("📊 [filterWishlistItems] Applying sorting:", sortBy);
    switch (sortBy) {
      case "priceLowToHigh":
        filteredItems.sort((a, b) => a.price - b.price);
        break;
      case "priceHighToLow":
        filteredItems.sort((a, b) => b.price - a.price);
        break;
      case "nameAtoZ":
        filteredItems.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "nameZtoA":
        filteredItems.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "newestFirst":
        filteredItems.sort((a, b) => (b.id || 0) - (a.id || 0));
        break;
      case "oldestFirst":
        filteredItems.sort((a, b) => (a.id || 0) - (b.id || 0));
        break;
      default:
        // Keep original order
        break;
    }

    console.log("✅ [filterWishlistItems] Filtering and sorting completed");
    console.log("📊 [filterWishlistItems] Original items:", validItems.length);
    console.log("📊 [filterWishlistItems] Filtered items:", filteredItems.length);

    return res
      .status(200)
      .json(apiResponse(200, true, "Wishlist filtered successfully", {
        items: filteredItems,
        totalItems: filteredItems.length,
        originalCount: validItems.length,
        filters: filters || {},
        sortBy
      }));
  } catch (error) {
    console.error("💥 [filterWishlistItems] Error in filterWishlistItems:", {
      message: error.message,
      stack: error.stack,
      userId: req.user?.userId,
    });
    return res.status(500).json(apiResponse(500, false, error.message));
  }
};