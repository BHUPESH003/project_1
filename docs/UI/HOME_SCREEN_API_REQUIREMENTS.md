# Home Screen – API Requirements (from Stitch + Q&A)

**Screen:** Main home (Local Marketplace).  
**Status:** Decisions locked; implementation pending.

---

## 1. Location (header: “Current Location” / “Downtown Market”)

- **Flow:** Frontend sends `lat` / `lng` → backend returns address/location details.
- **API:** New endpoint(s) to accept coordinates and return address (e.g. reverse geocode or stored area name). Exact contract TBD.

---

## 2. Banners (carousel)

- **Source:** Configurable by admin via API.
- **API:** Admin-driven banners API (CRUD or config); app reads list for carousel. No static-only.

---

## 3. Seller rating

- **Source:** DB only at read time.
- **Population/update:**
  - On seller onboard: fetch relevant data (including rating) from **Google Places API** and store in DB.
  - **Cron:** Runs daily; updates each seller’s data (including rating) from Google.
- **API:** Rating field in seller response; no real-time Google call from API.

---

## 4. Open / Closed (shop status)

- **Mapping:** Use existing seller status: **ONLINE** → “Open Now”, **OFFLINE** → “Closed”.
- No new status or opening-hours logic for this screen.

---

## 5. Seller image

- **DB:** Add a seller image field; store **folder/file path** only (e.g. `sellers/abc123/cover.jpg`), not full S3 URL.
- **API:** Build full URL server-side and include as `image_url` in seller list/detail responses.

---

## 6. Category tags on shop cards

- **Source:** From the **seller’s categories** (existing relation).
- **API:** Ensure seller list/detail includes category info (id + name, or tag text) so frontend can show “Tools & Plumbing”, “Office Supplies”, etc.

---

## 7. Search (search bar: “Search shops, items or services…”)

- **API:** **Single global search API** that can return both shops and items/services (e.g. one query, mixed or typed results). Contract TBD.

---

## 8. Favorites

- **Storage:** **Favorites table** (e.g. user_id + seller_id) to store user’s favorite shops.
- **API:** Endpoints to add/remove favorite and list user’s favorite shops (and possibly “is favorited” on seller payloads).

---

## 9. Nearby shops – pagination

- **GET /sellers** must support **pagination** (e.g. limit/offset or cursor) to avoid heavy load on frontend and backend.
- “View More Shops” uses this.

---

## Summary checklist (for implementation)

| # | Item | Action |
|---|------|--------|
| 1 | Location by lat/lng | New endpoint: accept lat/lng, return address details |
| 2 | Banners | Admin API to manage banners; app API to read list |
| 3 | Seller rating | DB field + onboard + daily cron from Google Places |
| 4 | Open/Closed | Use ONLINE/OFFLINE in API/UI |
| 5 | Seller image | Add DB field (S3 URL); expose in seller APIs |
| 6 | Category tags | Return seller categories in list/detail |
| 7 | Global search | Single search API (shops + items/services) |
| 8 | Favorites | Favorites table + add/remove/list (and optional “isFavorited”) |
| 9 | Pagination | Add pagination to GET /sellers |
