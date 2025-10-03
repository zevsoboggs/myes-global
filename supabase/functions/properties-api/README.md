# Properties API Documentation

Public API endpoint for fetching real estate properties with filtering, sorting, and pagination.

## Base URL

```
https://YOUR_PROJECT.supabase.co/functions/v1/properties-api
```

For local development:
```
http://localhost:54321/functions/v1/properties-api
```

## Endpoints

### GET /properties-api

Fetch properties with optional filters.

## Query Parameters

### Filtering

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `country` | string | Filter by country (case-insensitive partial match) | `?country=UAE` |
| `type` | string | Property type: `apartment`, `house`, `villa`, `commercial`, `land` | `?type=villa` |
| `min_price` | number | Minimum price in USDT | `?min_price=100000` |
| `max_price` | number | Maximum price in USDT | `?max_price=500000` |
| `bedrooms` | number | Number of bedrooms | `?bedrooms=3` |
| `bathrooms` | number | Number of bathrooms | `?bathrooms=2` |
| `min_area` | number | Minimum area in square meters | `?min_area=100` |
| `max_area` | number | Maximum area in square meters | `?max_area=300` |
| `status` | string | Property status: `active`, `sold`, `pending` (default: `active`) | `?status=active` |
| `search` | string | Search in title, description, address, city | `?search=beachfront` |

### Sorting

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `sort_by` | string | Sort field: `created_at`, `price_usdt`, `area_sqm`, `title` (default: `created_at`) | `?sort_by=price_usdt` |
| `sort_order` | string | Sort order: `asc`, `desc` (default: `desc`) | `?sort_order=asc` |

### Pagination

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `limit` | number | Number of results per page (default: 50, max: 100) | `?limit=20` |
| `offset` | number | Number of results to skip (default: 0) | `?offset=20` |

## Example Requests

### Get all active properties in UAE
```bash
curl "https://YOUR_PROJECT.supabase.co/functions/v1/properties-api?country=UAE"
```

### Get villas with 3+ bedrooms, price range 200k-500k USDT
```bash
curl "https://YOUR_PROJECT.supabase.co/functions/v1/properties-api?type=villa&bedrooms=3&min_price=200000&max_price=500000"
```

### Search for beachfront properties
```bash
curl "https://YOUR_PROJECT.supabase.co/functions/v1/properties-api?search=beachfront"
```

### Get properties sorted by price (ascending)
```bash
curl "https://YOUR_PROJECT.supabase.co/functions/v1/properties-api?sort_by=price_usdt&sort_order=asc"
```

### Paginated request (20 results, page 2)
```bash
curl "https://YOUR_PROJECT.supabase.co/functions/v1/properties-api?limit=20&offset=20"
```

### Complex filter example
```bash
curl "https://YOUR_PROJECT.supabase.co/functions/v1/properties-api?country=Thailand&type=villa&min_price=150000&max_price=400000&bedrooms=3&bathrooms=2&sort_by=price_usdt&sort_order=asc&limit=10"
```

## Response Format

### Success Response (200)

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Luxury Beachfront Villa",
      "description": "Stunning villa with ocean views...",
      "address": "123 Beach Road",
      "city": "Dubai",
      "country": "UAE",
      "property_type": "villa",
      "price_usdt": 450000,
      "area_sqm": 250,
      "bedrooms": 4,
      "bathrooms": 3,
      "year_built": 2022,
      "status": "active",
      "features": {
        "pool": true,
        "parking": true,
        "gym": false
      },
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-20T14:20:00Z",
      "primary_image": "https://...",
      "images": [
        {
          "url": "https://...",
          "is_primary": true,
          "order": 0
        },
        {
          "url": "https://...",
          "is_primary": false,
          "order": 1
        }
      ],
      "realtor": {
        "id": "uuid",
        "full_name": "John Doe",
        "agency_name": "Premium Realty",
        "phone": "+1234567890",
        "email": "john@premiumrealty.com"
      }
    }
  ],
  "pagination": {
    "total": 125,
    "limit": 50,
    "offset": 0,
    "has_more": true
  },
  "filters": {
    "country": "UAE",
    "property_type": "villa",
    "min_price": "200000",
    "max_price": "500000",
    "bedrooms": "3",
    "bathrooms": null,
    "min_area": null,
    "max_area": null,
    "status": "active",
    "search": null
  }
}
```

### Error Response (4xx, 5xx)

```json
{
  "success": false,
  "error": "Error description",
  "message": "Detailed error message"
}
```

## Property Object Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Unique property identifier |
| `title` | string | Property title |
| `description` | string | Full property description |
| `address` | string | Street address |
| `city` | string | City name |
| `country` | string | Country name |
| `property_type` | string | Type: apartment, house, villa, commercial, land |
| `price_usdt` | number | Price in USDT |
| `area_sqm` | number | Area in square meters |
| `bedrooms` | number | Number of bedrooms |
| `bathrooms` | number | Number of bathrooms |
| `year_built` | number | Construction year |
| `status` | string | Status: active, sold, pending |
| `features` | object | Additional features (JSON) |
| `created_at` | string (ISO 8601) | Creation timestamp |
| `updated_at` | string (ISO 8601) | Last update timestamp |
| `primary_image` | string (URL) | Primary property image URL |
| `images` | array | All property images with order |
| `realtor` | object | Realtor information |

## Rate Limiting

- No authentication required for public access
- Rate limit: 100 requests per minute per IP
- For higher limits, contact support

## CORS

CORS is enabled for all origins (`*`). You can call this API from any domain.

## Error Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid parameters |
| 405 | Method Not Allowed - Only GET is supported |
| 500 | Internal Server Error |

## Example Integration

### JavaScript/TypeScript

```typescript
async function fetchProperties(filters = {}) {
  const params = new URLSearchParams(filters);
  const response = await fetch(
    `https://YOUR_PROJECT.supabase.co/functions/v1/properties-api?${params}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch properties');
  }

  return await response.json();
}

// Usage
const properties = await fetchProperties({
  country: 'UAE',
  type: 'villa',
  min_price: 200000,
  max_price: 500000,
  bedrooms: 3,
  limit: 20
});

console.log(properties.data);
```

### Python

```python
import requests

def fetch_properties(filters=None):
    url = "https://YOUR_PROJECT.supabase.co/functions/v1/properties-api"
    response = requests.get(url, params=filters or {})
    response.raise_for_status()
    return response.json()

# Usage
properties = fetch_properties({
    'country': 'UAE',
    'type': 'villa',
    'min_price': 200000,
    'max_price': 500000,
    'bedrooms': 3,
    'limit': 20
})

print(properties['data'])
```

### cURL

```bash
curl -X GET \
  "https://YOUR_PROJECT.supabase.co/functions/v1/properties-api?country=UAE&type=villa&min_price=200000&max_price=500000&bedrooms=3&limit=20" \
  -H "Content-Type: application/json"
```

## Support

For questions or issues, contact: support@myes.global