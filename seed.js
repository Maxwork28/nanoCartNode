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
const AuditLog = require('./models/AuditLog/AuditLog');
const HomePageSection = require('./models/HomePage/HomePageSection');

// MongoDB connection
const MONGO_URI = 'mongodb://localhost:27017/nanoCart'; // Updated database name

// Helper function to generate unique IDs
function generateUniqueId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

// Helper function to create audit logs
async function createAuditLog(userId, userRole, userName, userPhoneNumber, action, resource, resourceId, changes, previousValues, description, status = 'SUCCESS', errorMessage = null, requestData = null, responseData = null) {
  try {
    const auditData = {
      userId: userId,
      userRole: userRole,
      userName: userName,
      userPhoneNumber: userPhoneNumber,
      action: action,
      resource: resource,
      resourceId: resourceId,
      changes: changes,
      previousValues: previousValues,
      ipAddress: '127.0.0.1', // Local IP for seed data
      userAgent: 'Seed Script',
      description: description,
      status: status,
      errorMessage: errorMessage,
      requestData: requestData,
      responseData: responseData
    };

    await AuditLog.createLog(auditData);
    console.log(`✅ Audit log created: ${userRole} ${action} ${resource}`);
  } catch (error) {
    console.error('❌ Failed to create audit log:', error);
  }
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
    const imageUrl = 'https://maatebucket.s3.ap-south-1.amazonaws.com/Nanocart/categories/68dad78d01850599898b909f/subCategories/68dad78e01850599898b90c6/item/68dad8bba099dd2689f16328/1759172832782_limited_edition_hoodie_001.jpghttps://maatebucket.s3.ap-south-1.amazonaws.com/Nanocart/categories/68dad78d01850599898b909f/subCategories/68dad78e01850599898b90c6/item/68dad8bba099dd2689f16328/1759172832782_limited_edition_hoodie_001.jpg.png';

    // Categories - Create with staggered dates for better trends visualization
    const categories = await Category.insertMany([
      { 
        name: 'Men\'s Clothing', 
        description: 'Men\'s fashion and apparel', 
        image: imageUrl,
        createdAt: new Date('2025-06-15') // June
      },
      { 
        name: 'Women\'s Clothing', 
        description: 'Women\'s fashion and apparel', 
        image: imageUrl,
        createdAt: new Date('2025-07-20') // July
      },
      { 
        name: 'Kids\' Clothing', 
        description: 'Children\'s fashion and apparel', 
        image: imageUrl,
        createdAt: new Date('2025-08-10') // August
      },
      { 
        name: 'Accessories', 
        description: 'Fashion accessories and jewelry', 
        image: imageUrl,
        createdAt: new Date('2025-09-05') // September
      },
    ]);

    // Create audit logs for category creation
    for (let i = 0; i < categories.length; i++) {
      await createAuditLog(
        null, // No specific user for seed data
        'SYSTEM',
        'System',
        '0000000000',
        'CREATE',
        'CATEGORY',
        categories[i]._id,
        { name: categories[i].name, description: categories[i].description },
        null,
        `System created category: ${categories[i].name}`,
        'SUCCESS',
        null,
        { name: categories[i].name, description: categories[i].description },
        { success: true, categoryId: categories[i]._id }
      );
    }

    // SubCategories - Create with staggered dates
    const subCategories = await SubCategory.insertMany([
      { 
        name: 'T-Shirts', 
        description: 'Men\'s casual t-shirts', 
        image: imageUrl, 
        categoryId: categories[0]._id, 
        isTrendy: true,
        createdAt: new Date('2025-06-20')
      },
      { 
        name: 'Shirts', 
        description: 'Men\'s formal and casual shirts', 
        image: imageUrl, 
        categoryId: categories[0]._id, 
        isTrendy: true,
        createdAt: new Date('2025-07-15')
      },
      { 
        name: 'Jeans', 
        description: 'Men\'s denim jeans', 
        image: imageUrl, 
        categoryId: categories[0]._id, 
        isTrendy: false,
        createdAt: new Date('2025-07-25')
      },
      { 
        name: 'Dresses', 
        description: 'Women\'s dresses', 
        image: imageUrl, 
        categoryId: categories[1]._id, 
        isTrendy: true,
        createdAt: new Date('2025-08-15')
      },
      { 
        name: 'Tops', 
        description: 'Women\'s tops and blouses', 
        image: imageUrl, 
        categoryId: categories[1]._id, 
        isTrendy: false,
        createdAt: new Date('2025-08-20')
      },
      { 
        name: 'Skirts', 
        description: 'Women\'s skirts', 
        image: imageUrl, 
        categoryId: categories[1]._id, 
        isTrendy: true,
        createdAt: new Date('2025-09-10')
      },
      { 
        name: 'Kids T-Shirts', 
        description: 'Children\'s t-shirts', 
        image: imageUrl, 
        categoryId: categories[2]._id, 
        isTrendy: true,
        createdAt: new Date('2025-09-15')
      },
      { 
        name: 'Kids Dresses', 
        description: 'Children\'s dresses', 
        image: imageUrl, 
        categoryId: categories[2]._id, 
        isTrendy: false,
        createdAt: new Date('2025-09-20')
      },
      { 
        name: 'Watches', 
        description: 'Fashion watches', 
        image: imageUrl, 
        categoryId: categories[3]._id, 
        isTrendy: true,
        createdAt: new Date('2025-09-25')
      },
      { 
        name: 'Bags', 
        description: 'Handbags and purses', 
        image: imageUrl, 
        categoryId: categories[3]._id, 
        isTrendy: false,
        createdAt: new Date('2025-09-30')
      },
    ]);

    // Create audit logs for subcategory creation
    for (let i = 0; i < subCategories.length; i++) {
      await createAuditLog(
        null,
        'SYSTEM',
        'System',
        '0000000000',
        'CREATE',
        'SUBCATEGORY',
        subCategories[i]._id,
        { name: subCategories[i].name, description: subCategories[i].description, categoryId: subCategories[i].categoryId },
        null,
        `System created subcategory: ${subCategories[i].name} under category: ${categories.find(c => c._id.equals(subCategories[i].categoryId))?.name}`,
        'SUCCESS',
        null,
        { name: subCategories[i].name, description: subCategories[i].description, categoryId: subCategories[i].categoryId },
        { success: true, subCategoryId: subCategories[i]._id }
      );
    }

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
        phoneNumber: '9829699381',
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

    // Create audit logs for user creation and login attempts
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      
      // Log user creation
      await createAuditLog(
        user._id,
        user.role,
        user.name,
        user.phoneNumber,
        'CREATE',
        'USER',
        user._id,
        { name: user.name, email: user.email, role: user.role, phoneNumber: user.phoneNumber },
        null,
        `Created ${user.role.toLowerCase()}: ${user.name}`,
        'SUCCESS',
        null,
        { name: user.name, email: user.email, role: user.role, phoneNumber: user.phoneNumber },
        { success: true, userId: user._id }
      );

      // Log successful login for admin users
      if (user.role === 'Admin' || user.role === 'SubAdmin') {
        await createAuditLog(
          user._id,
          user.role,
          user.name,
          user.phoneNumber,
          'LOGIN',
          'USER',
          user._id,
          null,
          null,
          `${user.role} logged in successfully`,
          'SUCCESS',
          null,
          { phoneNumber: user.phoneNumber },
          { success: true, token: 'generated_token' }
        );
      }
    }

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

    // Create audit logs for partner creation
    for (let i = 0; i < partners.length; i++) {
      await createAuditLog(
        partners[i].partner,
        'Partner',
        partners[i].name,
        partners[i].phoneNumber,
        'CREATE',
        'PARTNER',
        partners[i]._id,
        { name: partners[i].name, email: partners[i].email, phoneNumber: partners[i].phoneNumber, isVerified: partners[i].isVerified },
        null,
        `Created partner: ${partners[i].name}`,
        'SUCCESS',
        null,
        { name: partners[i].name, email: partners[i].email, phoneNumber: partners[i].phoneNumber },
        { success: true, partnerId: partners[i]._id }
      );
    }

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
        name: 'Classic Cotton T-Shirt',
        description: 'Premium cotton t-shirt for men',
        MRP: 1200,
        totalStock: 150,
        image: imageUrl,
        itemImageId: generateUniqueId(),
        discountedPrice: 999,
        defaultColor: 'White',
        isItemDetail: true,
        categoryId: categories[0]._id,
        subCategoryId: subCategories[0]._id,
        filters: [{ key: 'Material', value: 'Cotton' }, { key: 'Brand', value: 'FashionBrand' }],
        userAverageRating: 4.5,
        metaTitle: 'Classic Cotton T-Shirt - Premium Men\'s Wear',
        metaDescription: 'High-quality cotton t-shirt perfect for everyday casual wear',
        searchKeywords: ['t-shirt', 'cotton', 'men', 'casual', 'premium'],
        createdAt: new Date('2025-06-25')
      },
      {
        name: 'Formal Business Shirt',
        description: 'Professional formal shirt for office wear',
        MRP: 2500,
        totalStock: 80,
        image: imageUrl,
        itemImageId: generateUniqueId(),
        discountedPrice: 1999,
        defaultColor: 'Blue',
        isItemDetail: true,
        categoryId: categories[0]._id,
        subCategoryId: subCategories[1]._id,
        filters: [{ key: 'Material', value: 'Cotton' }, { key: 'Style', value: 'Formal' }],
        userAverageRating: 4.7,
        metaTitle: 'Formal Business Shirt - Professional Office Wear',
        metaDescription: 'Elegant formal shirt perfect for business meetings and office wear',
        searchKeywords: ['shirt', 'formal', 'business', 'office', 'professional'],
        createdAt: new Date('2025-07-10')
      },
      {
        name: 'Slim Fit Jeans',
        description: 'Modern slim fit denim jeans',
        MRP: 3000,
        totalStock: 60,
        image: imageUrl,
        itemImageId: generateUniqueId(),
        discountedPrice: 2499,
        defaultColor: 'Blue',
        isItemDetail: true,
        categoryId: categories[0]._id,
        subCategoryId: subCategories[2]._id,
        filters: [{ key: 'Material', value: 'Denim' }, { key: 'Fit', value: 'Slim' }],
        userAverageRating: 4.3,
        metaTitle: 'Slim Fit Jeans - Modern Denim Wear',
        metaDescription: 'Stylish slim fit jeans perfect for casual and semi-formal occasions',
        searchKeywords: ['jeans', 'slim fit', 'denim', 'casual', 'modern'],
        createdAt: new Date('2025-08-05')
      },
      {
        name: 'Elegant Evening Dress',
        description: 'Beautiful evening dress for special occasions',
        MRP: 4500,
        totalStock: 40,
        image: imageUrl,
        itemImageId: generateUniqueId(),
        discountedPrice: 3599,
        defaultColor: 'Black',
        isItemDetail: true,
        categoryId: categories[1]._id,
        subCategoryId: subCategories[3]._id,
        filters: [{ key: 'Style', value: 'Evening' }, { key: 'Occasion', value: 'Party' }],
        userAverageRating: 4.8,
        metaTitle: 'Elegant Evening Dress - Special Occasion Wear',
        metaDescription: 'Stunning evening dress perfect for parties, dinners, and special events',
        searchKeywords: ['dress', 'evening', 'elegant', 'party', 'special occasion'],
        createdAt: new Date('2025-07-20')
      },
      {
        name: 'Casual Summer Top',
        description: 'Light and comfortable summer top',
        MRP: 1800,
        totalStock: 100,
        image: imageUrl,
        itemImageId: generateUniqueId(),
        discountedPrice: 1299,
        defaultColor: 'Pink',
        isItemDetail: true,
        categoryId: categories[1]._id,
        subCategoryId: subCategories[4]._id,
        filters: [{ key: 'Season', value: 'Summer' }, { key: 'Style', value: 'Casual' }],
        userAverageRating: 4.4,
        metaTitle: 'Casual Summer Top - Light and Comfortable',
        metaDescription: 'Perfect summer top for casual outings and everyday wear',
        searchKeywords: ['top', 'summer', 'casual', 'light', 'comfortable'],
        createdAt: new Date('2025-07-28')
      },
      {
        name: 'A-Line Skirt',
        description: 'Classic A-line skirt for women',
        MRP: 2200,
        totalStock: 50,
        image: imageUrl,
        itemImageId: generateUniqueId(),
        discountedPrice: 1799,
        defaultColor: 'Navy',
        isItemDetail: true,
        categoryId: categories[1]._id,
        subCategoryId: subCategories[5]._id,
        filters: [{ key: 'Style', value: 'A-Line' }, { key: 'Length', value: 'Knee Length' }],
        userAverageRating: 4.6,
        metaTitle: 'A-Line Skirt - Classic Women\'s Wear',
        metaDescription: 'Timeless A-line skirt perfect for office and casual wear',
        searchKeywords: ['skirt', 'a-line', 'classic', 'office', 'women'],
        createdAt: new Date('2025-08-20')
      },
      {
        name: 'Kids Cartoon T-Shirt',
        description: 'Fun cartoon printed t-shirt for kids',
        MRP: 800,
        totalStock: 120,
        image: imageUrl,
        itemImageId: generateUniqueId(),
        discountedPrice: 599,
        defaultColor: 'Yellow',
        isItemDetail: true,
        categoryId: categories[2]._id,
        subCategoryId: subCategories[6]._id,
        filters: [{ key: 'Age Group', value: 'Kids' }, { key: 'Design', value: 'Cartoon' }],
        userAverageRating: 4.2,
        metaTitle: 'Kids Cartoon T-Shirt - Fun and Colorful',
        metaDescription: 'Adorable cartoon printed t-shirt that kids will love',
        searchKeywords: ['kids', 't-shirt', 'cartoon', 'fun', 'colorful'],
        createdAt: new Date('2025-08-25')
      },
      {
        name: 'Princess Dress for Girls',
        description: 'Beautiful princess dress for little girls',
        MRP: 1500,
        totalStock: 30,
        image: imageUrl,
        itemImageId: generateUniqueId(),
        discountedPrice: 1199,
        defaultColor: 'Pink',
        isItemDetail: true,
        categoryId: categories[2]._id,
        subCategoryId: subCategories[7]._id,
        filters: [{ key: 'Style', value: 'Princess' }, { key: 'Age Group', value: 'Girls' }],
        userAverageRating: 4.9,
        metaTitle: 'Princess Dress - Magical Girls Wear',
        metaDescription: 'Enchanting princess dress perfect for parties and special occasions',
        searchKeywords: ['princess', 'dress', 'girls', 'party', 'magical'],
        createdAt: new Date('2025-09-15')
      },
      {
        name: 'Limited Edition Hoodie',
        description: 'Premium limited edition hoodie',
        MRP: 3500,
        totalStock: 15,
        image: imageUrl,
        itemImageId: generateUniqueId(),
        discountedPrice: 2799,
        defaultColor: 'Black',
        isItemDetail: true,
        categoryId: categories[0]._id,
        subCategoryId: subCategories[0]._id,
        filters: [{ key: 'Material', value: 'Fleece' }, { key: 'Edition', value: 'Limited' }],
        userAverageRating: 4.7,
        metaTitle: 'Limited Edition Hoodie - Premium Streetwear',
        metaDescription: 'Exclusive limited edition hoodie with premium fleece material',
        searchKeywords: ['hoodie', 'limited edition', 'premium', 'streetwear', 'fleece'],
        createdAt: new Date('2025-08-15')
      },
      {
        name: 'Designer Handbag',
        description: 'Elegant designer handbag for women',
        MRP: 8000,
        totalStock: 25,
        image: imageUrl,
        itemImageId: generateUniqueId(),
        discountedPrice: 5999,
        defaultColor: 'Brown',
        isItemDetail: true,
        categoryId: categories[3]._id,
        subCategoryId: subCategories[9]._id,
        filters: [{ key: 'Brand', value: 'Designer' }, { key: 'Type', value: 'Handbag' }],
        userAverageRating: 4.8,
        metaTitle: 'Designer Handbag - Luxury Accessory',
        metaDescription: 'Sophisticated designer handbag perfect for formal and casual occasions',
        searchKeywords: ['handbag', 'designer', 'luxury', 'elegant', 'accessory'],
        createdAt: new Date('2025-09-05')
      },
    ]);

    // Create audit logs for item creation (SubAdmin activities)
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      // Simulate SubAdmin creating items
      const subAdminUser = users.find(u => u.role === 'SubAdmin' && u.isSubAdminActive);
      
      if (subAdminUser) {
        await createAuditLog(
          subAdminUser._id,
          'SubAdmin',
          subAdminUser.name,
          subAdminUser.phoneNumber,
          'CREATE',
          'ITEM',
          item._id,
          { 
            name: item.name, 
            description: item.description, 
            MRP: item.MRP, 
            totalStock: item.totalStock,
            categoryId: item.categoryId,
            subCategoryId: item.subCategoryId
          },
          null,
          `SubAdmin created item: ${item.name} with stock: ${item.totalStock}`,
          'SUCCESS',
          null,
          { 
            name: item.name, 
            description: item.description, 
            MRP: item.MRP, 
            totalStock: item.totalStock,
            categoryId: item.categoryId,
            subCategoryId: item.subCategoryId
          },
          { success: true, itemId: item._id }
        );

        // Log low stock warning for items with low stock
        if (item.totalStock <= 10) {
          await createAuditLog(
            subAdminUser._id,
            'SubAdmin',
            subAdminUser.name,
            subAdminUser.phoneNumber,
            'READ',
            'ITEM',
            item._id,
            { totalStock: item.totalStock, isLowStock: true },
            null,
            `SubAdmin viewed low stock item: ${item.name} (Stock: ${item.totalStock})`,
            'SUCCESS',
            null,
            { itemId: item._id, totalStock: item.totalStock },
            { success: true, lowStockWarning: true }
          );
        }
      }
    }

    // Item Details
    const itemDetails = await ItemDetail.insertMany([
      {
        itemId: items[0]._id, // Classic Cotton T-Shirt
        imagesByColor: [
          {
            color: 'White',
            hexCode: '#FFFFFF',
            images: [{ url: imageUrl, priority: 1, isTbyb: false, itemDetailImageId: generateUniqueId() }],
            sizes: [
              { size: 'XS', stock: 20, skuId: generateUniqueId() },
              { size: 'S', stock: 25, skuId: generateUniqueId() },
              { size: 'M', stock: 30, skuId: generateUniqueId() },
              { size: 'L', stock: 25, skuId: generateUniqueId() },
              { size: 'XL', stock: 20, skuId: generateUniqueId() },
              { size: '2XL', stock: 15, skuId: generateUniqueId() },
              { size: '3XL', stock: 10, skuId: generateUniqueId() },
            ],
          },
          {
            color: 'Black',
            hexCode: '#000000',
            images: [{ url: imageUrl, priority: 1, isTbyb: false, itemDetailImageId: generateUniqueId() }],
            sizes: [
              { size: 'XS', stock: 15, skuId: generateUniqueId() },
              { size: 'S', stock: 20, skuId: generateUniqueId() },
              { size: 'M', stock: 25, skuId: generateUniqueId() },
              { size: 'L', stock: 20, skuId: generateUniqueId() },
              { size: 'XL', stock: 15, skuId: generateUniqueId() },
              { size: '2XL', stock: 10, skuId: generateUniqueId() },
              { size: '3XL', stock: 5, skuId: generateUniqueId() },
            ],
          },
        ],
        sizeChart: [
          { 
            size: 'XS', 
            inches: new Map([['chest', 34], ['length', 26]]), 
            cm: new Map([['chest', 86.4], ['length', 66]]) 
          },
          { 
            size: 'S', 
            inches: new Map([['chest', 36], ['length', 27]]), 
            cm: new Map([['chest', 91.4], ['length', 68.6]]) 
          },
          { 
            size: 'M', 
            inches: new Map([['chest', 38], ['length', 28]]), 
            cm: new Map([['chest', 96.5], ['length', 71.1]]) 
          },
          { 
            size: 'L', 
            inches: new Map([['chest', 40], ['length', 29]]), 
            cm: new Map([['chest', 101.6], ['length', 73.7]]) 
          },
          { 
            size: 'XL', 
            inches: new Map([['chest', 42], ['length', 30]]), 
            cm: new Map([['chest', 106.7], ['length', 76.2]]) 
          },
          { 
            size: '2XL', 
            inches: new Map([['chest', 44], ['length', 31]]), 
            cm: new Map([['chest', 111.8], ['length', 78.7]]) 
          },
          { 
            size: '3XL', 
            inches: new Map([['chest', 46], ['length', 32]]), 
            cm: new Map([['chest', 116.8], ['length', 81.3]]) 
          }
        ],
        howToMeasure: [
          new Map([['Chest', 'Measure around the fullest part of your chest']]),
          new Map([['Length', 'Measure from shoulder to desired length']])
        ],
        isSize: true,
        isMultipleColor: true,
        deliveryDescription: 'Delivered in 2-4 days',
        About: 'Premium cotton t-shirt made from 100% organic cotton for ultimate comfort and style',
        PPQ: [{ minQty: 1, maxQty: 20, pricePerUnit: 999 }],
        deliveryPincode: [400001, 400002, 400003, 400004, 400005],
        returnPolicy: '30-day return policy with free exchange',
        metaTitle: 'Classic Cotton T-Shirt Details - Size Chart & Measurements',
        metaDescription: 'Complete size chart and measurement guide for the premium cotton t-shirt with delivery and return information',
        searchKeywords: ['t-shirt size chart', 'cotton shirt measurements', 'men clothing sizes', 'shirt details'],
      },
      {
        itemId: items[1]._id, // Formal Business Shirt
        imagesByColor: [
          {
            color: 'Blue',
            hexCode: '#0066CC',
            images: [{ url: imageUrl, priority: 1, isTbyb: false, itemDetailImageId: generateUniqueId() }],
            sizes: [
              { size: 'XS', stock: 10, skuId: generateUniqueId() },
              { size: 'S', stock: 15, skuId: generateUniqueId() },
              { size: 'M', stock: 20, skuId: generateUniqueId() },
              { size: 'L', stock: 15, skuId: generateUniqueId() },
              { size: 'XL', stock: 10, skuId: generateUniqueId() },
              { size: '2XL', stock: 5, skuId: generateUniqueId() },
              { size: '3XL', stock: 5, skuId: generateUniqueId() },
            ],
          },
          {
            color: 'White',
            hexCode: '#FFFFFF',
            images: [{ url: imageUrl, priority: 1, isTbyb: false, itemDetailImageId: generateUniqueId() }],
            sizes: [
              { size: 'XS', stock: 8, skuId: generateUniqueId() },
              { size: 'S', stock: 12, skuId: generateUniqueId() },
              { size: 'M', stock: 18, skuId: generateUniqueId() },
              { size: 'L', stock: 12, skuId: generateUniqueId() },
              { size: 'XL', stock: 8, skuId: generateUniqueId() },
              { size: '2XL', stock: 4, skuId: generateUniqueId() },
              { size: '3XL', stock: 3, skuId: generateUniqueId() },
            ],
          },
        ],
        sizeChart: [
          { 
            size: 'XS', 
            inches: new Map([['chest', 34], ['length', 28], ['sleeve', 32]]), 
            cm: new Map([['chest', 86.4], ['length', 71.1], ['sleeve', 81.3]]) 
          },
          { 
            size: 'S', 
            inches: new Map([['chest', 36], ['length', 29], ['sleeve', 33]]), 
            cm: new Map([['chest', 91.4], ['length', 73.7], ['sleeve', 83.8]]) 
          },
          { 
            size: 'M', 
            inches: new Map([['chest', 38], ['length', 30], ['sleeve', 34]]), 
            cm: new Map([['chest', 96.5], ['length', 76.2], ['sleeve', 86.4]]) 
          },
          { 
            size: 'L', 
            inches: new Map([['chest', 40], ['length', 31], ['sleeve', 35]]), 
            cm: new Map([['chest', 101.6], ['length', 78.7], ['sleeve', 88.9]]) 
          },
          { 
            size: 'XL', 
            inches: new Map([['chest', 42], ['length', 32], ['sleeve', 36]]), 
            cm: new Map([['chest', 106.7], ['length', 81.3], ['sleeve', 91.4]]) 
          },
          { 
            size: '2XL', 
            inches: new Map([['chest', 44], ['length', 33], ['sleeve', 37]]), 
            cm: new Map([['chest', 111.8], ['length', 83.8], ['sleeve', 94]]) 
          },
          { 
            size: '3XL', 
            inches: new Map([['chest', 46], ['length', 34], ['sleeve', 38]]), 
            cm: new Map([['chest', 116.8], ['length', 86.4], ['sleeve', 96.5]]) 
          }
        ],
        howToMeasure: [
          new Map([['Chest', 'Measure around the fullest part of your chest']]),
          new Map([['Length', 'Measure from shoulder to desired length']]),
          new Map([['Sleeve', 'Measure from shoulder to wrist']])
        ],
        isSize: true,
        isMultipleColor: true,
        deliveryDescription: 'Delivered in 3-5 days',
        About: 'Professional formal shirt made from premium cotton blend for business and office wear',
        PPQ: [{ minQty: 1, maxQty: 10, pricePerUnit: 1999 }],
        deliveryPincode: [400001, 400002, 400003, 400004, 400005],
        returnPolicy: '30-day return policy with free exchange',
        metaTitle: 'Formal Business Shirt Details - Size Chart & Measurements',
        metaDescription: 'Complete size chart and measurement guide for the professional formal shirt with delivery and return information',
        searchKeywords: ['formal shirt size chart', 'business shirt measurements', 'office wear sizes', 'shirt details'],
      },
      {
        itemId: items[2]._id, // Slim Fit Jeans
        imagesByColor: [
          {
            color: 'Blue',
            hexCode: '#0066CC',
            images: [{ url: imageUrl, priority: 1, isTbyb: false, itemDetailImageId: generateUniqueId() }],
            sizes: [
              { size: 'XS', stock: 8, skuId: generateUniqueId() },
              { size: 'S', stock: 12, skuId: generateUniqueId() },
              { size: 'M', stock: 15, skuId: generateUniqueId() },
              { size: 'L', stock: 12, skuId: generateUniqueId() },
              { size: 'XL', stock: 8, skuId: generateUniqueId() },
              { size: '2XL', stock: 3, skuId: generateUniqueId() },
              { size: '3XL', stock: 2, skuId: generateUniqueId() },
            ],
          },
          {
            color: 'Black',
            hexCode: '#000000',
            images: [{ url: imageUrl, priority: 1, isTbyb: false, itemDetailImageId: generateUniqueId() }],
            sizes: [
              { size: 'XS', stock: 6, skuId: generateUniqueId() },
              { size: 'S', stock: 10, skuId: generateUniqueId() },
              { size: 'M', stock: 12, skuId: generateUniqueId() },
              { size: 'L', stock: 10, skuId: generateUniqueId() },
              { size: 'XL', stock: 6, skuId: generateUniqueId() },
              { size: '2XL', stock: 2, skuId: generateUniqueId() },
              { size: '3XL', stock: 1, skuId: generateUniqueId() },
            ],
          },
        ],
        sizeChart: [
          { 
            size: 'XS', 
            inches: new Map([['waist', 28], ['inseam', 30], ['hip', 36]]), 
            cm: new Map([['waist', 71.1], ['inseam', 76.2], ['hip', 91.4]]) 
          },
          { 
            size: 'S', 
            inches: new Map([['waist', 30], ['inseam', 30], ['hip', 38]]), 
            cm: new Map([['waist', 76.2], ['inseam', 76.2], ['hip', 96.5]]) 
          },
          { 
            size: 'M', 
            inches: new Map([['waist', 32], ['inseam', 32], ['hip', 40]]), 
            cm: new Map([['waist', 81.3], ['inseam', 81.3], ['hip', 101.6]]) 
          },
          { 
            size: 'L', 
            inches: new Map([['waist', 34], ['inseam', 32], ['hip', 42]]), 
            cm: new Map([['waist', 86.4], ['inseam', 81.3], ['hip', 106.7]]) 
          },
          { 
            size: 'XL', 
            inches: new Map([['waist', 36], ['inseam', 34], ['hip', 44]]), 
            cm: new Map([['waist', 91.4], ['inseam', 86.4], ['hip', 111.8]]) 
          },
          { 
            size: '2XL', 
            inches: new Map([['waist', 38], ['inseam', 34], ['hip', 46]]), 
            cm: new Map([['waist', 96.5], ['inseam', 86.4], ['hip', 116.8]]) 
          },
          { 
            size: '3XL', 
            inches: new Map([['waist', 40], ['inseam', 34], ['hip', 48]]), 
            cm: new Map([['waist', 101.6], ['inseam', 86.4], ['hip', 121.9]]) 
          }
        ],
        howToMeasure: [
          new Map([['Waist', 'Measure around your natural waistline']]),
          new Map([['Inseam', 'Measure from crotch to ankle']]),
          new Map([['Hip', 'Measure around the fullest part of your hips']])
        ],
        isSize: true,
        isMultipleColor: true,
        deliveryDescription: 'Delivered in 3-5 days',
        About: 'Modern slim fit jeans made from premium denim with stretch for comfort and style',
        PPQ: [{ minQty: 1, maxQty: 15, pricePerUnit: 2499 }],
        deliveryPincode: [400001, 400002, 400003, 400004, 400005],
        returnPolicy: '30-day return policy with free exchange',
        metaTitle: 'Slim Fit Jeans Details - Size Chart & Measurements',
        metaDescription: 'Complete size chart and measurement guide for the modern slim fit jeans with delivery and return information',
        searchKeywords: ['jeans size chart', 'slim fit measurements', 'denim sizes', 'jeans details'],
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
        metaTitle: 'Designer Dress Details - Size Guide & Measurements',
        metaDescription: 'Detailed size guide and measurement instructions for the elegant designer evening dress with delivery information',
        searchKeywords: ['dress size chart', 'evening dress measurements', 'women clothing sizes', 'designer dress details'],
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
        metaTitle: 'Smart Coffee Maker Details - Specifications & Features',
        metaDescription: 'Complete specifications and features of the WiFi-enabled smart coffee maker including dimensions and warranty',
        searchKeywords: ['coffee maker specs', 'smart coffee machine details', 'kitchen appliance specifications', 'coffee maker features'],
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
        metaTitle: 'Treadmill Elite Details - Specifications & Assembly Guide',
        metaDescription: 'Complete specifications and assembly instructions for the professional home treadmill including dimensions and warranty',
        searchKeywords: ['treadmill specifications', 'fitness equipment details', 'home gym setup', 'treadmill assembly'],
      },
      {
        itemId: items[6]._id, // Low Stock Smartphone
        imagesByColor: [
          {
            color: 'Gold',
            hexCode: '#FFD700',
            images: [{ url: imageUrl, priority: 1, isTbyb: false, itemDetailImageId: generateUniqueId() }],
            sizes: [
              { size: 'Standard', stock: 5, skuId: generateUniqueId() },
            ],
          },
        ],
        sizeChart: [
          { 
            size: 'Standard', 
            inches: new Map([['width', 3], ['height', 6]]), 
            cm: new Map([['width', 7.6], ['height', 15.2]]) 
          }
        ],
        howToMeasure: [
          new Map([['Screen Size', 'Measure diagonally across the screen']])
        ],
        isSize: false,
        isMultipleColor: false,
        deliveryDescription: 'Delivered in 2-3 days',
        About: 'Limited edition smartphone with advanced features',
        PPQ: [{ minQty: 1, maxQty: 2, pricePerUnit: 32000 }],
        deliveryPincode: [400001],
        returnPolicy: '30-day return policy',
        metaTitle: 'Low Stock Smartphone Details - Limited Edition Features',
        metaDescription: 'Complete specifications and features of the limited edition smartphone with advanced technology',
        searchKeywords: ['smartphone details', 'limited edition', 'low stock', 'mobile specifications'],
      },
      {
        itemId: items[7]._id, // Out of Stock Tablet
        imagesByColor: [
          {
            color: 'Silver',
            hexCode: '#C0C0C0',
            images: [{ url: imageUrl, priority: 1, isTbyb: false, itemDetailImageId: generateUniqueId() }],
            sizes: [
              { size: 'Standard', stock: 0, skuId: generateUniqueId() },
            ],
          },
        ],
        sizeChart: [
          { 
            size: 'Standard', 
            inches: new Map([['width', 8], ['height', 10]]), 
            cm: new Map([['width', 20.3], ['height', 25.4]]) 
          }
        ],
        howToMeasure: [
          new Map([['Screen Size', 'Measure diagonally across the screen']])
        ],
        isSize: false,
        isMultipleColor: false,
        deliveryDescription: 'Currently out of stock',
        About: 'Popular tablet model currently unavailable',
        PPQ: [{ minQty: 1, maxQty: 1, pricePerUnit: 22000 }],
        deliveryPincode: [400001],
        returnPolicy: '30-day return policy',
        metaTitle: 'Out of Stock Tablet Details - Popular Model Specifications',
        metaDescription: 'Complete specifications of the popular tablet model currently out of stock',
        searchKeywords: ['tablet specifications', 'out of stock', 'popular tablet', 'unavailable'],
      },
      {
        itemId: items[8]._id, // Limited Edition Hoodie
        imagesByColor: [
          {
            color: 'Black',
            hexCode: '#000000',
            images: [{ url: imageUrl, priority: 1, isTbyb: false, itemDetailImageId: generateUniqueId() }],
            sizes: [
              { size: 'S', stock: 1, skuId: generateUniqueId() },
              { size: 'M', stock: 1, skuId: generateUniqueId() },
              { size: 'L', stock: 1, skuId: generateUniqueId() },
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
          }
        ],
        howToMeasure: [
          new Map([['Chest', 'Measure around the fullest part of your chest']]),
          new Map([['Length', 'Measure from shoulder to desired length']])
        ],
        isSize: true,
        isMultipleColor: false,
        deliveryDescription: 'Delivered in 3-5 days',
        About: 'Limited edition hoodie with premium fleece material',
        PPQ: [{ minQty: 1, maxQty: 1, pricePerUnit: 2200 }],
        deliveryPincode: [400001],
        returnPolicy: '30-day return policy',
        metaTitle: 'Limited Edition Hoodie Details - Premium Fleece Material',
        metaDescription: 'Complete details of the limited edition hoodie with premium fleece material and size guide',
        searchKeywords: ['hoodie details', 'limited edition', 'fleece material', 'premium clothing'],
      },
      {
        itemId: items[9]._id, // Rare Sports Shoes
        imagesByColor: [
          {
            color: 'White',
            hexCode: '#FFFFFF',
            images: [{ url: imageUrl, priority: 1, isTbyb: false, itemDetailImageId: generateUniqueId() }],
            sizes: [
              { size: '9', stock: 1, skuId: generateUniqueId() },
            ],
          },
        ],
        sizeChart: [
          { 
            size: '9', 
            inches: new Map([['length', 11], ['width', 4]]), 
            cm: new Map([['length', 27.9], ['width', 10.2]]) 
          }
        ],
        howToMeasure: [
          new Map([['Foot Length', 'Measure from heel to longest toe']]),
          new Map([['Foot Width', 'Measure across the widest part of your foot']])
        ],
        isSize: true,
        isMultipleColor: false,
        deliveryDescription: 'Delivered in 2-4 days',
        About: 'Rare sports shoes with premium quality and minimal available stock',
        PPQ: [{ minQty: 1, maxQty: 1, pricePerUnit: 7200 }],
        deliveryPincode: [400001],
        returnPolicy: '30-day return policy',
        metaTitle: 'Rare Sports Shoes Details - Premium Athletic Footwear',
        metaDescription: 'Complete specifications and features of the rare sports shoes with premium quality materials',
        searchKeywords: ['sports shoes details', 'rare footwear', 'premium athletic', 'minimal stock'],
      },
    ]);

    // Create audit logs for item details creation
    for (let i = 0; i < itemDetails.length; i++) {
      const itemDetail = itemDetails[i];
      const subAdminUser = users.find(u => u.role === 'SubAdmin' && u.isSubAdminActive);
      
      if (subAdminUser) {
        await createAuditLog(
          subAdminUser._id,
          'SubAdmin',
          subAdminUser.name,
          subAdminUser.phoneNumber,
          'CREATE',
          'ITEM_DETAIL',
          itemDetail._id,
          { 
            itemId: itemDetail.itemId,
            isSize: itemDetail.isSize,
            isMultipleColor: itemDetail.isMultipleColor,
            deliveryDescription: itemDetail.deliveryDescription
          },
          null,
          `SubAdmin created item details for item: ${items.find(item => item._id.equals(itemDetail.itemId))?.name}`,
          'SUCCESS',
          null,
          { itemId: itemDetail.itemId, isSize: itemDetail.isSize },
          { success: true, itemDetailId: itemDetail._id }
        );
      }
    }

    // Coupons
    const coupons = await Coupon.insertMany([
      {
        couponCode: 'SAVE10',
        discountType: 'Percentage',
        discountValue: 10,
        minimumPurchase: 1000,
        expirationDate: new Date('2025-12-31T23:59:59Z'),
        isActive: true,
        couponUserIdUsed: [users[0]._id], // Array of ObjectId
        maxUses: 100,
        usesPerUser: 2,
        applicableCategories: ['Electronics', 'Clothing'],
        description: 'Get 10% off on your next purchase!',
        createdAt: new Date('2025-06-15T00:00:00Z'),
      },
    ]);

    // Create audit logs for coupon creation
    for (let i = 0; i < coupons.length; i++) {
      const subAdminUser = users.find(u => u.role === 'SubAdmin' && u.isSubAdminActive);
      
      if (subAdminUser) {
        await createAuditLog(
          subAdminUser._id,
          'SubAdmin',
          subAdminUser.name,
          subAdminUser.phoneNumber,
          'CREATE',
          'COUPON',
          coupons[i]._id,
          { 
            couponCode: coupons[i].couponCode,
            discountType: coupons[i].discountType,
            discountValue: coupons[i].discountValue,
            isActive: coupons[i].isActive
          },
          null,
          `SubAdmin created coupon: ${coupons[i].couponCode}`,
          'SUCCESS',
          null,
          { couponCode: coupons[i].couponCode, discountValue: coupons[i].discountValue },
          { success: true, couponId: coupons[i]._id }
        );
      }
    }

    // Filters
    const filters = await Filter.insertMany([
      {
        key: 'Brand',
        values: ['FashionBrand', 'StyleCo', 'TrendyWear', 'ClassicStyle', 'ModernFit'],
      },
      {
        key: 'Material',
        values: ['Cotton', 'Denim', 'Polyester', 'Silk', 'Linen', 'Wool', 'Fleece'],
      },
      {
        key: 'Size',
        values: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'],
      },
      {
        key: 'Color',
        values: ['Black', 'White', 'Blue', 'Red', 'Green', 'Yellow', 'Pink', 'Navy', 'Brown', 'Gray'],
      },
      {
        key: 'Style',
        values: ['Casual', 'Formal', 'Evening', 'Party', 'Office', 'Streetwear', 'Vintage', 'Modern'],
      },
      {
        key: 'Season',
        values: ['Summer', 'Winter', 'Spring', 'Fall', 'All Season'],
      },
      {
        key: 'Price Range',
        values: ['Under ₹1000', '₹1000-₹2000', '₹2000-₹5000', '₹5000-₹10000', 'Above ₹10000'],
      },
    ]);

    // Home Page Banners
    const banners = await HomePageBanner.insertMany([
      {
        bannerName: 'Fashion Sale',
        bannerImageUrl: imageUrl,
      },
      {
        bannerName: 'New Collection',
        bannerImageUrl: imageUrl,
      },
      {
        bannerName: 'Winter Wear',
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

    // Create audit logs for user order activities
    for (let i = 0; i < userOrders.length; i++) {
      const order = userOrders[i];
      const user = users.find(u => u._id.equals(order.userId));
      
      if (user) {
        await createAuditLog(
          user._id,
          'User',
          user.name,
          user.phoneNumber,
          'CREATE',
          'ORDER',
          order._id,
          { 
            orderId: order.orderId,
            totalAmount: order.totalAmount,
            orderStatus: order.orderStatus,
            paymentStatus: order.paymentStatus
          },
          null,
          `User created order: ${order.orderId} for amount: ₹${order.totalAmount}`,
          'SUCCESS',
          null,
          { orderId: order.orderId, totalAmount: order.totalAmount },
          { success: true, orderId: order._id }
        );
      }
    }

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

    // Create audit logs for partner order activities
    for (let i = 0; i < partnerOrders.length; i++) {
      const order = partnerOrders[i];
      const partner = partners.find(p => p._id.equals(order.partnerId));
      
      if (partner) {
        await createAuditLog(
          partner.partner,
          'Partner',
          partner.name,
          partner.phoneNumber,
          'CREATE',
          'ORDER',
          order._id,
          { 
            orderId: order.orderId,
            totalAmount: order.totalAmount,
            orderStatus: order.orderStatus,
            paymentStatus: order.paymentStatus
          },
          null,
          `Partner created order: ${order.orderId} for amount: ₹${order.totalAmount}`,
          'SUCCESS',
          null,
          { orderId: order.orderId, totalAmount: order.totalAmount },
          { success: true, orderId: order._id }
        );
      }
    }

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

    // Homepage Sections - Create with staggered dates for better trends visualization
    const homepageSections = await HomePageSection.insertMany([
      {
        sectionName: "MostBought",
        title: "Most Bought",
        subtitle: "Trending Now",
        description: "Discover our most popular clothing items that customers love",
        isActive: true,
        displayOrder: 1,
        dataConfig: {
          categories: [categories[0]._id, categories[1]._id], // Men's and Women's Clothing
          subcategories: [subCategories[0]._id, subCategories[1]._id, subCategories[3]._id, subCategories[4]._id], // T-Shirts, Shirts, Dresses, Tops
          items: [items[0]._id, items[1]._id, items[3]._id, items[4]._id], // Classic T-Shirt, Formal Shirt, Evening Dress, Summer Top
          filters: {
            minRating: 4.0,
            inStockOnly: true
          },
          sortBy: "popularity",
          itemLimit: 8
        },
        theme: {
          backgroundColor: "#ffffff",
          textColor: "#1a1a1a",
          accentColor: "#d7824b",
          buttonColor: "#d7824b"
        },
        campaign: {
          name: "Regular Collection",
          isActive: true
        },
        metaTitle: "Most Bought Clothing - Popular Fashion Items",
        metaDescription: "Browse our most popular and trending clothing items that customers love to buy",
        notes: "Main section showing most popular clothing items across categories",
        createdAt: new Date('2025-06-15')
      },
      {
        sectionName: "TurnHeads",
        title: "Turn Heads",
        subtitle: "Statement Pieces",
        description: "Make a statement with these eye-catching fashion pieces",
        isActive: true,
        displayOrder: 2,
        dataConfig: {
          categories: [categories[1]._id, categories[3]._id], // Women's Clothing and Accessories
          subcategories: [subCategories[3]._id, subCategories[5]._id, subCategories[8]._id, subCategories[9]._id], // Dresses, Skirts, Watches, Bags
          items: [items[3]._id, items[5]._id, items[8]._id, items[9]._id], // Evening Dress, A-Line Skirt, Limited Hoodie, Designer Handbag
          filters: {
            inStockOnly: true
          },
          sortBy: "discount",
          itemLimit: 6
        },
        theme: {
          backgroundColor: "#f8f9fa",
          textColor: "#1a1a1a",
          accentColor: "#e74c3c",
          buttonColor: "#e74c3c"
        },
        campaign: {
          name: "Statement Collection",
          isActive: true
        },
        metaTitle: "Turn Heads - Statement Fashion Pieces",
        metaDescription: "Discover statement fashion pieces that will make you stand out from the crowd",
        notes: "Section for eye-catching, high-discount fashion items",
        createdAt: new Date('2025-07-20')
      },
      {
        sectionName: "Everydaytoevent",
        title: "Everyday to Event",
        subtitle: "Versatile Style",
        description: "From casual everyday wear to special events",
        isActive: true,
        displayOrder: 3,
        dataConfig: {
          categories: [categories[0]._id, categories[2]._id], // Men's Clothing and Kids' Clothing
          subcategories: [subCategories[0]._id, subCategories[2]._id, subCategories[6]._id, subCategories[7]._id], // T-Shirts, Jeans, Kids T-Shirts, Kids Dresses
          items: [items[0]._id, items[2]._id, items[6]._id, items[7]._id], // Classic T-Shirt, Slim Jeans, Kids T-Shirt, Princess Dress
          filters: {
            minRating: 3.5,
            inStockOnly: true,
            newArrivalsDays: 30
          },
          sortBy: "latest",
          itemLimit: 10
        },
        theme: {
          backgroundColor: "#ffffff",
          textColor: "#1a1a1a",
          accentColor: "#3498db",
          buttonColor: "#3498db"
        },
        campaign: {
          name: "Versatile Collection",
          isActive: true
        },
        metaTitle: "Everyday to Event - Versatile Fashion",
        metaDescription: "Find versatile clothing pieces perfect for both everyday wear and special events",
        notes: "Section for versatile, new arrival clothing items",
        createdAt: new Date('2025-08-10')
      }
    ]);

    // Create audit logs for homepage section creation
    for (let i = 0; i < homepageSections.length; i++) {
      const subAdminUser = users.find(u => u.role === 'SubAdmin' && u.isSubAdminActive);
      
      if (subAdminUser) {
        await createAuditLog(
          subAdminUser._id,
          'SubAdmin',
          subAdminUser.name,
          subAdminUser.phoneNumber,
          'CREATE',
          'HOMEPAGE_SECTION',
          homepageSections[i]._id,
          { 
            sectionName: homepageSections[i].sectionName,
            title: homepageSections[i].title,
            subtitle: homepageSections[i].subtitle,
            isActive: homepageSections[i].isActive,
            displayOrder: homepageSections[i].displayOrder
          },
          null,
          `SubAdmin created homepage section: ${homepageSections[i].sectionName} - ${homepageSections[i].title}`,
          'SUCCESS',
          null,
          { 
            sectionName: homepageSections[i].sectionName,
            title: homepageSections[i].title,
            isActive: homepageSections[i].isActive
          },
          { success: true, sectionId: homepageSections[i]._id }
        );
      }
    }

    // Create SubAdmin users after admin users are created
    const adminUsers = users.filter(user => user.role === 'Admin');
    if (adminUsers.length > 0) {
      const firstAdminId = adminUsers[0]._id;
      
      // Create SubAdmin users with proper assignedBy field
      const subAdminUsers = await User.insertMany([
        {
          name: 'SubAdmin User 1',
          phoneNumber: '9829699382',
          email: 'subadmin1@example.com',
          role: 'SubAdmin',
          isPhoneVerified: true,
          isEmailVerified: true,
          isActive: true,
          isPartner: false,
          isAddress: false,
          isSubAdminActive: true,
          permissions: ['read', 'create', 'update', 'delete'],
          assignedBy: firstAdminId,
          createdAt: new Date('2025-06-15')
        },
        {
          name: 'SubAdmin User 2',
          phoneNumber: '9876543216',
          email: 'subadmin2@example.com',
          role: 'SubAdmin',
          isPhoneVerified: true,
          isEmailVerified: true,
          isActive: true,
          isPartner: false,
          isAddress: false,
          isSubAdminActive: true,
          permissions: ['read', 'create', 'update'],
          assignedBy: firstAdminId,
          createdAt: new Date('2025-06-16')
        },
        {
          name: 'SubAdmin User 3',
          phoneNumber: '9876543217',
          email: 'subadmin3@example.com',
          role: 'SubAdmin',
          isPhoneVerified: true,
          isEmailVerified: true,
          isActive: true,
          isPartner: false,
          isAddress: false,
          isSubAdminActive: false, // Inactive subadmin for testing
          permissions: ['read'],
          assignedBy: firstAdminId,
          createdAt: new Date('2025-06-17')
        }
      ]);
      
      console.log('Created SubAdmin users with assignedBy field');

      // Create audit logs for SubAdmin creation (Admin activities)
      const adminUser = users.find(u => u.role === 'Admin');
      if (adminUser) {
        for (let i = 0; i < subAdminUsers.length; i++) {
          const subAdmin = subAdminUsers[i];
          
          await createAuditLog(
            adminUser._id,
            'Admin',
            adminUser.name,
            adminUser.phoneNumber,
            'CREATE',
            'SUBADMIN',
            subAdmin._id,
            { 
              name: subAdmin.name,
              email: subAdmin.email,
              phoneNumber: subAdmin.phoneNumber,
              permissions: subAdmin.permissions,
              isSubAdminActive: subAdmin.isSubAdminActive
            },
            null,
            `Admin created SubAdmin: ${subAdmin.name} with permissions: ${subAdmin.permissions.join(', ')}`,
            'SUCCESS',
            null,
            { 
              name: subAdmin.name,
              email: subAdmin.email,
              phoneNumber: subAdmin.phoneNumber,
              permissions: subAdmin.permissions
            },
            { success: true, subAdminId: subAdmin._id }
          );
        }
      }
    }

    // Add some failed login attempts and permission denied scenarios for realistic audit logs
    const subAdminUser = users.find(u => u.role === 'SubAdmin' && u.isSubAdminActive);
    const adminUser = users.find(u => u.role === 'Admin');
    
    if (subAdminUser) {
      // Simulate failed login attempt
      await createAuditLog(
        null,
        'UNKNOWN',
        'Unknown User',
        '9999999999',
        'LOGIN_FAILED',
        'USER',
        null,
        null,
        null,
        'Failed login attempt for phone number: 9999999999',
        'FAILED',
        'Invalid OTP provided',
        { phoneNumber: '9999999999' },
        { success: false, error: 'Invalid OTP' }
      );

      // Simulate SubAdmin trying to access admin-only feature (permission denied)
      await createAuditLog(
        subAdminUser._id,
        'SubAdmin',
        subAdminUser.name,
        subAdminUser.phoneNumber,
        'PERMISSION_DENIED',
        'SUBADMIN',
        null,
        null,
        null,
        'SubAdmin attempted to access admin-only feature: Create SubAdmin',
        'FAILED',
        'Access denied. Required role: Admin',
        { action: 'createSubAdmin', requiredRole: 'Admin' },
        { success: false, error: 'Insufficient permissions' }
      );

      // Simulate SubAdmin trying to view audit logs (permission denied)
      await createAuditLog(
        subAdminUser._id,
        'SubAdmin',
        subAdminUser.name,
        subAdminUser.phoneNumber,
        'PERMISSION_DENIED',
        'AUDIT_LOG',
        null,
        null,
        null,
        'SubAdmin attempted to access audit logs',
        'FAILED',
        'Access denied. Required role: Admin',
        { action: 'viewAuditLogs', requiredRole: 'Admin' },
        { success: false, error: 'Insufficient permissions' }
      );

      // Simulate SubAdmin updating an item
      const itemToUpdate = items[0];
      await createAuditLog(
        subAdminUser._id,
        'SubAdmin',
        subAdminUser.name,
        subAdminUser.phoneNumber,
        'UPDATE',
        'ITEM',
        itemToUpdate._id,
        { 
          totalStock: 95, // Updated stock
          discountedPrice: 43000 // Updated price
        },
        { 
          totalStock: 100, // Previous stock
          discountedPrice: 45000 // Previous price
        },
        `SubAdmin updated item: ${itemToUpdate.name} - Stock: 100→95, Price: ₹45000→₹43000`,
        'SUCCESS',
        null,
        { 
          totalStock: 95,
          discountedPrice: 43000
        },
        { success: true, itemId: itemToUpdate._id }
      );
    }

    if (adminUser) {
      // Simulate Admin viewing audit logs
      await createAuditLog(
        adminUser._id,
        'Admin',
        adminUser.name,
        adminUser.phoneNumber,
        'READ',
        'AUDIT_LOG',
        null,
        null,
        null,
        'Admin viewed audit logs',
        'SUCCESS',
        null,
        { action: 'viewAuditLogs' },
        { success: true, totalLogs: 50 }
      );

      // Simulate Admin deactivating a SubAdmin
      const inactiveSubAdmin = users.find(u => u.role === 'SubAdmin' && !u.isSubAdminActive);
      if (inactiveSubAdmin) {
        await createAuditLog(
          adminUser._id,
          'Admin',
          adminUser.name,
          adminUser.phoneNumber,
          'UPDATE',
          'SUBADMIN',
          inactiveSubAdmin._id,
          { isSubAdminActive: false },
          { isSubAdminActive: true },
          `Admin deactivated SubAdmin: ${inactiveSubAdmin.name}`,
          'SUCCESS',
          null,
          { isSubAdminActive: false },
          { success: true, subAdminId: inactiveSubAdmin._id }
        );
      }
    }

    console.log('Database seeded successfully with comprehensive audit logs');
    console.log(`✅ Created ${homepageSections.length} homepage sections:`);
    homepageSections.forEach(section => {
      const itemNames = section.dataConfig.items.map(itemId => {
        const item = items.find(i => i._id.equals(itemId));
        return item ? item.name : 'Unknown Item';
      });
      console.log(`   - ${section.sectionName}: ${section.title} (${section.campaign.name})`);
      console.log(`     Items: ${itemNames.join(', ')}`);
    });
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run the seed function
seedDatabase();