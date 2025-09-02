const mongoose = require('mongoose');

/**
 * Seed Database for NanoCart Backend
 * 
 * This seed file has been updated to support the new monthly trends API endpoints.
 * Key changes:
 * - Added timestamps support to all models (User, Partner, Category, SubCategory)
 * - Created staggered creation dates (Jun-Sep 2025) for better trends visualization
 * - Added more sample data to demonstrate the monthly trends functionality
 * - All dates are set to 2025 to ensure consistent data for testing
 * 
 * The staggered dates will create realistic trends when using the date range filter
 * in the AdminDashboard frontend.
 */

// Import Mongoose models with correct paths
const Category = require('./models/Category/Category');
const SubCategory = require('./models/SubCategory/SubCategory');
const Item = require('./models/Items/Item');
const ItemDetail = require('./models/Items/ItemDetail');
const User = require('./models/User/User');
const Partner = require('./models/Partner/Partner');
const PartnerAddress = require('./models/Partner/PartnerAddress');
const UserAddress = require('./models/User/UserAddress');
const UserCart = require('./models/User/UserCart');
const PartnerCart = require('./models/Partner/PartnerCart');
const UserOrder = require('./models/User/UserOrder');
const PartnerOrder = require('./models/Partner/PartnerOrder');
const Coupon = require('./models/Coupon/Coupon');
const Filter = require('./models/Filter/Filter');
const HomePageBanner = require('./models/HomePageBanner/HomePageBanner');
const Invoice = require('./models/Invoice/Invoice');
const PhoneOtp = require('./models/OTP/PhoneOTP');
const PartnerProfile = require('./models/Partner/PartnerProfile');
const PartnerRatingReview = require('./models/Partner/PartnerRatingReview');
const PartnerWallet = require('./models/Partner/PartnerWallet');
const UserWishlist = require('./models/User/UserWishlist');
const PartnerWishlist = require('./models/Partner/PartnerWishlist');
const PrivacyPolicy = require('./models/PrivacyPolicy/PrivacyPolicy');
const UserRatingReview = require('./models/User/UserRatingReview');
const UserTBYB = require('./models/User/UserTBYB');

// MongoDB connection
const MONGO_URI = 'mongodb://localhost:27017/nanoCart'; // Updated database name

