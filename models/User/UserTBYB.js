const mongoose = require("mongoose");

const TBYBSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  images: [
    {
      itemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Item",
        required: true,
      },
      tbybImageUrl:{type:[String]}
    },
  ],
}, {
  timestamps: true // Add timestamps for debugging
});

// Add logging middleware
TBYBSchema.pre('save', function(next) {
  console.log('UserTBYB: Saving new TBYB entry:', {
    userId: this.userId,
    imagesCount: this.images?.length || 0,
    images: this.images?.map(img => ({
      itemId: img.itemId,
      tbybImageUrlCount: img.tbybImageUrl?.length || 0
    }))
  });
  next();
});

module.exports = mongoose.model("UserTBYB", TBYBSchema);
