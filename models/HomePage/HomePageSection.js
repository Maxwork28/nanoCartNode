const mongoose = require("mongoose");

const homePageSectionSchema = new mongoose.Schema(
  {
    sectionName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      enum: ["MostBought", "TurnHeads", "Everydaytoevent"]
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    subtitle: {
      type: String,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    displayOrder: {
      type: Number,
      default: 1
    },
    // Configuration for what data to show
    dataConfig: {
      // Categories to include in this section
      categories: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category"
      }],
      // Subcategories to include
      subcategories: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "SubCategory"
      }],
      // Specific items to include
      items: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Item"
      }],
      // Filter criteria
      filters: {
        // Price range
        minPrice: { type: Number },
        maxPrice: { type: Number },
        // Discount range
        minDiscount: { type: Number },
        maxDiscount: { type: Number },
        // Rating
        minRating: { type: Number },
        // Stock availability
        inStockOnly: { type: Boolean, default: true },
        // Trending items
        isTrendy: { type: Boolean },
        // New arrivals (items created in last X days)
        newArrivalsDays: { type: Number }
      },
      // Sorting options
      sortBy: {
        type: String,
        enum: ["latest", "popularity", "priceLowToHigh", "priceHighToLow", "rating", "discount"],
        default: "latest"
      },
      // Number of items to display
      itemLimit: {
        type: Number,
        default: 8,
        min: 1,
        max: 50
      }
    },
    // Theme/styling configuration (for future use)
    theme: {
      backgroundColor: { type: String },
      textColor: { type: String },
      accentColor: { type: String },
      buttonColor: { type: String }
    },
    // Campaign/Seasonal information
    campaign: {
      name: { type: String }, // e.g., "Summer Sale", "Winter Collection"
      startDate: { type: Date },
      endDate: { type: Date },
      isActive: { type: Boolean, default: false }
    },
    // SEO fields
    metaTitle: { type: String, trim: true },
    metaDescription: { type: String, trim: true },
    // Admin notes
    notes: { type: String, trim: true }
  },
  { 
    timestamps: true 
  }
);

// Index for efficient querying
homePageSectionSchema.index({ sectionName: 1, isActive: 1 });
homePageSectionSchema.index({ displayOrder: 1 });
homePageSectionSchema.index({ "campaign.isActive": 1 });

// Virtual for campaign status
homePageSectionSchema.virtual('isCampaignActive').get(function() {
  if (!this.campaign.isActive) return false;
  const now = new Date();
  return (!this.campaign.startDate || this.campaign.startDate <= now) && 
         (!this.campaign.endDate || this.campaign.endDate >= now);
});

// Method to get active sections ordered by display order
homePageSectionSchema.statics.getActiveSections = function() {
  return this.find({ isActive: true })
    .populate('dataConfig.categories', 'name image')
    .populate('dataConfig.subcategories', 'name image categoryId')
    .populate('dataConfig.items', 'name image MRP discountedPrice discountPercentage')
    .sort({ displayOrder: 1 });
};

// Method to get section by name
homePageSectionSchema.statics.getSectionByName = function(sectionName) {
  return this.findOne({ sectionName, isActive: true })
    .populate('dataConfig.categories', 'name image')
    .populate('dataConfig.subcategories', 'name image categoryId')
    .populate('dataConfig.items', 'name image MRP discountedPrice discountPercentage')
    .sort({ displayOrder: 1 });
};

module.exports = mongoose.model("HomePageSection", homePageSectionSchema);
