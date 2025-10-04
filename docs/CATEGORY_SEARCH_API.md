# Category Search API Documentation

## Overview
The Category Search API provides advanced search and pagination functionality for categories in the nanoCart admin panel. It supports keyword-based searching, sorting, and pagination.

## Endpoint
```
GET /api/category/search
```

## Authentication
- **Required**: Bearer token in Authorization header
- **Example**: `Authorization: Bearer <your-jwt-token>`

## Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `keyword` | string | (optional) | Search keyword for name and description fields |
| `page` | number | 1 | Page number for pagination |
| `limit` | number | 10 | Number of items per page (max: 100) |
| `sortBy` | string | 'createdAt' | Field to sort by (name, description, createdAt, updatedAt) |
| `sortOrder` | string | 'desc' | Sort order ('asc' or 'desc') |

## Response Format

### Success Response (200)
```json
{
  "success": true,
  "message": "Found 5 categories matching \"electronics\"",
  "data": {
    "categories": [
      {
        "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
        "name": "Electronics",
        "description": "Electronic devices and accessories",
        "image": "https://s3.amazonaws.com/...",
        "createdAt": "2023-07-20T10:30:00.000Z",
        "updatedAt": "2023-07-20T10:30:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalCount": 15,
      "limit": 10,
      "hasNextPage": true,
      "hasPrevPage": false,
      "nextPage": 2,
      "prevPage": null
    },
    "searchInfo": {
      "keyword": "electronics",
      "sortBy": "name",
      "sortOrder": "asc"
    }
  }
}
```

### Error Response (400/500)
```json
{
  "success": false,
  "message": "Page and limit must be positive numbers"
}
```

## Usage Examples

### 1. Get All Categories (Paginated)
```bash
curl -X GET "http://localhost:4000/api/category/search?page=1&limit=10" \
  -H "Authorization: Bearer <your-token>"
```

### 2. Search with Keyword
```bash
curl -X GET "http://localhost:4000/api/category/search?keyword=electronics&page=1&limit=5" \
  -H "Authorization: Bearer <your-token>"
```

### 3. Search with Sorting
```bash
curl -X GET "http://localhost:4000/api/category/search?keyword=clothing&sortBy=name&sortOrder=asc" \
  -H "Authorization: Bearer <your-token>"
```

### 4. Advanced Search
```bash
curl -X GET "http://localhost:4000/api/category/search?keyword=fashion&page=2&limit=20&sortBy=createdAt&sortOrder=desc" \
  -H "Authorization: Bearer <your-token>"
```

## Frontend Integration (React)

### Using the API Service
```javascript
import { searchCategories } from '../services/apis/CategoryApi';

// Basic search
const handleSearch = async (keyword, page = 1) => {
  try {
    const results = await searchCategories({
      keyword,
      page,
      limit: 10,
      sortBy: 'name',
      sortOrder: 'asc'
    }, token);
    
    setCategories(results.categories);
    setPagination(results.pagination);
  } catch (error) {
    console.error('Search failed:', error.message);
  }
};

// Get all categories with pagination
const loadCategories = async (page = 1) => {
  try {
    const results = await searchCategories({
      page,
      limit: 15,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    }, token);
    
    setCategories(results.categories);
    setPagination(results.pagination);
  } catch (error) {
    console.error('Failed to load categories:', error.message);
  }
};
```

### Component Example
```jsx
import React, { useState, useEffect } from 'react';
import { searchCategories } from '../services/apis/CategoryApi';

const CategorySearch = () => {
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({});
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const token = useSelector(selectToken);

  const handleSearch = async (searchKeyword = keyword, page = 1) => {
    setLoading(true);
    try {
      const results = await searchCategories({
        keyword: searchKeyword,
        page,
        limit: 10,
        sortBy: 'name',
        sortOrder: 'asc'
      }, token);
      
      setCategories(results.categories);
      setPagination(results.pagination);
      setCurrentPage(page);
    } catch (error) {
      console.error('Search failed:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleSearch('', 1); // Load all categories initially
  }, []);

  return (
    <div>
      {/* Search Input */}
      <input
        type="text"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleSearch(keyword, 1)}
        placeholder="Search categories..."
      />
      
      {/* Search Button */}
      <button onClick={() => handleSearch(keyword, 1)}>
        Search
      </button>

      {/* Results */}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div>
          {categories.map(category => (
            <div key={category._id}>
              <h3>{category.name}</h3>
              <p>{category.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div>
          <button
            disabled={!pagination.hasPrevPage}
            onClick={() => handleSearch(keyword, pagination.prevPage)}
          >
            Previous
          </button>
          
          <span>
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          
          <button
            disabled={!pagination.hasNextPage}
            onClick={() => handleSearch(keyword, pagination.nextPage)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};
```

## Features

### 🔍 Search Functionality
- **Keyword Search**: Searches both `name` and `description` fields
- **Case Insensitive**: Search is case-insensitive
- **Partial Matching**: Supports partial keyword matching
- **Multiple Fields**: Searches across multiple fields simultaneously

### 📄 Pagination
- **Configurable Page Size**: Set custom items per page (max 100)
- **Navigation Info**: Includes next/previous page indicators
- **Total Count**: Provides total number of matching records
- **Page Validation**: Validates page numbers and limits

### 📊 Sorting
- **Multiple Fields**: Sort by name, description, createdAt, updatedAt
- **Ascending/Descending**: Both sort orders supported
- **Default Sorting**: Defaults to createdAt desc

### 🛡️ Security & Validation
- **Authentication Required**: JWT token validation
- **Input Validation**: Validates all query parameters
- **Error Handling**: Comprehensive error responses
- **Rate Limiting**: Built-in protection against abuse

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Invalid query parameters (page/limit validation) |
| 401 | Authentication required |
| 403 | Insufficient permissions |
| 500 | Internal server error |

## Performance Considerations

- **Lean Queries**: Uses MongoDB lean() for better performance
- **Indexing**: Ensure proper indexes on searchable fields
- **Pagination Limits**: Maximum 100 items per page to prevent abuse
- **Query Optimization**: Efficient aggregation pipeline for search

## Testing

Use the provided test script to verify functionality:
```bash
node test_category_search.js
```

Make sure to update the `TEST_TOKEN` variable with a valid admin token before running tests.
