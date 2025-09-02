
const UserTBYB = require("../../models/User/UserTBYB");
const mongoose=require("mongoose")
exports.createTBYBEntry = async (req, res) => {
  try {
    console.log("=== TBYB CREATE ENTRY START ===");
    console.log("createTBYBEntry: Received request");
    console.log("createTBYBEntry: Request headers:", req.headers);
    console.log("createTBYBEntry: Request body:", JSON.stringify(req.body, null, 2));
    console.log("createTBYBEntry: User from token:", req.user);
    
    const { userId } = req.user; 
    const { images } = req.body;
    
    console.log("createTBYBEntry: Extracted data:", {
      userId,
      imagesCount: images?.length || 0,
      images: images?.map(img => ({
        itemId: img.itemId,
        tbybImageUrlCount: img.tbybImageUrl?.length || 0,
        tbybImageUrl: img.tbybImageUrl?.slice(0, 100) + '...' || 'null'
      }))
    });

    // Validate images array
    console.log("createTBYBEntry: Validating images array...");
    if (!images || !Array.isArray(images) || images.length === 0) {
      console.error("createTBYBEntry: ❌ Images array validation failed");
      console.error("createTBYBEntry: Images value:", images);
      console.error("createTBYBEntry: Is array:", Array.isArray(images));
      console.error("createTBYBEntry: Length:", images?.length);
      return res.status(400).json({
        success: false,
        message: "Images array is required and cannot be empty.",
        receivedBody: req.body, // Include for debugging
      });
    }
    console.log("createTBYBEntry: ✅ Images array validation passed");

    // Validate each image entry
    console.log("createTBYBEntry: Validating individual image entries...");
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      console.log(`createTBYBEntry: Validating image ${i + 1}:`, {
        itemId: image.itemId,
        itemIdValid: image.itemId && mongoose.Types.ObjectId.isValid(image.itemId),
        tbybImageUrl: image.tbybImageUrl,
        tbybImageUrlIsArray: Array.isArray(image.tbybImageUrl),
        tbybImageUrlLength: image.tbybImageUrl?.length || 0
      });
      
      if (!image.itemId || !mongoose.Types.ObjectId.isValid(image.itemId)) {
        console.error(`createTBYBEntry: ❌ Invalid itemId in image ${i + 1}:`, image.itemId);
        return res.status(400).json({
          success: false,
          message: `Invalid or missing itemId in images array: ${image.itemId || 'missing'}`,
        });
      }
      
      if (!image.tbybImageUrl || !Array.isArray(image.tbybImageUrl) || image.tbybImageUrl.length === 0) {
        console.error(`createTBYBEntry: ❌ Invalid tbybImageUrl in image ${i + 1}:`, image.tbybImageUrl);
        return res.status(400).json({
          success: false,
          message: `tbybImageUrl must be a non-empty array for itemId: ${image.itemId}`,
        });
      }
    }
    console.log("createTBYBEntry: ✅ All image entries validation passed");

    console.log("createTBYBEntry: Creating new TBYB entry...");
    const newEntry = new UserTBYB({
      userId,
      images,
    });

    console.log("createTBYBEntry: Saving to database...");
    const savedEntry = await newEntry.save();
    console.log("createTBYBEntry: ✅ Successfully saved to database");
    console.log("createTBYBEntry: Saved entry ID:", savedEntry._id);
    console.log("createTBYBEntry: Saved entry data:", {
      userId: savedEntry.userId,
      imagesCount: savedEntry.images?.length || 0,
      createdAt: savedEntry.createdAt,
      updatedAt: savedEntry.updatedAt
    });

    console.log("=== TBYB CREATE ENTRY END (SUCCESS) ===");
    return res.status(201).json({
      success: true,
      message: "TBYB entry created successfully.",
      data: savedEntry,
    });
  } catch (error) {
    console.error("=== TBYB CREATE ENTRY END (ERROR) ===");
    console.error("createTBYBEntry: ❌ Error occurred:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      body: req.body,
    });
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

// Get all TBYB entries by user ID
exports.getTBYBByUserId = async (req, res) => {
  try {
    console.log("=== TBYB GET BY USER ID START ===");
    console.log("getTBYBByUserId: Received request");
    console.log("getTBYBByUserId: Request headers:", req.headers);
    console.log("getTBYBByUserId: User from token:", req.user);
    
    const { userId } = req.user;
    
    console.log("getTBYBByUserId: Fetching TBYB entries for userId:", userId);

    // Find all TBYB entries for the user with populated item details
    const tbybEntries = await UserTBYB.find({ userId })
      .populate({
        path: 'images.itemId',
        select: 'name image discountedPrice MRP categoryId subCategoryId',
        populate: [
          {
            path: 'categoryId',
            select: 'name'
          },
          {
            path: 'subCategoryId', 
            select: 'name'
          }
        ]
      })
      .sort({ createdAt: -1 }); // Most recent first

    console.log("getTBYBByUserId: Found entries:", tbybEntries.length);
    console.log("getTBYBByUserId: Sample entry:", tbybEntries[0] ? {
      _id: tbybEntries[0]._id,
      userId: tbybEntries[0].userId,
      imagesCount: tbybEntries[0].images?.length || 0,
      createdAt: tbybEntries[0].createdAt
    } : 'No entries found');

    console.log("=== TBYB GET BY USER ID END (SUCCESS) ===");
    return res.status(200).json({
      success: true,
      message: "TBYB entries retrieved successfully.",
      data: tbybEntries,
    });
  } catch (error) {
    console.error("=== TBYB GET BY USER ID END (ERROR) ===");
    console.error("getTBYBByUserId: ❌ Error occurred:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
    });
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};