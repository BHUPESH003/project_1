# Seller Catalog + Printing Config – API Requirements (from Stitch + Q&A)

**Screens:**
- **(1) Seller Catalog (Shop details – catalog)**: `stitch_local_shop_details_page (1)`
- **(2) Printing config (product selected → files + config)**: previously mis-labeled as “shop details”

**Status:** Decisions locked; refactor in progress.

---

## Decisions

1. **CartItem must be generic (no sparse columns)**:
   - Store category-specific config in `CartItem.payload` (JSON)
   - For printing, attach multiple files via `CartItemFile` rows, each with `payload` JSON per file

2. **Pricing calculation**: Backend API calculates price per file and total.

3. **Cart management**: Server-side cart created when first item added. Cart is **multi-seller**.

4. **Bulk discount**: Seller-specific rules (threshold + percentage).

5. **File deletion**: Delete from DB and S3 when removed from cart.

6. **Size/colors**: configurable by user (stored in payload), not implied by product.

7. **Distance**: GET /sellers/:id accepts optional `lat`/`lng` query params, returns distance.

8. **Description**: Add `description` field to Seller model.

---

## Implementation Checklist (high level)

| # | Item | Action |
|---|------|--------|
| 1 | Generic cart models | Cart (userId), CartItem (sellerId, productId?, quantity, payload JSON), CartItemFile (fileId, payload JSON) |
| 2 | Seller description | Add `description` field to Seller model |
| 3 | Seller bulk discount | Add `discountThreshold`, `discountPercent` to Seller |
| 4 | GET /sellers/:id distance | Accept optional lat/lng, return distance |
| 5 | Cart API | POST /cart/items, GET /cart, PATCH /cart/items/:id, DELETE /cart/items/:id |
| 6 | Pricing API | GET /cart/calculate-price → totals grouped by seller + printing breakdown |
| 7 | File deletion | DELETE /cart/items/:id → deletes File from DB and S3 |
| 8 | Product paper size | Ensure Product model supports paper size attribute |
