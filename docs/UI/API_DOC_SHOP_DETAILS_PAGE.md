# API Doc – Shop Details Page (Deprecated)

This doc is **deprecated**. The “shop details” concept split into two screens:
- Seller Catalog screen (1): `docs/UI/API_DOC_SELLER_CATALOG_SCREEN.md`
- Printing config screen (2): `docs/UI/API_DOC_PRINTING_PRODUCT_CONFIG_SCREEN.md`

Frontend contract for the **Shop/Seller Details** screen (Printing Shop).  
Base URL: `/api`. All responses follow standard envelope `{ code, data, message }`; use `data` for payloads below.

---

## 1. Shop Header

**GET** `/sellers/:id?lat={lat}&lng={lng}`  
No auth. Optional `lat`/`lng` for distance.

**Response (data):**
```json
{
  "id": "string",
  "shopName": "Quick Print Hub",
  "address": "string",
  "description": "Professional document printing & binding services",
  "latitude": "28.61",
  "longitude": "77.20",
  "pricePerPage": 0.10,
  "prepTimeMinutes": 15,
  "status": "ONLINE",
  "rating": 4.9,
  "imageUrl": "https://...",
  "distance_km": 0.5,
  "discountThreshold": 50,
  "discountPercent": 10.0,
  "categories": [{ "id": "printing", "name": "Printing" }]
}
```
- `status`: `ONLINE` → "Open Now", `OFFLINE` → "Closed"
- `distance_km` present only when `lat`/`lng` provided
- `discountThreshold`/`discountPercent`: seller-specific bulk discount rules

---

## 2. File Upload (for cart)

**POST** `/internal/files/presigned-url`  
Auth required (`USER` role).

**Request:**
```json
{
  "fileName": "document.pdf",
  "mimeType": "application/pdf",
  "fileSize": 1024000
}
```
**Note:** `orderId` is optional (omit for cart files).

**Response (data):**
```json
{
  "uploadUrl": "https://s3...",
  "fileKey": "cart/1234567890-abc123.pdf",
  "expiresIn": 3600,
  "publicUrl": "https://..."
}
```

**POST** `/internal/files/validate`  
After upload, validate and create file record.

**Request:**
```json
{
  "fileKey": "cart/1234567890-abc123.pdf",
  "originalName": "document.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 1024000
}
```

**Response (data):**
```json
{
  "valid": true,
  "fileId": "file-123"
}
```

---

## 3. Cart Management

**GET** `/cart`  
Auth required. Get cart with items.

**Response (data):**
```json
{
  "id": "cart-123",
  "userId": "user-123",
  "sellerId": "seller-123",
  "seller": {
    "id": "seller-123",
    "shopName": "Quick Print Hub",
    "imagePath": "sellers/...",
    "rating": 4.9
  },
  "items": [
    {
      "id": "item-123",
      "fileId": "file-123",
      "color": "B&W",
      "paperSize": "A4",
      "copies": 1,
      "pages": 12,
      "file": {
        "id": "file-123",
        "originalName": "Project_Proposal_Final.pdf",
        "mimeType": "application/pdf",
        "pageCount": 12,
        "storageKey": "cart/...",
        "storageUrl": "https://..."
      }
    }
  ]
}
```

**POST** `/cart/items`  
Auth required. Add file to cart.

**Request:**
```json
{
  "fileId": "file-123",
  "sellerId": "seller-123",
  "color": "B&W",
  "paperSize": "A4",
  "copies": 1
}
```

**PATCH** `/cart/items/:id`  
Auth required. Update item (copies, color, paperSize).

**Request:**
```json
{
  "copies": 3,
  "color": "Color",
  "paperSize": "A3"
}
```

**DELETE** `/cart/items/:id`  
Auth required. Remove item and delete file from S3 and DB.

**Response (data):**
```json
{
  "success": true,
  "fileId": "file-123"
}
```

---

## 4. Pricing Calculation

**GET** `/cart/calculate-price`  
Auth required. Calculate price breakdown.

**Response (data):**
```json
{
  "items": [
    {
      "id": "item-123",
      "file": {
        "id": "file-123",
        "originalName": "Project_Proposal_Final.pdf",
        "pageCount": 12
      },
      "color": "B&W",
      "paperSize": "A4",
      "copies": 1,
      "pages": 12,
      "totalPages": 12,
      "pricePerPage": 0.10,
      "itemPrice": 1.20
    },
    {
      "id": "item-124",
      "file": {
        "id": "file-124",
        "originalName": "Event_Poster_Design.png",
        "pageCount": 1
      },
      "color": "Color",
      "paperSize": "A3",
      "copies": 3,
      "pages": 1,
      "totalPages": 3,
      "pricePerPage": 0.20,
      "itemPrice": 0.60
    }
  ],
  "totalPages": 15,
  "avgPricePerPage": 0.12,
  "subtotal": 1.80,
  "discountAmount": 0.18,
  "discountPercent": 10.0,
  "total": 1.62,
  "discountInfo": {
    "threshold": 50,
    "percent": 10.0,
    "applies": false
  }
}
```

**Pricing formula:**
- `itemPrice = (pages × copies × pricePerPage) × colorMultiplier`
- `colorMultiplier`: B&W = 1, Color = 2
- Bulk discount applies if `totalPages >= discountThreshold`

---

## Summary

| Purpose | Method | Endpoint | Auth |
|---------|--------|----------|------|
| Shop details | GET | /sellers/:id?lat=&lng= | No |
| Upload file | POST | /internal/files/presigned-url | Yes |
| Validate file | POST | /internal/files/validate | Yes |
| Get cart | GET | /cart | Yes |
| Add to cart | POST | /cart/items | Yes |
| Update item | PATCH | /cart/items/:id | Yes |
| Remove item | DELETE | /cart/items/:id | Yes |
| Calculate price | GET | /cart/calculate-price | Yes |
