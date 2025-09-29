# Homepage Sections API Documentation

## Overview
The Homepage Sections API allows you to dynamically control the content of your homepage components without changing the HTML/CSS structure. You can update categories, subcategories, items, and even launch seasonal campaigns by simply updating the database configuration.

## Features
- ✅ **Dynamic Content**: Change text, items, and configuration without code changes
- ✅ **Seasonal Campaigns**: Launch summer sales, winter collections, etc.
- ✅ **Flexible Filtering**: Filter by price, discount, rating, stock, etc.
- ✅ **Multiple Sorting**: Sort by popularity, price, rating, discount, etc.
- ✅ **Theme Support**: Customize colors and styling (future feature)
- ✅ **SEO Ready**: Meta titles and descriptions for each section

## Database Model

### HomePageSection Schema
```javascript
{
  sectionName: "MostBought" | "TurnHeads" | "Everydaytoevent",
  title: "Section Title",
  subtitle: "Section Subtitle", 
  description: "Section Description",
  isActive: true,
  displayOrder: 1,
  dataConfig: {
    categories: [ObjectId], // Categories to include
    subcategories: [ObjectId], // Subcategories to include
    items: [ObjectId], // Specific items to include
    filters: {
      minPrice: Number,
      maxPrice: Number,
      minDiscount: Number,
      maxDiscount: Number,
      minRating: Number,
      inStockOnly: Boolean,
      isTrendy: Boolean,
      newArrivalsDays: Number
    },
    sortBy: "latest" | "popularity" | "priceLowToHigh" | "priceHighToLow" | "rating" | "discount",
    itemLimit: Number
  },
  campaign: {
    name: "Summer Sale",
    startDate: Date,
    endDate: Date,
    isActive: Boolean
  }
}
```

## API Endpoints

### Public Endpoints (No Authentication)

#### Get All Homepage Sections
```http
GET /api/homepage-sections
```
**Response:**
```json
{
  "success": true,
  "message": "Homepage sections retrieved successfully",
  "data": [
    {
      "_id": "...",
      "sectionName": "MostBought",
      "title": "Most Bought",
      "subtitle": "Trending Now",
      "description": "Discover our most popular items",
      "isActive": true,
      "displayOrder": 1,
      "dataConfig": { ... },
      "campaign": { ... }
    }
  ]
}
```

#### Get Section by Name
```http
GET /api/homepage-sections/MostBought
```

#### Get Items for Section
```http
GET /api/homepage-sections/MostBought/items
```
**Response:**
```json
{
  "success": true,
  "message": "Items for MostBought section retrieved successfully",
  "data": {
    "section": {
      "name": "MostBought",
      "title": "Most Bought",
      "subtitle": "Trending Now",
      "description": "Discover our most popular items",
      "campaign": {
        "name": "Regular Collection",
        "isActive": true
      }
    },
    "items": [
      {
        "_id": "...",
        "name": "Product Name",
        "image": "https://...",
        "MRP": 1000,
        "discountedPrice": 800,
        "discountPercentage": 20,
        "userAverageRating": 4.5
      }
    ],
    "totalItems": 8,
    "config": { ... }
  }
}
```

### Admin Endpoints (Authentication Required)

#### Create Homepage Section
```http
POST /api/homepage-sections/create
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "sectionName": "MostBought",
  "title": "Most Bought",
  "subtitle": "Trending Now",
  "description": "Discover our most popular items",
  "dataConfig": {
    "categories": ["category_id_1", "category_id_2"],
    "filters": {
      "minRating": 4.0,
      "inStockOnly": true,
      "isTrendy": true
    },
    "sortBy": "popularity",
    "itemLimit": 8
  }
}
```

#### Update Homepage Section
```http
PUT /api/homepage-sections/:sectionId
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "title": "Updated Title",
  "dataConfig": {
    "filters": {
      "minDiscount": 30
    }
  }
}
```

#### Toggle Section Status
```http
PATCH /api/homepage-sections/:sectionId/toggle
Authorization: Bearer <admin_token>
```

#### Update Section Order
```http
PUT /api/homepage-sections/order
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "sectionOrders": [
    {"sectionId": "section_id_1", "displayOrder": 1},
    {"sectionId": "section_id_2", "displayOrder": 2}
  ]
}
```

## Usage Examples

### 1. Regular Homepage Setup
```javascript
// MostBought section - show popular items
{
  "sectionName": "MostBought",
  "title": "Most Bought",
  "dataConfig": {
    "filters": {
      "minRating": 4.0,
      "inStockOnly": true,
      "isTrendy": true
    },
    "sortBy": "popularity",
    "itemLimit": 8
  }
}
```

### 2. Summer Sale Campaign
```javascript
// Update MostBought for summer sale
{
  "title": "Summer Sale - Most Bought",
  "subtitle": "Up to 50% OFF",
  "description": "Beat the heat with our summer collection",
  "campaign": {
    "name": "Summer Sale 2024",
    "startDate": "2024-06-01",
    "endDate": "2024-08-31",
    "isActive": true
  },
  "dataConfig": {
    "categories": ["summer_category_id"],
    "filters": {
      "minDiscount": 20,
      "inStockOnly": true
    },
    "sortBy": "discount",
    "itemLimit": 12
  }
}
```

### 3. Winter Collection
```javascript
// Update TurnHeads for winter
{
  "title": "Winter Collection",
  "subtitle": "Stay Warm & Stylish",
  "description": "Cozy winter essentials",
  "campaign": {
    "name": "Winter Collection 2024",
    "isActive": true
  },
  "dataConfig": {
    "categories": ["winter_category_id"],
    "filters": {
      "isTrendy": true,
      "inStockOnly": true
    },
    "sortBy": "latest",
    "itemLimit": 6
  }
}
```

## Frontend Integration

### 1. Install the API Service
```javascript
import { homePageApi, getAllSectionsWithItems } from '../services/homePageApi';
```

### 2. Fetch Homepage Data
```javascript
const [sections, setSections] = useState([]);

useEffect(() => {
  const fetchData = async () => {
    try {
      const sectionsWithItems = await getAllSectionsWithItems();
      setSections(sectionsWithItems);
    } catch (error) {
      console.error('Error fetching homepage data:', error);
    }
  };
  
  fetchData();
}, []);
```

### 3. Render Dynamic Sections
```javascript
const mostBoughtSection = sections.find(s => s.sectionName === 'MostBought');

return (
  <section>
    <h2>{mostBoughtSection.title}</h2>
    <p>{mostBoughtSection.subtitle}</p>
    {mostBoughtSection.items.map(item => (
      <ProductCard key={item._id} item={item} />
    ))}
  </section>
);
```

## Seeding Initial Data

Run the seeder to create initial homepage sections:

```bash
node seedHomePageSections.js
```

This will create:
- **MostBought**: Popular items with high ratings
- **TurnHeads**: High discount statement pieces  
- **Everydaytoevent**: Versatile new arrivals

## Benefits

1. **No Code Changes**: Update content without touching frontend code
2. **Quick Campaigns**: Launch seasonal sales in minutes
3. **A/B Testing**: Test different configurations easily
4. **Content Management**: Non-technical users can update content
5. **Performance**: Only fetch what's needed for each section
6. **Scalability**: Add new sections without code changes

## Future Enhancements

- [ ] Theme customization (colors, fonts)
- [ ] Image banners for sections
- [ ] Scheduled campaigns (auto-activate/deactivate)
- [ ] Analytics integration
- [ ] Multi-language support
- [ ] Section templates
