const express=require("express")
const dotenv=require("dotenv");
dotenv.config();
const cors=require("cors") 
const admin = require("firebase-admin"); // Add Firebase Admin SDK
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const PORT=process.env.PORT || 4000
const app=express();

 

const {connectDB}=require("./config/database")
connectDB();

// Routes
const userRoutes=require("./routes/userAuthRoutes/UserAuthRoutes");
const categoryRoutes=require("./routes/categoryRoutes/category");
const subCategoryRoutes=require("./routes/subCategoryRoutes/subCategory");
const itemsRouter=require("./routes/itemsRoutes/item");
const itemDetailRoutes = require("./routes/itemDetailsRoutes/itemDetails"); 
const userWishlistRoutes=require("./routes/userWishlistRoutes/userWishlistRoutes");
const userCartRoutes=require("./routes/userCartRoutes/userCartRoutes");
const filterRoutes=require("./routes/filterRoutes/filterRoutes");
const userRatingAndReviewRoutes=require("./routes/userRatingAndReview/userRatingAndReview");
const userAddressRoutes=require("./routes/userAdddressRoutes/userAddressRoutes");
const invoiceRoutes=require("./routes/invoiceRoutes/invoiceRoutes");
const userOrderRoutes=require("./routes/userOrderRoutes/userOrderRoutes");
const orderStatusMaintainRoutes=require("./routes/userOrderRoutes/OrderStatusMaintainAdminRoutes")// for admin
const userTBYBRoutes=require("./routes/userTBYBRoutes/userTBYBRoutes");
// const trendyDealItemRoutes=require("./routes/itemsRoutes/trendyDealRoutes")


const partnerAuthRoutes=require("./routes/partnerRoutes/partnerAuthRoutes");
const partnerWishlistRoutes=require("./routes/partnerRoutes/partnerWishlistRoutes");
const partnerCartRoutes=require("./routes/partnerRoutes/partnerCartRoutes")
const partnerRatingReview=require("./routes/partnerRoutes/partnerRatingAndReview")
const partnerAddress=require("./routes/partnerRoutes/partnerAddress")
const partnerWalletRoutes=require("./routes/partnerRoutes/partnerWalletRoutes")
const partnerOrderRoutes = require("./routes/partnerRoutes/partnerOrderRoutes");






const adminTotalCountRoutes=require("./routes/adminSideRoutes/adminTotalCountRoutes")
const adminOrderRoutes=require("./routes/adminSideRoutes/adminOrderRoutes")
const subAdminRoutes=require("./routes/adminSideRoutes/subAdminRoutes")
const homePageBannerRoutes=require("./routes/homePageBannerRoutes/homePageBannerRoutes")
const homePageSectionRoutes=require("./routes/homePageSectionRoutes/homePageSectionRoutes")
const couponRoutes=require("./routes/couponRoutes/couponRoutes")
const fakeUserRoutes=require("./routes/fakeDataRoutes/fakeUserRoutes")
const fakeRatingReviewRoutes=require("./routes/fakeDataRoutes/fakeReviewRatingRoutes")





 
//middlewares
app.use(express.json());
app.use(
    cors({
        origin: "*", 
        credentials:true,
    }) 
)
 
//Routes Mount
//User
app.use("/api/auth",userRoutes)  
app.use("/api/category", categoryRoutes);
app.use("/api/subcategory", subCategoryRoutes); 
app.use("/api/items", itemsRouter); 
app.use("/api/itemDetails", itemDetailRoutes);
app.use("/api/userwishlist",userWishlistRoutes)
app.use("/api/usercart",userCartRoutes)
app.use("/api/filter",filterRoutes)
app.use("/api/user/ratingreview",userRatingAndReviewRoutes)
app.use("/api/user/address",userAddressRoutes)
app.use("/api/invoice",invoiceRoutes)
app.use("/api/user/order",userOrderRoutes)
app.use("/api/user/order",orderStatusMaintainRoutes) // For Admin 
app.use("/api/user/tbyb",userTBYBRoutes)


//Partner
app.use("/api/auth/partner",partnerAuthRoutes);
app.use("/api/partner/wishlist",partnerWishlistRoutes)
app.use("/api/partner/cart",partnerCartRoutes)
app.use("/api/partner/ratingreview",partnerRatingReview)
app.use("/api/wallet", partnerWalletRoutes);
app.use("/api/partner/address",partnerAddress)
app.use("/api/partner/order", partnerOrderRoutes);




// app.use("/api/admin",adminTotalThingsRoutes)
// app.use("/api/user/order",adminUserOrderRoutes)
// app.use("/api/user/orders",userOrderCountRoutes)

//Total Count For Admin
app.use("/api/admin",adminTotalCountRoutes)
// Specific for Orders only
app.use("/api/admin/order",adminOrderRoutes)
// SubAdmin management routes
app.use("/api/admin/subadmin",subAdminRoutes)


app.use("/api/home-page-banner",homePageBannerRoutes)
app.use("/api/homepage-sections",homePageSectionRoutes)
app.use("/api/coupon",couponRoutes)
app.use("/api/user/fake",fakeUserRoutes)
app.use("/api/user/fake",fakeRatingReviewRoutes)


   

//def Routes
app.get("/",(req,res)=>{
    return res.status(200).json({         
        success:true,
        message:"Your server is up and running...."
    })
})

app.listen(PORT,()=>{
    console.log(`App is Running on ${PORT}`);
})