// Helper function to generate unique IDs
function generateUniqueId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Drop existing collections to start fresh
    await mongoose.connection.db.dropDatabase();
    console.log('Database dropped');

    // Sample data
    const imageUrl = 'https://yoraaecommerce.s3.ap-south-1.amazonaws.com/Nanocart/categories/68b225e6b385c2284f6585de/subCategories/68b225e7b385c2284f6585f5/item/68b22a509635a8ff72327eba/1756506764377_mbair_m2_001.png';

    // Categories - Create with staggered dates for better trends visualization
    const categories = await Category.insertMany([
      { 
        name: 'Electronics', 
        description: 'Electronic gadgets and devices', 
        image: imageUrl,
        createdAt: new Date('2025-06-15') // June
      },
      { 
        name: 'Clothing', 
        description: 'Fashion and apparel', 
        image: imageUrl,
        createdAt: new Date('2025-07-20') // July
      },
      { 
        name: 'Home & Garden', 
        description: 'Home improvement and garden supplies', 
        image: imageUrl,
        createdAt: new Date('2025-08-10') // August
      },
      { 
        name: 'Sports & Fitness', 
        description: 'Sports equipment and fitness gear', 
        image: imageUrl,
        createdAt: new Date('2025-09-05') // September
      },
    ]);

    // SubCategories - Create with staggered dates
    const subCategories = await SubCategory.insertMany([
      { 
        name: 'Smartphones', 
        description: 'Latest smartphones', 
        image: imageUrl, 
        categoryId: categories[0]._id, 
        isTrendy: true,
        createdAt: new Date('2025-06-20')
      },
      { 
        name: 'Laptops', 
        description: 'High-performance laptops', 
        image: imageUrl, 
        categoryId: categories[0]._id, 
        isTrendy: true,
        createdAt: new Date('2025-07-15')
      },
      { 
        name: 'Men\'s Clothing', 
        description: 'Men\'s fashion', 
        image: imageUrl, 
        categoryId: categories[1]._id, 
        isTrendy: false,
        createdAt: new Date('2025-07-25')
      },
      { 
        name: 'Women\'s Clothing', 
        description: 'Women\'s fashion', 
        image: imageUrl, 
        categoryId: categories[1]._id, 
        isTrendy: true,
        createdAt: new Date('2025-08-15')
      },
      { 
        name: 'Kitchen Appliances', 
        description: 'Modern kitchen equipment', 
        image: imageUrl, 
        categoryId: categories[2]._id, 
        isTrendy: false,
        createdAt: new Date('2025-08-20')
      },
      { 
        name: 'Fitness Equipment', 
        description: 'Home gym and fitness gear', 
        image: imageUrl, 
        categoryId: categories[3]._id, 
        isTrendy: true,
        createdAt: new Date('2025-09-10')
      },
    ]);

    // Users - Create with staggered dates for better trends visualization
    const users = await User.insertMany([
      {
        name: 'John Doe',
        phoneNumber: '9876543210',
        email: 'john.doe@example.com',
        role: 'User',
        isPhoneVerified: true,
        isEmailVerified: true,
        isActive: true,
        isPartner: false,
        isAddress: false,
        createdAt: new Date('2025-06-10')
      },
      {
        name: 'Admin User 1',
        phoneNumber: '9717999451',
        email: 'admin1@example.com',
        role: 'Admin',
        isPhoneVerified: true,
        isEmailVerified: true,
        isActive: true,
        isPartner: false,
        isAddress: false,
        createdAt: new Date('2025-06-05')
      },
      {
        name: 'Admin User 2',
        phoneNumber: '9337723626',
        email: 'admin2@example.com',
        role: 'Admin',
        isPhoneVerified: true,
        isEmailVerified: true,
        isActive: true,
        isPartner: false,
        isAddress: false,
        createdAt: new Date('2025-06-06')
      },
      {
        name: 'Admin User 3',
        phoneNumber: '9717999452',
        email: 'admin3@example.com',
        role: 'Admin',
        isPhoneVerified: true,
        isEmailVerified: true,
        isActive: true,
        isPartner: false,
        isAddress: false,
        createdAt: new Date('2025-06-07')
      },
      {
        name: 'Admin User 4',
        phoneNumber: '8637222939',
        email: 'admin4@example.com',
        role: 'Admin',
        isPhoneVerified: true,
        isEmailVerified: true,
        isActive: true,
        isPartner: false,
        isAddress: false,
        createdAt: new Date('2025-06-08')
      },
      {
        name: 'Admin User 5',
        phoneNumber: '9220604894',
        email: 'admin5@example.com',
        role: 'Admin',
        isPhoneVerified: true,
        isEmailVerified: true,
        isActive: true,
        isPartner: false,
        isAddress: false,
        createdAt: new Date('2025-06-09')
      },
      {
        name: 'Admin User 6',
        phoneNumber: '7205981525',
        email: 'admin6@example.com',
        role: 'Admin',
        isPhoneVerified: true,
        isEmailVerified: true,
        isActive: true,
        isPartner: false,
        isAddress: false,
        createdAt: new Date('2025-06-10')
      },
      {
        name: 'Admin User 7',
        phoneNumber: '8770824288',
        email: 'admin7@example.com',
        role: 'Admin',
        isPhoneVerified: true,
        isEmailVerified: true,
        isActive: true,
        isPartner: false,
        isAddress: false,
        createdAt: new Date('2025-06-11')
      },
      {
        name: 'Admin User 8',
        phoneNumber: '9556764730',
        email: 'admin8@example.com',
        role: 'Admin',
        isPhoneVerified: true,
        isEmailVerified: true,
        isActive: true,
        isPartner: false,
        isAddress: false,
        createdAt: new Date('2025-06-12')
      },
      {
        name: 'Admin User 9',
        phoneNumber: '9829699382',
        email: 'admin9@example.com',
        role: 'Admin',
        isPhoneVerified: true,
        isEmailVerified: true,
        isActive: true,
        isPartner: false,
        isAddress: false,
        createdAt: new Date('2025-06-13')
      },
      {
        name: 'Sarah Wilson',
        phoneNumber: '9876543212',
        email: 'sarah.wilson@example.com',
        role: 'User',
        isPhoneVerified: true,
        isEmailVerified: true,
        isActive: true,
        isPartner: false,
        isAddress: false,
        createdAt: new Date('2025-07-15')
      },
      {
        name: 'Mike Johnson',
        phoneNumber: '9876543213',
        email: 'mike.johnson@example.com',
        role: 'User',
        isPhoneVerified: true,
        isEmailVerified: true,
        isActive: true,
        isPartner: false,
        isAddress: false,
        createdAt: new Date('2025-08-20')
      },
      {
        name: 'Lisa Brown',
        phoneNumber: '9876543214',
        email: 'lisa.brown@example.com',
        role: 'User',
        isPhoneVerified: true,
        isEmailVerified: true,
        isActive: true,
        isPartner: false,
        isAddress: false,
        createdAt: new Date('2025-09-12')
      },
    ]);

    // Partners - Create with staggered dates for better trends visualization
    const partners = await Partner.insertMany([
      {
        partner: users[0]._id,
        name: 'Jane Partner',
        phoneNumber: '9876543211',
        email: 'jane.partner@example.com',
        isVerified: true,
        isPhoneVerified: true,
        isEmailVerified: true,
        isActive: true,
        isProfile: true,
        isWalletCreated: true,
        isAddress: true,
        imageShop: imageUrl,
        createdAt: new Date('2025-07-01')
      },
      {
        partner: users[11]._id,
        name: 'Tech Store Partner',
        phoneNumber: '9876543215',
        email: 'tech.store@example.com',
        isVerified: true,
        isPhoneVerified: true,
        isEmailVerified: true,
        isActive: true,
        isProfile: true,
        isWalletCreated: true,
        isAddress: true,
        imageShop: imageUrl,
        createdAt: new Date('2025-08-01')
      },
      {
        partner: users[12]._id,
        name: 'Fashion Partner',
        phoneNumber: '9876543216',
        email: 'fashion.partner@example.com',
        isVerified: true,
        isPhoneVerified: true,
        isEmailVerified: true,
        isActive: true,
        isProfile: true,
        isWalletCreated: true,
        isAddress: true,
        imageShop: imageUrl,
        createdAt: new Date('2025-09-01')
      },
    ]);

    // Partner Profiles
    const partnerProfiles = await PartnerProfile.insertMany([
      {
        partnerId: partners[0]._id,
        shopName: 'Jane\'s Store',
        gstNumber: '27AAECB1234H1Z5',
        panNumber: 'ABCDE1234F',
        shopAddress: '123 Partner Street',
        pincode: '400001',
        townCity: 'Mumbai',
        state: 'Maharashtra',
      },
    ]);

    // Addresses
    const userAddresses = await UserAddress.insertMany([
      {
        userId: users[0]._id,
        addressDetail: [
          {
            name: 'John Doe',
            phoneNumber: '9876543210',
            email: 'john.doe@example.com',
            pincode: '400001',
            addressLine1: '123 Main St',
            cityTown: 'Mumbai',
            state: 'Maharashtra',
            country: 'India',
            addressType: 'Home',
            isDefault: true,
          },
        ],
      },
    ]);

    const partnerAddresses = await PartnerAddress.insertMany([
      {
        partnerId: partners[0]._id,
        addressDetail: [
          {
            name: 'Jane Partner',
            phoneNumber: '9876543211',
            email: 'jane.partner@example.com',
            pincode: '400001',
            addressLine1: '456 Partner St',
            cityTown: 'Mumbai',
            state: 'Maharashtra',
            country: 'India',
            addressType: 'Work',
            isDefault: true,
          },
        ],
      },
    ]);

    // Items - Create with staggered dates for better trends visualization
    const items = await Item.insertMany([
      {
        name: 'Smartphone X',
        description: 'High-end smartphone',
        MRP: 50000,
        totalStock: 100,
        image: imageUrl,
        itemImageId: generateUniqueId(),
        discountedPrice: 45000,
        defaultColor: 'Black',
        isItemDetail: true,
        categoryId: categories[0]._id,
        subCategoryId: subCategories[0]._id,
        filters: [{ key: 'Brand', value: 'TechBrand' }],
        userAverageRating: 4.5,
        createdAt: new Date('2025-06-25')
      },
      {
        name: 'Gaming Laptop Pro',
        description: 'High-performance gaming laptop',
        MRP: 80000,
        totalStock: 50,
        image: imageUrl,
        itemImageId: generateUniqueId(),
        discountedPrice: 72000,
        defaultColor: 'Black',
        isItemDetail: true,
        categoryId: categories[0]._id,
        subCategoryId: subCategories[1]._id,
        filters: [{ key: 'Brand', value: 'GamingBrand' }],
        userAverageRating: 4.8,
        createdAt: new Date('2025-07-20')
      },
      {
        name: 'T-Shirt',
        description: 'Comfortable cotton t-shirt',
        MRP: 1000,
        totalStock: 200,
        image: imageUrl,
        itemImageId: generateUniqueId(),
        discountedPrice: 800,
        defaultColor: 'Blue',
        isItemDetail: true,
        categoryId: categories[1]._id,
        subCategoryId: subCategories[2]._id,
        filters: [{ key: 'Material', value: 'Cotton' }],
        userAverageRating: 4.0,
        createdAt: new Date('2025-07-28')
      },
      {
        name: 'Designer Dress',
        description: 'Elegant evening dress',
        MRP: 3000,
        totalStock: 75,
        image: imageUrl,
        itemImageId: generateUniqueId(),
        discountedPrice: 2400,
        defaultColor: 'Red',
        isItemDetail: true,
        categoryId: categories[1]._id,
        subCategoryId: subCategories[3]._id,
        filters: [{ key: 'Style', value: 'Evening' }],
        userAverageRating: 4.6,
        createdAt: new Date('2025-08-20')
      },
      {
        name: 'Smart Coffee Maker',
        description: 'WiFi-enabled coffee machine',
        MRP: 15000,
        totalStock: 30,
        image: imageUrl,
        itemImageId: generateUniqueId(),
        discountedPrice: 12000,
        defaultColor: 'Silver',
        isItemDetail: true,
        categoryId: categories[2]._id,
        subCategoryId: subCategories[4]._id,
        filters: [{ key: 'Type', value: 'Smart' }],
        userAverageRating: 4.4,
        createdAt: new Date('2025-08-25')
      },
      {
        name: 'Treadmill Elite',
        description: 'Professional home treadmill',
        MRP: 45000,
        totalStock: 20,
        image: imageUrl,
        itemImageId: generateUniqueId(),
        discountedPrice: 36000,
        defaultColor: 'Black',
        isItemDetail: true,
        categoryId: categories[3]._id,
        subCategoryId: subCategories[5]._id,
        filters: [{ key: 'Type', value: 'Cardio' }],
        userAverageRating: 4.7,
        createdAt: new Date('2025-09-15')
      },
    ]);

    // Item Details
    const itemDetails = await ItemDetail.insertMany([
      {
        itemId: items[0]._id,
        imagesByColor: [
          {
            color: 'Black',
            hexCode: '#000000',
            images: [{ url: imageUrl, priority: 1, isTbyb: false, itemDetailImageId: generateUniqueId() }],
            sizes: [
              { size: 'Standard', stock: 50, skuId: generateUniqueId() },
            ],
          },
        ],
        sizeChart: [
          { 
            size: 'Standard', 
            inches: new Map([['width', 5]]), 
            cm: new Map([['width', 12.7]]) 
          }
        ],
        howToMeasure: [
          new Map([['Width', 'Measure across the device']])
        ],
        isSize: true,
        isMultipleColor: false,
        deliveryDescription: 'Delivered in 3-5 days',
        About: 'Latest smartphone technology',
        PPQ: [{ minQty: 1, maxQty: 10, pricePerUnit: 45000 }],
        deliveryPincode: [400001],
        returnPolicy: '30-day return policy',
      },
      {
        itemId: items[1]._id,
        imagesByColor: [
          {
            color: 'Black',
            hexCode: '#000000',
            images: [{ url: imageUrl, priority: 1, isTbyb: false, itemDetailImageId: generateUniqueId() }],
            sizes: [
              { size: 'Standard', stock: 50, skuId: generateUniqueId() },
            ],
          },
        ],
        sizeChart: [
          { 
            size: 'Standard', 
            inches: new Map([['width', 15.6]]), 
            cm: new Map([['width', 39.6]]) 
          }
        ],
        howToMeasure: [
          new Map([['Screen Size', 'Measure diagonally across the screen']])
        ],
        isSize: true,
        isMultipleColor: false,
        deliveryDescription: 'Delivered in 5-7 days',
        About: 'High-performance gaming laptop with latest graphics',
        PPQ: [{ minQty: 1, maxQty: 5, pricePerUnit: 72000 }],
        deliveryPincode: [400001],
        returnPolicy: '30-day return policy',
      },
      {
        itemId: items[2]._id,
        imagesByColor: [
          {
            color: 'Blue',
            hexCode: '#0000FF',
            images: [{ url: imageUrl, priority: 1, isTbyb: false, itemDetailImageId: generateUniqueId() }],
            sizes: [
              { size: 'S', stock: 50, skuId: generateUniqueId() },
              { size: 'M', stock: 75, skuId: generateUniqueId() },
              { size: 'L', stock: 50, skuId: generateUniqueId() },
              { size: 'XL', stock: 25, skuId: generateUniqueId() },
            ],
          },
        ],
        sizeChart: [
          { 
            size: 'S', 
            inches: new Map([['chest', 36], ['length', 26]]), 
            cm: new Map([['chest', 91.4], ['length', 66]]) 
          },
          { 
            size: 'M', 
            inches: new Map([['chest', 38], ['length', 27]]), 
            cm: new Map([['chest', 96.5], ['length', 68.6]]) 
          },
          { 
            size: 'L', 
            inches: new Map([['chest', 40], ['length', 28]]), 
            cm: new Map([['chest', 101.6], ['length', 71.1]]) 
          },
          { 
            size: 'XL', 
            inches: new Map([['chest', 42], ['length', 29]]), 
            cm: new Map([['chest', 106.7], ['length', 73.7]]) 
          }
        ],
        howToMeasure: [
          new Map([['Chest', 'Measure around the fullest part of your chest']]),
          new Map([['Length', 'Measure from shoulder to desired length']])
        ],
        isSize: true,
        isMultipleColor: false,
        deliveryDescription: 'Delivered in 2-4 days',
        About: 'Comfortable cotton t-shirt perfect for everyday wear',
        PPQ: [{ minQty: 1, maxQty: 20, pricePerUnit: 800 }],
        deliveryPincode: [400001],
        returnPolicy: '30-day return policy',
      },
      {
        itemId: items[3]._id,
        imagesByColor: [
          {
            color: 'Red',
            hexCode: '#FF0000',
            images: [{ url: imageUrl, priority: 1, isTbyb: false, itemDetailImageId: generateUniqueId() }],
            sizes: [
              { size: 'XS', stock: 20, skuId: generateUniqueId() },
              { size: 'S', stock: 25, skuId: generateUniqueId() },
              { size: 'M', stock: 20, skuId: generateUniqueId() },
              { size: 'L', stock: 10, skuId: generateUniqueId() },
            ],
          },
        ],
        sizeChart: [
          { 
            size: 'XS', 
            inches: new Map([['bust', 32], ['waist', 26], ['hips', 34]]), 
            cm: new Map([['bust', 81.3], ['waist', 66], ['hips', 86.4]]) 
          },
          { 
            size: 'S', 
            inches: new Map([['bust', 34], ['waist', 28], ['hips', 36]]), 
            cm: new Map([['bust', 86.4], ['waist', 71.1], ['hips', 91.4]]) 
          },
          { 
            size: 'M', 
            inches: new Map([['bust', 36], ['waist', 30], ['hips', 38]]), 
            cm: new Map([['bust', 91.4], ['waist', 76.2], ['hips', 96.5]]) 
          },
          { 
            size: 'L', 
            inches: new Map([['bust', 38], ['waist', 32], ['hips', 40]]), 
            cm: new Map([['bust', 96.5], ['waist', 81.3], ['hips', 101.6]]) 
          }
        ],
        howToMeasure: [
          new Map([['Bust', 'Measure around the fullest part of your bust']]),
          new Map([['Waist', 'Measure around your natural waistline']]),
          new Map([['Hips', 'Measure around the fullest part of your hips']])
        ],
        isSize: true,
        isMultipleColor: false,
        deliveryDescription: 'Delivered in 3-5 days',
        About: 'Elegant evening dress perfect for special occasions',
        PPQ: [{ minQty: 1, maxQty: 10, pricePerUnit: 2400 }],
        deliveryPincode: [400001],
        returnPolicy: '30-day return policy',
      },
      {
        itemId: items[4]._id,
        imagesByColor: [
          {
            color: 'Silver',
            hexCode: '#C0C0C0',
            images: [{ url: imageUrl, priority: 1, isTbyb: false, itemDetailImageId: generateUniqueId() }],
            sizes: [
              { size: 'Standard', stock: 30, skuId: generateUniqueId() },
            ],
          },
        ],
        sizeChart: [
          { 
            size: 'Standard', 
            inches: new Map([['height', 12], ['width', 8]]), 
            cm: new Map([['height', 30.5], ['width', 20.3]]) 
          }
        ],
        howToMeasure: [
          new Map([['Height', 'Measure from base to top']]),
          new Map([['Width', 'Measure across the widest part']])
        ],
        isSize: true,
        isMultipleColor: false,
        deliveryDescription: 'Delivered in 4-6 days',
        About: 'Smart coffee maker with WiFi connectivity and app control',
        PPQ: [{ minQty: 1, maxQty: 5, pricePerUnit: 12000 }],
        deliveryPincode: [400001],
        returnPolicy: '30-day return policy',
      },
      {
        itemId: items[5]._id,
        imagesByColor: [
          {
            color: 'Black',
            hexCode: '#000000',
            images: [{ url: imageUrl, priority: 1, isTbyb: false, itemDetailImageId: generateUniqueId() }],
            sizes: [
              { size: 'Standard', stock: 20, skuId: generateUniqueId() },
            ],
          },
        ],
        sizeChart: [
          { 
            size: 'Standard', 
            inches: new Map([['length', 70], ['width', 30]]), 
            cm: new Map([['length', 177.8], ['width', 76.2]]) 
          }
        ],
        howToMeasure: [
          new Map([['Length', 'Measure the running surface length']]),
          new Map([['Width', 'Measure the running surface width']])
        ],
        isSize: true,
        isMultipleColor: false,
        deliveryDescription: 'Delivered in 7-10 days',
        About: 'Professional home treadmill with advanced features',
        PPQ: [{ minQty: 1, maxQty: 3, pricePerUnit: 36000 }],
        deliveryPincode: [400001],
        returnPolicy: '30-day return policy',
      },
    ]);

    // Coupons
    const coupons = await Coupon.insertMany([
      {
        couponCode: 'SAVE10',
        discountType: 'Percentage',
        discountValue: 10,
        minimumPurchase: 1000,
        expirationDate: new Date('2025-12-31'),
        isActive: true,
        couponUserIdUsed: [users[0]._id],
      },
    ]);

    // Filters
    const filters = await Filter.insertMany([
      {
        key: 'Brand',
        values: ['TechBrand', 'FashionBrand'],
      },
    ]);

    // Home Page Banners
    const banners = await HomePageBanner.insertMany([
      {
        bannerName: 'Summer Sale',
        bannerImageUrl: imageUrl,
      },
    ]);

    // Invoices
    const invoices = await Invoice.insertMany([
      {
        invoice: [
          { key: 'subtotal', value: 45000 },
          { key: 'tax', value: 4500 },
        ],
      },
    ]);

    // Phone OTPs
    const phoneOtps = await PhoneOtp.insertMany([
      {
        phoneNumber: '9717999451',
        otp: '123456',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        isVerified: true,
      },
    ]);

    // User Carts
    const userCarts = await UserCart.insertMany([
      {
        userId: users[0]._id,
        items: [
          {
            itemId: items[0]._id,
            quantity: 1,
            size: 'Standard',
            color: 'Black',
            skuId: itemDetails[0].imagesByColor[0].sizes[0].skuId,
            addedAt: new Date(),
          },
        ],
      },
    ]);

    // Partner Carts
    const partnerCarts = await PartnerCart.insertMany([
      {
        partnerId: partners[0]._id,
        items: [
          {
            itemId: items[0]._id,
            orderDetails: [
              {
                color: 'Black',
                sizeAndQuantity: [
                  { size: 'Standard', quantity: 1, skuId: itemDetails[0].imagesByColor[0].sizes[0].skuId },
                ],
              },
            ],
            totalQuantity: 1,
            totalPrice: 45000,
            addedAt: new Date(),
          },
        ],
      },
    ]);

    // User Orders - Create with staggered dates for better trends visualization
    const userOrders = await UserOrder.insertMany([
      {
        orderId: generateUniqueId(),
        userId: users[0]._id,
        orderDetails: [
          {
            itemId: items[0]._id,
            quantity: 1,
            size: 'Standard',
            color: 'Black',
            skuId: itemDetails[0].imagesByColor[0].sizes[0].skuId,
            addedAt: new Date('2025-06-30'),
            isReturn: false,
            isExchange: false,
          },
        ],
        invoice: [{ key: 'subtotal', value: 45000 }, { key: 'tax', value: 4500 }],
        shippingAddressId: userAddresses[0]._id,
        paymentMethod: 'Online',
        paymentStatus: 'Paid',
        phonepeOrderId: generateUniqueId(),
        phonepeMerchantOrderId: generateUniqueId(),
        checkoutPageUrl: 'https://checkout.example.com',
        orderStatus: 'Confirmed',
        orderStatusDate: new Date('2025-06-30'),
        isOrderPlaced: true,
        isOrderCancelled: false,
        totalAmount: 49500,
        deliveryDate: new Date('2025-07-04'),
        createdAt: new Date('2025-06-30')
      },
      {
        orderId: generateUniqueId(),
        userId: users[2]._id,
        orderDetails: [
          {
            itemId: items[1]._id,
            quantity: 1,
            size: 'Standard',
            color: 'Black',
            skuId: itemDetails[1].imagesByColor[0].sizes[0].skuId,
            addedAt: new Date('2025-07-25'),
            isReturn: false,
            isExchange: false,
          },
        ],
        invoice: [{ key: 'subtotal', value: 72000 }, { key: 'tax', value: 7200 }],
        shippingAddressId: userAddresses[0]._id,
        paymentMethod: 'Online',
        paymentStatus: 'Paid',
        phonepeOrderId: generateUniqueId(),
        phonepeMerchantOrderId: generateUniqueId(),
        checkoutPageUrl: 'https://checkout.example.com',
        orderStatus: 'Confirmed',
        orderStatusDate: new Date('2025-07-25'),
        isOrderPlaced: true,
        isOrderCancelled: false,
        totalAmount: 79200,
        deliveryDate: new Date('2025-08-02'),
        createdAt: new Date('2025-07-25')
      },
      {
        orderId: generateUniqueId(),
        userId: users[3]._id,
        orderDetails: [
          {
            itemId: items[3]._id,
            quantity: 1,
            size: 'Standard',
            color: 'Red',
            skuId: itemDetails[3].imagesByColor[0].sizes[0].skuId,
            addedAt: new Date('2025-08-25'),
            isReturn: false,
            isExchange: false,
          },
        ],
        invoice: [{ key: 'subtotal', value: 2400 }, { key: 'tax', value: 240 }],
        shippingAddressId: userAddresses[0]._id,
        paymentMethod: 'Online',
        paymentStatus: 'Paid',
        phonepeOrderId: generateUniqueId(),
        phonepeMerchantOrderId: generateUniqueId(),
        checkoutPageUrl: 'https://checkout.example.com',
        orderStatus: 'Confirmed',
        orderStatusDate: new Date('2025-08-25'),
        isOrderPlaced: true,
        isOrderCancelled: false,
        totalAmount: 2640,
        deliveryDate: new Date('2025-08-30'),
        createdAt: new Date('2025-08-25')
      },
      {
        orderId: generateUniqueId(),
        userId: users[4]._id,
        orderDetails: [
          {
            itemId: items[5]._id,
            quantity: 1,
            size: 'Standard',
            color: 'Black',
            skuId: itemDetails[5].imagesByColor[0].sizes[0].skuId,
            addedAt: new Date('2025-09-20'),
            isReturn: false,
            isExchange: false,
          },
        ],
        invoice: [{ key: 'subtotal', value: 36000 }, { key: 'tax', value: 3600 }],
        shippingAddressId: userAddresses[0]._id,
        paymentMethod: 'Online',
        paymentStatus: 'Paid',
        phonepeOrderId: generateUniqueId(),
        phonepeMerchantOrderId: generateUniqueId(),
        checkoutPageUrl: 'https://checkout.example.com',
        orderStatus: 'Confirmed',
        orderStatusDate: new Date('2025-09-20'),
        isOrderPlaced: true,
        isOrderCancelled: false,
        totalAmount: 39600,
        deliveryDate: new Date('2025-09-25'),
        createdAt: new Date('2025-09-20')
      },
    ]);

    // Partner Orders - Create with staggered dates for better trends visualization
    const partnerOrders = await PartnerOrder.insertMany([
      {
        orderId: generateUniqueId(),
        partnerId: partners[0]._id,
        orderProductDetails: [
          {
            itemId: items[0]._id,
            orderDetails: [
              {
                color: 'Black',
                sizeAndQuantity: [
                  { size: 'Standard', quantity: 1, skuId: itemDetails[0].imagesByColor[0].sizes[0].skuId },
                ],
              },
            ],
            totalQuantity: 1,
            totalPrice: 45000,
            addedAt: new Date('2025-07-05'),
          },
        ],
        invoice: [{ key: 'subtotal', values: '45000' }, { key: 'tax', values: '4500' }],
        shippingAddressId: partnerAddresses[0]._id,
        orderStatus: 'In transit',
        isOrderPlaced: true,
        isOrderReturned: false,
        phonepeOrderId: generateUniqueId(),
        phonepeMerchantOrderId: generateUniqueId(),
        checkoutPageUrl: 'https://checkout.example.com',
        isOnlinePayment: true,
        onlineAmount: 49500,
        paymentStatus: 'Paid',
        totalAmount: 49500,
        createdAt: new Date('2025-07-05')
      },
      {
        orderId: generateUniqueId(),
        partnerId: partners[1]._id,
        orderProductDetails: [
          {
            itemId: items[1]._id,
            orderDetails: [
              {
                color: 'Black',
                sizeAndQuantity: [
                  { size: 'Standard', quantity: 2, skuId: itemDetails[1].imagesByColor[0].sizes[0].skuId },
                ],
              },
            ],
            totalQuantity: 2,
            totalPrice: 144000,
            addedAt: new Date('2025-08-10'),
          },
        ],
        invoice: [{ key: 'subtotal', values: '144000' }, { key: 'tax', values: '14400' }],
        shippingAddressId: partnerAddresses[0]._id,
        orderStatus: 'Delivered',
        isOrderPlaced: true,
        isOrderReturned: false,
        phonepeOrderId: generateUniqueId(),
        phonepeMerchantOrderId: generateUniqueId(),
        checkoutPageUrl: 'https://checkout.example.com',
        isOnlinePayment: true,
        onlineAmount: 158400,
        paymentStatus: 'Paid',
        totalAmount: 158400,
        createdAt: new Date('2025-08-10')
      },
      {
        orderId: generateUniqueId(),
        partnerId: partners[2]._id,
        orderProductDetails: [
          {
            itemId: items[3]._id,
            orderDetails: [
              {
                color: 'Red',
                sizeAndQuantity: [
                  { size: 'Standard', quantity: 5, skuId: itemDetails[3].imagesByColor[0].sizes[0].skuId },
                ],
              },
            ],
            totalQuantity: 5,
            totalPrice: 12000,
            addedAt: new Date('2025-09-15'),
          },
        ],
        invoice: [{ key: 'subtotal', values: '12000' }, { key: 'tax', values: '1200' }],
        shippingAddressId: partnerAddresses[0]._id,
        orderStatus: 'Ready for Dispatch',
        isOrderPlaced: true,
        isOrderReturned: false,
        phonepeOrderId: generateUniqueId(),
        phonepeMerchantOrderId: generateUniqueId(),
        checkoutPageUrl: 'https://checkout.example.com',
        isOnlinePayment: true,
        onlineAmount: 13200,
        paymentStatus: 'Paid',
        totalAmount: 13200,
        createdAt: new Date('2025-09-15')
      },
    ]);

    // Partner Rating Reviews
    const partnerRatingReviews = await PartnerRatingReview.insertMany([
      {
        partnerId: partners[0]._id,
        itemDetailId: itemDetails[0]._id,
        rating: 4,
        review: 'Great product!',
        customerProductImage: [imageUrl],
        sizeBought: 'Standard',
      },
    ]);

    // User Rating Reviews
    const userRatingReviews = await UserRatingReview.insertMany([
      {
        userId: users[0]._id,
        itemId: items[0]._id,
        rating: 4.5,
        review: 'Excellent smartphone!',
        customerProductImage: [imageUrl],
        sizeBought: 'Standard',
      },
    ]);

    // Partner Wallets
    const partnerWallets = await PartnerWallet.insertMany([
      {
        partnerId: partners[0]._id,
        totalBalance: 10000,
        currency: 'INR',
        isActive: true,
        transactions: [
          {
            type: 'credit',
            amount: 10000,
            description: 'Initial deposit',
            orderId: partnerOrders[0].orderId,
            status: 'completed',
            createdAt: new Date(),
          },
        ],
      },
    ]);

    // User Wishlist
    const userWishlists = await UserWishlist.insertMany([
      {
        userId: users[0]._id,
        items: [
          { itemId: items[0]._id, color: 'Black' },
        ],
      },
    ]);

    // Partner Wishlist
    const partnerWishlists = await PartnerWishlist.insertMany([
      {
        partnerId: partners[0]._id,
        items: [
          { itemId: items[0]._id, color: 'Black' },
        ],
      },
    ]);

    // Privacy Policy
    const privacyPolicies = await PrivacyPolicy.insertMany([
      {
        privacyPolicy: [
          {
            question: 'What data do we collect?',
            answer: ['We collect personal information such as name, email, and phone number.'],
          },
        ],
      },
    ]);

    // User TBYB
    const userTBYBs = await UserTBYB.insertMany([
      {
        userId: users[0]._id,
        images: [
          {
            itemId: items[0]._id,
            tbybImageUrl: [imageUrl],
          },
        ],
      },
    ]);

    console.log('Database seeded successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run the seed function
seedDatabase();