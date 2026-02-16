# API Doc – Home Screen

Frontend contract for the **Main Home (Local Marketplace)** screen.  
Base URL: `/api` (or your `API_PREFIX`). All responses follow the standard envelope `{ code, data, message }`; use `data` for payloads below.

---

## 1. Current location (header)

**GET** `/location/address?lat={lat}&lng={lng}`  
No auth.

| Query   | Type   | Required | Description      |
|---------|--------|----------|------------------|
| `lat`   | number | Yes      | Latitude (-90–90) |
| `lng`   | number | Yes      | Longitude (-180–180) |

**Response (data):**
```json
{
  "address": "Full formatted address string",
  "area": "Downtown Market",
  "city": "Gurgaon",
  "state": "Haryana",
  "country": "India"
}
```
Use `area` (or `address`) for the “Current Location” label.

---

## 2. Banners (carousel)

**GET** `/banners`  
No auth.

**Response (data):** array of:
```json
{
  "id": "string",
  "badge": "LIMITED OFFER",
  "title": "Hardware Mega Sale",
  "subtitle": "Up to 50% off on power tools",
  "imageUrl": "https://...",
  "ctaText": "Shop Now",
  "ctaLink": "optional-link-or-category",
  "displayOrder": 0
}
```
Order by `displayOrder`. Only active, within-date banners are returned.

---

## 3. Shop by category

**GET** `/categories`  
No auth.

**Response (data):** array of:
```json
{
  "id": "printing",
  "name": "Printing",
  "status": "ACTIVE",
  "description": null,
  "displayOrder": 0,
  "iconPath": "categories/printing.png",
  "iconUrl": "https://bucket.s3.region.amazonaws.com/categories/printing.png"
}
```
- `status`: `ACTIVE` | `COMING_SOON` | `INACTIVE`
- Use `iconUrl` for the category icon; fallback to `iconPath` if needed.

---

## 4. Nearby shops (with pagination)

**GET** `/sellers?category={id}&lat={lat}&lng={lng}&maxDistanceKm={km}&limit={n}&offset={n}`  
Auth optional. If `Authorization: Bearer <token>` is sent, each seller includes `is_favorited`.

| Query           | Type   | Required | Description                    |
|-----------------|--------|----------|--------------------------------|
| `category`      | string | No       | e.g. `printing`                |
| `lat`           | number | No       | User latitude                  |
| `lng`           | number | No       | User longitude                 |
| `maxDistanceKm` | number | No       | Default 50                     |
| `limit`         | number | No       | Page size (default 20, max 100) |
| `offset`        | number | No       | Offset (default 0)             |

**Response (data):**
```json
{
  "sellers": [
    {
      "seller_id": "string",
      "shop_name": "Master Hardware",
      "address": "string",
      "price_breakdown": { "per_page": 2 },
      "prep_time_min": 15,
      "status": "ONLINE",
      "rating": 4.8,
      "image_url": "https://...",
      "distance_km": 1.2,
      "categories": [{ "id": "hardware", "name": "Tools & Plumbing" }],
      "is_favorited": false
    }
  ],
  "pagination": {
    "total": 42,
    "limit": 20,
    "offset": 0
  }
}
```
- `status`: `ONLINE` → “Open Now”, `OFFLINE` → “Closed”.
- `distance_km` present only when `lat`/`lng` are sent.
- `is_favorited` present only when request is authenticated.

---

## 5. Favorites

**GET** `/favorites`  
Auth required (`USER` role).

**Response (data):** array of:
```json
{
  "sellerId": "string",
  "createdAt": "ISO8601",
  "seller": {
    "id": "string",
    "shopName": "string",
    "address": "string",
    "status": "ONLINE",
    "imagePath": "sellers/xxx/cover.jpg",
    "rating": 4.8,
    "latitude": "28.61",
    "longitude": "77.20"
  }
}
```

**POST** `/favorites/:sellerId`  
Auth required. Add shop to favorites.

**DELETE** `/favorites/:sellerId`  
Auth required. Remove from favorites.

---

## 6. Global search

**GET** `/search?q={query}&limit={n}`  
No auth.

| Query  | Type   | Required | Description        |
|--------|--------|----------|--------------------|
| `q`    | string | Yes      | Search term        |
| `limit`| number | No       | Per type (default 20, max 50) |

**Response (data):**
```json
{
  "query": "hardware",
  "shops": [
    {
      "seller_id": "string",
      "shop_name": "Master Hardware",
      "address": "string",
      "status": "ONLINE",
      "rating": 4.8,
      "image_url": "https://...",
      "categories": [{ "id": "hardware", "name": "Hardware" }]
    }
  ],
  "products": [
    {
      "product_id": "string",
      "name": "Product name",
      "description": "string",
      "category": "string",
      "price": 99.5,
      "image": "https://...",
      "seller_id": "string",
      "shop_name": "string"
    }
  ]
}
```

---

## Asset URLs (seller image, category icon, banner image)

- Backend returns `image_url` / `iconUrl` built from S3 path when `S3_PUBLIC_BASE_URL` or `S3_BUCKET_NAME` + `AWS_REGION` are set.
- If only path is returned (e.g. `imagePath`), frontend can build URL as: `{S3_PUBLIC_BASE_URL}/{imagePath}`.

---

## Summary

| Purpose           | Method | Endpoint              | Auth   |
|-------------------|--------|------------------------|--------|
| Location label    | GET    | /location/address     | No     |
| Carousel banners  | GET    | /banners              | No     |
| Categories + icons| GET    | /categories           | No     |
| Nearby shops      | GET    | /sellers              | Optional |
| My favorites     | GET    | /favorites            | Yes    |
| Add favorite     | POST   | /favorites/:sellerId  | Yes    |
| Remove favorite   | DELETE | /favorites/:sellerId  | Yes    |
| Global search     | GET    | /search               | No     |
