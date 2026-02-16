# API Doc – Seller Catalog Screen (Shop Details – Catalog)

This doc matches Stitch screen: `stitch_local_shop_details_page (1)` (Master Hardware catalog).

Base URL: `/api` (or your configured `API_PREFIX`). Responses use the standard envelope `{ code, data, message }`; use `data` below.

---

## 1) Seller header

**GET** `/sellers/:id?lat={lat}&lng={lng}`

- No auth required.
- Provide `lat`/`lng` to get `distance_km`.

**Response (data)** includes:
- `shopName`, `rating`, `imageUrl`, `status` (ONLINE/OFFLINE), `distance_km`
- `description` (seller-only)
- `discountThreshold` / `discountPercent` (seller-specific; mainly relevant for printing)

---

## 2) Catalog products list (with chips + pagination)

**GET** `/sellers/:id/products?filter={chip}&limit={n}&offset={n}`

- Auth optional.
- If `Authorization: Bearer <token>` is sent, each product includes:
  - `isWishlisted`
  - `notifyRequested`

**Query params**
- `filter`: `best_sellers` | `on_sale` | `new_arrivals`
- `limit`: default 20 (max 100)
- `offset`: default 0

**Response (data)**
```json
{
  "items": [
    {
      "id": "prod_123",
      "sellerId": "seller_123",
      "name": "Bosch Professional Impact Drill 550W",
      "description": "string",
      "category": "Tools & Hardware",
      "unit": "PER ITEM",
      "price": 3450,
      "mrp": 4200,
      "discountPercent": 18,
      "image": "https://...",
      "inStock": true,
      "isBestSeller": true,
      "isWishlisted": false,
      "notifyRequested": false
    }
  ],
  "pagination": { "total": 84, "limit": 20, "offset": 0 }
}
```

---

## 3) Cart (multi-seller, product-based)

### Get cart
**GET** `/cart` (auth required)

### Add product to cart
**POST** `/cart/items` (auth required)

Request:
```json
{
  "productId": "prod_123",
  "quantity": 1,
  "payload": {}
}
```

### Update cart item quantity/payload
**PATCH** `/cart/items/:id` (auth required)

### Remove cart item
**DELETE** `/cart/items/:id` (auth required)

---

## 4) Product wishlist (heart icon)

- **GET** `/products/wishlist` (auth required)
- **POST** `/products/:id/wishlist` (auth required)
- **DELETE** `/products/:id/wishlist` (auth required)

---

## 5) “Notify me” (out of stock)

- **GET** `/products/notify` (auth required)
- **POST** `/products/:id/notify` (auth required)
- **DELETE** `/products/:id/notify` (auth required)

