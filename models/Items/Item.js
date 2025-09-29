const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, index: true },
    description: { type: String },
    MRP: { type: Number, required: true, min: 0 },
    totalStock: { type: Number, required: true, default: 0, min: 0 },
    isOutOfStock: { type: Boolean, default: false },
    image: { type: String },
    itemImageId: { type: String },
    discountedPrice: { type: Number, min: 0 },
    discountPercentage: { type: Number, default: 0 },
    defaultColor: { type: String },
    isItemDetail: { type: Boolean, default: false },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    subCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubCategory",
      required: true,
    },
    filters: [
      {
        key: { type: String },
        value: { type: String },
      },
    ],
    userAverageRating: { type: Number,default:0 },
    // SEO & Search fields
    metaTitle: { type: String, trim: true },
    metaDescription: { type: String, trim: true },
    searchKeywords: [{ type: String, trim: true }]
  },
  { timestamps: true }
);

// Add text index on name, description, and SEO fields for full-text search
itemSchema.index({ 
  name: "text", 
  description: "text", 
  metaTitle: "text", 
  metaDescription: "text", 
  searchKeywords: "text" 
});

itemSchema.pre("save", function (next) {
  // Calculate discountPercentage if discountedPrice and MRP are provided
  if (this.discountedPrice && this.MRP) {
    this.discountPercentage = ((this.MRP - this.discountedPrice) / this.MRP) * 100;
  } else {
    this.discountPercentage = 0; // Ensure discountPercentage is set to 0 if not applicable
  }

  // Set isOutOfStock based on totalStock
  const wasOutOfStock = this.isOutOfStock;
  this.isOutOfStock = this.totalStock === 0;
  
  // Debug logging for stock changes
  if (this.isModified('totalStock') || this.isModified('isOutOfStock')) {
    console.log(`[ITEM PRE-SAVE] ${this.name}: totalStock=${this.totalStock}, isOutOfStock=${this.isOutOfStock} (was: ${wasOutOfStock})`);
  }
  
  next();
});

module.exports = mongoose.model("Item", itemSchema);