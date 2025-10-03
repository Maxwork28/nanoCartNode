const User = require("../../models/User/User");
const UserAddress = require("../../models/User/UserAddress");

// Create a new address
exports.createAddress = async (req, res) => {
  try {
    console.log('🏠 Creating address - Request body:', req.body);
    console.log('👤 User ID from token:', req.user?.userId);
    
    const { userId } = req.user;
    const {
      name,
      phoneNumber,
      email,
      pincode,
      addressLine1,
      addressLine2,
      cityTown,
      state,
      country,
      addressType,
      isDefault,
    } = req.body;

    console.log('📋 Extracted address data:', {
      name,
      phoneNumber,
      email,
      pincode,
      addressLine1,
      addressLine2,
      cityTown,
      state,
      country,
      addressType,
      isDefault
    });

    // Validate user exists
    console.log('🔍 Looking for user with ID:', userId);
    const user = await User.findById(userId);
    if (!user) {
      console.log('❌ User not found with ID:', userId);
      return res.status(404).json({ message: "User not found" });
    }
    console.log('✅ User found:', user.name);

    // Create new address detail object
    const newAddressDetail = {
      name,
      phoneNumber,
      email,
      pincode,
      addressLine1,
      addressLine2,
      cityTown,
      state,
      country,
      addressType: addressType || "Home",
      isDefault: isDefault || false,
    };

    console.log('📝 New address detail object:', newAddressDetail);

    // Check if address already exists for user
    console.log('🔍 Checking for existing address for user:', userId);
    let address = await UserAddress.findOne({ userId });

    if (address) {
      console.log('📋 Found existing address document, adding new address detail');
      // Add new address to existing addressDetail array
      address.addressDetail.push(newAddressDetail);

      // If isDefault is true for new address, set others to false
      if (newAddressDetail.isDefault) {
        address.addressDetail = address.addressDetail.map((addr, index) => ({
          ...addr,
          isDefault: index === address.addressDetail.length - 1 ? true : false,
        }));
      }
    } else {
      console.log('📋 No existing address document, creating new one');
      // Create new address document
      address = new UserAddress({
        userId,
        addressDetail: [newAddressDetail],
      });
    }

    console.log('💾 Saving address to database...');
    await address.save();
    console.log('✅ Address saved successfully');

    // Update user's isAddress flag
    user.isAddress = true;
    await user.save();

    res.status(201).json({
      message: "Address created successfully",
      address,
    });
  } catch (error) {
    console.error('❌ Error creating address:', error);
    
    // Handle validation errors specifically
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: "Validation failed", 
        errors: validationErrors 
      });
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: "Address already exists" 
      });
    }
    
    res
      .status(500)
      .json({ message: "Error creating address", error: error.message });
  }
};

exports.editAddress = async (req, res) => {
  try {
    const { userId } = req.user;
    const { addressId } = req.params;
    const {
      name,
      phoneNumber,
      email,
      pincode,
      addressLine1,
      addressLine2,
      cityTown,
      state,
      country,
      addressType,
      isDefault,
    } = req.body;

    const addressDoc = await UserAddress.findOne({ userId });
    if (!addressDoc) {
      return res.status(404).json({ message: "Address not found" });
    }

    const address = addressDoc.addressDetail.id(addressId);
    if (!address) {
      return res.status(404).json({ message: "Specific address not found" });
    }

    // Update each field if provided
    if (name !== undefined) address.name = name;
    if (phoneNumber !== undefined) address.phoneNumber = phoneNumber;
    if (email !== undefined) address.email = email;
    if (pincode !== undefined) address.pincode = pincode;
    if (addressLine1 !== undefined) address.addressLine1 = addressLine1;
    if (addressLine2 !== undefined) address.addressLine2 = addressLine2;
    if (cityTown !== undefined) address.cityTown = cityTown;
    if (state !== undefined) address.state = state;
    if (country !== undefined) address.country = country;
    if (addressType !== undefined) address.addressType = addressType;
    if (isDefault !== undefined) address.isDefault = isDefault;

    // Set isDefault false for others if current is set to true
    if (isDefault) {
      addressDoc.addressDetail.forEach((addr) => {
        addr.isDefault = addr._id.toString() === addressId;
      });
    }

    await addressDoc.save();

    res.status(200).json({
      message: "Address updated successfully",
      address: addressDoc,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating address", error: error.message });
  }
};

// Delete an address
exports.deleteAddress = async (req, res) => {
  try {
    const { userId } = req.user;
    const { addressId } = req.params;

    const address = await UserAddress.findOne({ userId });
    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }

    // Filter out the address to delete
    address.addressDetail = address.addressDetail.filter(
      (addr) => addr._id.toString() !== addressId
    );

    // Update user's isAddress flag if no addresses remain
    if (address.addressDetail.length === 0) {
      const user = await User.findById(userId);
      user.isAddress = false;
      await user.save();
    }

    await address.save();

    res.status(200).json({
      message: "Address deleted successfully",
      address,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting address", error: error.message });
  }
};



exports.fetchAddress = async (req, res) => {
  try {
    const { userId } = req.user;

    const addressDoc = await UserAddress.findOne({ userId });

    if (!addressDoc || addressDoc.addressDetail.length === 0) {
      return res.status(404).json({ message: "No addresses found" });
    }

    res.status(200).json({
      message: "Addresses fetched successfully",
      addresses: addressDoc,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching addresses",
      error: error.message,
    });
  }
};
