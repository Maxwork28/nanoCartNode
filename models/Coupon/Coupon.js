const mongoose = require('mongoose');

const CouponSchema = new mongoose.Schema(
  {
    couponCode: {
      type: String,
      required: [true, 'Coupon code is required'],
      unique: true,
      trim: true,
      uppercase: true,
      minlength: [3, 'Coupon code must be at least 3 characters'],
      maxlength: [20, 'Coupon code must not exceed 20 characters'],
      match: [/^[A-Z0-9]+$/, 'Coupon code must be alphanumeric'],
    },
    discountType: {
      type: String,
      enum: ['Percentage', 'Flat', 'FreeShipping'],
      required: [true, 'Discount type is required'],
    },
    discountValue: {
      type: Number,
      required: [true, 'Discount value is required'],
      min: [0, 'Discount value must be non-negative'],
      validate: {
        validator: function (value) {
          return this.discountType !== 'Percentage' || (value <= 100 && value > 0);
        },
        message: 'Percentage discount must be between 0 and 100',
      },
    },
    minimumPurchase: {
      type: Number,
      default: 0,
      min: [0, 'Minimum purchase must be non-negative'],
    },
    expirationDate: {
      type: Date,
      required: [true, 'Expiration date is required'],
      validate: {
        validator: function (value) {
          return value > new Date();
        },
        message: 'Expiration date must be in the future',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    couponUserIdUsed: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    maxUses: {
      type: Number,
      default: null, // null means unlimited uses
      min: [0, 'Max uses cannot be negative'],
    },
    maxDiscount: {
      type: Number,
      default: null, // null means no maximum discount limit
      min: [0, 'Max discount cannot be negative'],
    },
    usesPerUser: {
      type: Number,
      default: 1,
      min: [1, 'Uses per user must be at least 1'],
    },
    applicableCategories: {
      type: [String],
      default: [],
      validate: {
        validator: function (v) {
          return v.every(cat => typeof cat === 'string' && cat.trim().length > 0);
        },
        message: 'All categories must be non-empty strings',
      },
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: [100, 'Description must not exceed 100 characters'],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Coupon', CouponSchema);
