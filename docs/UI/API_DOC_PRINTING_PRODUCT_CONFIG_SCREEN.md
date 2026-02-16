# API Doc – Printing Product Config Screen (Product selected → files + config)

This doc matches the flow you described for the “printing config” screen (previously mis-labeled as shop details):
- user selects a **printing product**
- user uploads **multiple files**
- user configures per-file: **copies / color / paperSize**
- backend calculates pricing

Base URL: `/api` (or your configured `API_PREFIX`). Responses use the standard envelope `{ code, data, message }`; use `data` below.

---

## 1) Add printing product to cart (creates/updates CartItem)

**POST** `/cart/items` (auth required)

Request example:
```json
{
  "productId": "printing_prod_123",
  "quantity": 1,
  "payload": { "type": "printing" }
}
```

Response includes the `CartItem.id` you’ll use below.

---

## 2) Upload a file (cart context)

**POST** `/internal/files/presigned-url` (auth required)

Request:
```json
{ "fileName": "doc.pdf", "mimeType": "application/pdf", "fileSize": 12345 }
```

**POST** `/internal/files/validate` (auth required)

Request:
```json
{
  "fileKey": "cart/....pdf",
  "originalName": "doc.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 12345
}
```

Response contains `fileId`.

---

## 3) Attach file to the printing cart item + config

**POST** `/cart/items/:id/files` (auth required)

Request example:
```json
{
  "fileId": "file_123",
  "payload": { "copies": 2, "color": "B&W", "paperSize": "A4" }
}
```

Update config:
- **PATCH** `/cart/items/:id/files/:fileId`

Remove file (also deletes from S3 + DB):
- **DELETE** `/cart/items/:id/files/:fileId`

---

## 4) Pricing

**GET** `/cart/calculate-price` (auth required)

Response (data) returns totals grouped by seller and includes printing breakdown per item/file.

Notes:
- Color multiplier currently used: `B&W = 1`, `Color = 2`
- Seller bulk discount applies to **printing portion** only, based on pages threshold.

