# Claude Design Prompts — Hyperlocal Commerce App

> Each prompt below is self-contained. Paste the **Design System Prompt** first in a new conversation, then follow with individual screen prompts one at a time. Each screen prompt includes all the context Claude Design needs.

---

## PROMPT 0: Design System Foundation

```
I'm building a hyperlocal commerce mobile app (React Native) — think Blinkit meets Swiggy but for local services like printing, stationery, gifts, repairs, groceries. Users discover nearby sellers, browse products, place orders (sometimes from multiple sellers in one checkout), pay via UPI, and track delivery.

I need you to design a comprehensive design system for this app. The visual direction is:

AESTHETIC:
- Clean and minimal like Blinkit/Zepto — generous whitespace, sharp typography, fast-feeling
- Futuristic and modern — think glassmorphism accents, subtle depth, micro-interactions
- NOT traditional ecommerce. This should feel like a premium utility app — fast, sleek, purposeful
- Dark mode must be a first-class citizen, not an afterthought

COLOR SYSTEM:
- Primary: Deep teal/cyan family — trustworthy, modern, not "food delivery red"
- Accent: A warm secondary for CTAs and urgency (amber/gold)
- Semantic: Green for success/online, red for errors/offline, amber for warnings/pending
- Surfaces: Clean whites with subtle warm gray tints in light mode. Deep charcoal/near-black in dark mode with subtle surface elevation differences
- Consider subtle gradient accents (not backgrounds) for premium feel — like a teal-to-cyan gradient on primary buttons

TYPOGRAPHY:
- System font stack (SF Pro on iOS, Roboto on Android) for performance
- Strong typographic hierarchy: bold display numbers for prices, medium weight for headings, regular for body
- Monospaced digits for prices and OTP inputs
- Support for Hindi (Devanagari)

SPACING & LAYOUT:
- 8px grid system
- Generous touch targets (minimum 44pt)
- Card-based layout with subtle border radius (12-16px)
- Consistent 20px horizontal padding

ELEVATION & DEPTH:
- Subtle shadows for floating elements (cart bar, bottom sheets)
- Glassmorphism/frosted glass effect for overlays and bottom sheets
- Subtle blur behind modals and sheets
- No harsh drop shadows — use soft, diffused shadows only

MICRO-INTERACTIONS & ANIMATIONS:
- Spring-based animations (not linear) for all transitions
- Haptic feedback indicators in the design (subtle scale animations on tap)
- Skeleton loading states with shimmer animation
- Smooth page transitions (shared element transitions where possible)
- Pull-to-refresh with custom animation
- Lottie-style success/error animations
- Parallax scroll on hero images
- Staggered list item animations on load
- Swipe gestures for cart item deletion with red reveal
- Quantity stepper with subtle bounce on increment

ICONOGRAPHY:
- Outline icon style (Phosphor Icons or similar modern set)
- Consistent 24px size for navigation, 20px for inline
- Optional: animated icons for key states (order confirmed, delivery in progress)

COMPONENTS TO DEFINE:
1. Button variants (primary, secondary, ghost, danger, icon-only)
2. Input fields (text, phone with country code, OTP boxes, search)
3. Cards (seller card, product card, order card, delivery option card)
4. Pills/chips (category, sort filter, status badge, tag)
5. Bottom sheet (standard, with handle, with search)
6. Tab bar (bottom navigation with active indicator animation)
7. Top navigation bar variants (default, transparent over hero, search)
8. Floating action bar (cart summary)
9. Timeline/stepper (order progress)
10. Toast/snackbar notifications
11. Empty states (with illustration style guide)
12. Skeleton loading states
13. Toggle/switch
14. Quantity stepper
15. Rating display
16. Price display (with MRP strikethrough)

DEVICE FRAME:
- Design for iPhone 15 Pro frame (393 x 852)
- Show status bar, home indicator
- Design for safe areas

Please create the complete design system with all tokens, component library, and example states (default, hover/pressed, disabled, loading, error). Show both light and dark mode for every component.
```

---

## PROMPT 1: Splash + Onboarding

```
CONTEXT: This is a hyperlocal commerce app where users order services (printing, stationery, gifts, repairs, groceries) from nearby local shops. Think Blinkit/Swiggy but for all local commerce.

Design the splash screen and first-time onboarding experience.

SPLASH SCREEN:
- App logo/wordmark centered
- Subtle animated gradient background (teal to dark teal)
- Loading indicator — not a spinner, something more refined (pulsing logo, progress line, or particle effect)
- Transition: logo should animate into position for the onboarding/login screen (shared element transition)

ONBOARDING (first-time users only, 2-3 slides max):
- Slide 1: "Everything local, delivered" — illustration showing diverse local shops (print shop, stationery, gifts)
- Slide 2: "One cart, many shops" — illustration showing items from different sellers in one cart
- Slide 3: "Track it all" — illustration showing order tracking
- Modern illustration style: flat with subtle gradients, geometric shapes, not cartoon-y
- Pagination dots with animated transition
- "Skip" option and "Get started" CTA
- Parallax effect on illustrations as user swipes
- Smooth cross-fade between slides

VISUAL DIRECTION:
- Futuristic, clean, minimal
- Teal primary color, dark teal for depth
- Glassmorphism accents where appropriate
- Spring-based animations
- Design for iPhone 15 Pro (393x852) in both light and dark mode

Show the full flow: splash → onboarding slide 1 → slide 2 → slide 3 → transitions into login
```

---

## PROMPT 2: Auth Flow (Login + OTP)

```
CONTEXT: Hyperlocal commerce app. Auth is phone-number + OTP based. India-focused so +91 prefix, 10-digit numbers. Users can be consumers (USER role) or sellers (SELLER role) — but this screen is consumer-facing only. After auth, first-time users go to address selection; returning users go to home.

Design the login and OTP verification screens.

LOGIN SCREEN:
- App logo at top (not too large — this isn't a branding page, it's a utility)
- Headline: Something like "Get anything delivered" or "Your neighborhood, on tap"
- Subtext: Brief value prop — "Printing, stationery, gifts & more from shops near you"
- Phone number input:
  - Country code selector (+91 shown, flag optional)
  - 10-digit input field with proper spacing (XXXXX XXXXX)
  - Auto-focus keyboard on screen load
  - Input should feel premium — slightly larger than typical, clear typography
- "Continue" button (primary CTA, full-width)
  - Disabled state when number incomplete
  - Loading state with subtle animation when sending OTP
- Terms text at bottom: "By continuing, you agree to our Terms and Privacy Policy"
- Clean background — maybe subtle pattern or very light gradient

OTP VERIFICATION SCREEN:
- Back button to re-enter phone number
- "Enter verification code" heading
- "Sent to +91 98765 43210" with option to edit number
- 6 individual OTP input boxes:
  - Auto-advance cursor between boxes
  - Filled state: subtle background fill + border color change
  - Active/focus state: animated border (pulse or glow)
  - Error state: shake animation + red border
- Auto-read from SMS indicator (Android)
- Resend timer: "Resend code in 0:30" countdown
  - When timer expires: "Didn't get the code? Resend" as tappable link
- Verify button:
  - Disabled until all 6 digits entered
  - Success: checkmark animation → auto-transition to next screen
  - Error: shake animation on input boxes + error message

ANIMATIONS:
- Login → OTP transition: slide left with shared phone number element
- OTP boxes: staggered fade-in on entry
- Keyboard-aware layout (content shifts up smoothly when keyboard appears)
- Success: confetti or checkmark Lottie animation before navigation

VISUAL DIRECTION:
- Futuristic, clean, minimal
- Teal primary, warm accent
- Both light and dark mode
- iPhone 15 Pro frame (393x852)
```

---

## PROMPT 3: Address Selection (Bottom Sheet/Modal)

```
CONTEXT: This is the most critical UX pattern in the app. Address drives everything — which sellers you see, delivery availability, pricing. The address is selected on first launch and persists globally. Users can change it anytime by tapping the address pill in the header. Inspired by Blinkit/Zepto address selection.

The address selection appears as a bottom sheet/modal overlay with frosted glass backdrop.

Design the address selection experience.

ADDRESS BOTTOM SHEET — has 4 states:

STATE 1: Initial (first launch, no saved addresses)
- "Set your delivery location" heading
- "Use current location" — prominent option with GPS/location icon and animated pulse ring
  - When tapped: shows loading state → resolves to address → confirms
  - Subtext: "Using GPS"
- Search bar below: "Search for area, street name..."
  - On tap: transitions to search state
- Map illustration or subtle background element

STATE 2: Returning user (has saved + recent addresses)
- Search bar at top
- "Use current location" row
- "Saved addresses" section:
  - Cards with icon (Home/Office/Other), label, full address line, receiver name
  - Each card tappable to select
  - Swipe left to reveal edit/delete
  - Small edit icon on each
- "Recent addresses" section below saved
- "+ Add new address" at bottom

STATE 3: Search active
- Search input focused, keyboard open
- Google Places autocomplete results streaming in as user types
- Each result: address line with highlighted matching text
- Recent searches (if search empty)
- Clear search button (X in search field)

STATE 4: Confirm selected location
- Small map preview showing pin location
- Address displayed below map
- "Confirm location" button
- "Add details" option to add flat/floor/landmark

INTERACTIONS & ANIMATIONS:
- Bottom sheet slides up with spring animation
- Frosted glass / glassmorphism backdrop blur
- Drag-to-dismiss gesture with velocity threshold
- Search results animate in with staggered fade
- Location pulse animation on GPS option
- Smooth height transitions between states
- Map pin drop animation on confirm

VISUAL DIRECTION:
- Futuristic, clean, minimal
- The bottom sheet should feel like a premium glass panel floating over the content
- Teal primary color
- Both light and dark mode
- iPhone 15 Pro (393x852) — show the sheet over a blurred home screen
```

---

## PROMPT 4: Home Screen

```
CONTEXT: This is the main landing screen of a hyperlocal commerce app. Users see sellers near their selected address. The app starts with printing services but the architecture supports any local commerce category (stationery, gifts, food, repairs, etc).

Key business rules:
- Address is global and always visible at top (Blinkit-style)
- Only sellers who can serve the user's location are shown
- Sellers can be "verified" (onboarded on platform — full ordering) or "unverified" (discovered via Google Maps — messaging only)
- Verified sellers always rank above unverified
- Seller card shows: shop name, image, rating, distance, prep time, starting price, categories, online/offline status, favorite toggle
- Categories show active ones and "coming soon" ones

Design the home screen with all its sections and states.

HEADER:
- Address pill (left): location icon + "Delivering to" micro-label + area name + chevron down
  - Tapping opens address bottom sheet
  - Subtle glow/highlight animation on first use
- Right side: favorites (heart) icon + notification bell icon
  - Bell shows dot indicator when unread notifications exist

SEARCH BAR:
- Below header, tappable (not a real input — tapping navigates to full search screen)
- Placeholder: "Search shops and products..."
- Search icon left, microphone icon right (future voice search)
- Subtle border + shadow treatment to lift off background

BANNER CAROUSEL:
- Auto-scrolling promotional banners
- Full-width cards with rounded corners
- Content: badge + title + subtitle + optional illustration
- Pagination: animated dots or line indicator
- Swipe gesture support
- Parallax effect on banner images

CATEGORY SECTION:
- "Shop by category" with "See all" link
- Horizontal scrollable pills/circles
- Each: icon + label
- Active category (Printing) — highlighted with primary color fill
- Coming soon categories — subtle badge, slightly muted
- Smooth scroll with momentum
- Selected state animation (scale + color transition)

NEARBY SELLERS SECTION:
- Section header: "Nearby shops" or "Shops near you"
- Sort/filter pills: Nearest | Top rated | Price: low to high | Newest
  - Active pill has filled background
  - Horizontal scroll if more options
  - Tap animation: pill fills with color

SELLER CARD DESIGN (this is critical — users see dozens of these):
- Horizontal layout: image left (square, rounded corners) + info right
- Shop image with subtle loading skeleton
- Shop name with online indicator (green dot + "Open" or dimmed for offline)
- Rating: star icon + number (4.8) — use amber/gold for star
- Distance: "1.2 km"
- Prep time: "~15 min"
- Starting price: "From ₹2/page" in primary color
- Category tags as small pills
- Favorite heart icon (top-right of card) with animation on toggle (scale + color fill)
- Unverified seller variant: same card but with "Not verified" amber badge, no online status, slightly different opacity/treatment

FLOATING CART BAR:
- Appears when cart has items
- Slides up with spring animation from bottom
- Dark background (dark teal/charcoal) for contrast
- Shows: item count badge + seller name + "View cart" with arrow
- Positioned above tab bar
- Subtle shadow for elevation
- Tap: slides to cart screen

BOTTOM TAB BAR:
- 3 tabs: Home, Orders, Profile
- Active tab: icon fills/changes color + label appears
- Subtle indicator animation (sliding dot or line under active tab)
- Frosted glass background (blur effect from content scrolling behind)

STATES TO SHOW:
1. Default loaded state (with 3-4 seller cards)
2. Loading state (skeleton shimmer on all sections)
3. Empty state — no sellers nearby ("No shops in your area yet" with illustration + "Try a different location" CTA)
4. Scrolled state — header compacts, search bar sticks

ANIMATIONS:
- Pull-to-refresh with custom animation (not default spinner)
- Seller cards stagger in on load (0.05s delay between each)
- Banner auto-advance with smooth transition
- Tab bar icon animation on switch
- Floating cart bar entrance/exit spring animation
- Scroll-linked header collapse (parallax)

VISUAL DIRECTION:
- Futuristic, clean, minimal — Blinkit-level whitespace with modern depth
- Teal primary, warm accents
- Subtle glassmorphism on overlay elements (tab bar, cart bar)
- Both light and dark mode
- iPhone 15 Pro frame (393x852)
```

---

## PROMPT 5: Search Screen

```
CONTEXT: Global search across shops and products in a hyperlocal commerce app. The user taps the search bar on the home screen and this full-screen search experience opens.

The backend returns two result types: "shops" (sellers) and "products" (items from sellers). Products show which seller they belong to. Tapping a shop goes to seller detail. Tapping a product goes to the seller detail with that product highlighted.

Design the search experience.

SEARCH SCREEN STATES:

STATE 1: Empty / Initial
- Auto-focused search input at top with back arrow
- "Recent searches" section with history items (clock icon + text + X to remove)
- "Popular near you" section showing trending categories or shops
- Keyboard open

STATE 2: Typing (live results)
- Search input with typed text + clear (X) button
- Results split into two sections:
  - "Shops" section: compact seller rows (image, name, rating, distance)
  - "Products" section: product rows (name, price, seller name)
- Results stream in as user types (debounced, 300ms)
- Highlighted matching text in results
- Staggered animation as results appear

STATE 3: No results
- Illustration (clean, geometric style)
- "No results for '{query}'"
- "Try searching for something else" subtext
- Suggestion chips: popular categories

INTERACTIONS & ANIMATIONS:
- Screen slides in from right (or search bar expands into full screen)
- Results fade in with stagger
- Text highlight animation on matching characters
- Smooth keyboard-aware layout
- Recent search items: swipe to delete

VISUAL DIRECTION:
- Ultra clean, fast-feeling — minimal chrome, maximum content
- Teal primary, futuristic
- Both light and dark mode
- iPhone 15 Pro frame (393x852)
```

---

## PROMPT 6: Seller Detail Screen

```
CONTEXT: This is the conversion screen — where users browse a seller's products and add to cart. The app is a hyperlocal commerce platform. This screen must work for ANY seller category (printing, stationery, gifts, etc.) not just printing.

Key business rules:
- Products are grouped by category
- For printing products: "Add" opens a file upload + configuration flow (separate screen)
- For simple products: "Add" adds directly with quantity 1, then shows +/- stepper
- Cart is multi-seller — user might already have items from other sellers
- Seller can be online (orderable) or offline (visible but not orderable)
- Seller detail shows: hero image, name, rating, distance, prep time, description, pricing info
- Products show: name, description, price, MRP (strikethrough if discounted), best seller badge

Design the seller detail screen.

LAYOUT:

HERO SECTION:
- Full-width image/cover (parallax scroll effect)
- Overlay navigation: back button, share icon, favorite heart
- Semi-transparent gradient overlay at bottom of image for text readability
- If no image: abstract pattern with seller category icon

INFO SECTION (below hero):
- Shop name (large, bold) + online/offline status badge
- Rating (star + number), distance, prep time — in a single row with separators
- Short description (collapsible if long, "Read more" expand)
- Quick info chips: pricing highlights (e.g., "B&W from ₹2/pg", "Color from ₹8/pg")

TAB BAR (sticky on scroll):
- "Products" | "Info" tabs
- Animated underline indicator that slides between tabs
- Sticks to top when scrolled past

PRODUCTS TAB:
- Category headers (e.g., "Printing services", "Stationery", "Binding & finishing")
- Product rows within each category:
  - Product name (with "Popular" or "Best seller" badge if applicable)
  - Description (1 line, truncated)
  - Price display: current price + MRP strikethrough + discount percentage badge
  - Right side: "Add" button or quantity stepper
  - For printing products: "Upload & configure" button instead of simple "Add"
- Category jump: tappable category chips that scroll to section (sticky below tab bar)

INFO TAB:
- Full address with map preview (small, non-interactive)
- Operating hours (future — show placeholder)
- Contact info
- Distance from current location

STICKY BOTTOM BAR (appears when items in cart from THIS seller):
- Dark background
- Left: item count + total price
- Right: "View cart" CTA button
- Slides up with spring animation when first item added
- Updates count/price with animated number transition

STATES TO SHOW:
1. Default loaded state with products
2. Offline seller state (banner: "This shop is currently closed. Browse products for later.", Add buttons disabled)
3. Item added state (Add button transforms to quantity stepper with animation)
4. Scrolled state (hero collapses, tab bar sticks, seller name in nav bar)

ANIMATIONS:
- Hero parallax on scroll
- Shared element transition from seller card to hero
- Tab underline sliding animation
- Add button → quantity stepper morph animation
- Sticky cart bar entrance with spring physics
- Staggered product list load animation
- Category section scroll-linked highlighting in jump chips
- Pull-to-refresh

VISUAL DIRECTION:
- Futuristic, clean, minimal with depth
- Teal primary, modern typography
- Glassmorphism on navigation overlay (over hero image)
- Both light and dark mode
- iPhone 15 Pro frame (393x852)
```

---

## PROMPT 7: Printing Configuration Flow

```
CONTEXT: This is a category-specific flow within a hyperlocal commerce app. When a user taps "Upload & configure" on a printing product from a seller, this flow opens. It's a multi-step process: upload files → configure print settings per file → review → add to cart.

This is what makes the printing category special. Other categories (stationery, gifts) just have simple "Add to cart." Printing requires file upload and per-file configuration.

Key business rules:
- User can upload multiple files (PDF, images)
- Each file gets independent configuration: color mode, paper size, copies, page range
- Price is calculated live per file based on: page count × price per page × copies × color multiplier
- The seller's pricing (per page for B&W and color) drives the calculation
- Files are uploaded to S3 via presigned URLs
- All config is stored as JSON payload in the cart item

Design the printing configuration flow.

STEP 1: FILE UPLOAD
- "Upload your documents" heading
- Upload area: large dashed border box with upload icon
  - "Tap to upload PDF or images"
  - Drag-and-drop visual (even if mobile doesn't support it — looks good)
  - Supported formats note: "PDF, JPG, PNG up to 25MB"
- Uploaded files list:
  - File card: file icon (PDF/image), filename (truncated), page count, file size
  - Upload progress bar (animated) while uploading
  - Success state: green checkmark
  - Error state: red icon + "Upload failed" + retry
  - Delete button (X) on each file
- "Continue to configure" button (disabled until at least 1 file uploaded)
- "Add more files" button below uploaded files

STEP 2: CONFIGURE (per file)
- Horizontal file tabs/chips at top (scrollable if multiple files)
  - Active file highlighted
  - Each shows filename + page count
- Configuration for selected file:
  - Color mode: "Color" / "Black & White" toggle switch or segmented control
    - Visual preview: show color indicator
  - Paper size: "A4" / "A3" / "Letter" — segmented control or dropdown
  - Copies: quantity stepper (- 1 +) with large tap targets
  - Pages: "All pages" toggle ON by default
    - If toggled off: page range input (From: 1, To: 24)
  - Print sides: "Single side" / "Both sides" toggle (future — show as coming soon)

- LIVE PRICE CALCULATION (updates in real-time):
  - Price breakdown card at bottom:
    - "{pageCount} pages × {copies} copies × ₹{pricePerPage}/page"
    - File subtotal: "₹384"
  - Total across all files shown if multiple files
  - Animated number transitions when config changes

- Navigation: "Previous file" / "Next file" buttons, or swipe between files
- "Add to cart — ₹{total}" sticky button at bottom

STEP 3: REVIEW (optional, can be combined with step 2)
- All files listed with their configs summarized
- Total price prominently displayed
- "Add to cart" final CTA

ANIMATIONS:
- File upload: progress bar animation, checkmark appear animation
- Config toggles: smooth slide transitions
- Price: animated counter (numbers roll up/down)
- File tab switching: content cross-fade
- Step transitions: slide with shared elements
- Add to cart: success animation + toast "Added to cart from {sellerName}"

VISUAL DIRECTION:
- Futuristic, clean, systematic — this is a configuration interface, should feel precise and technical
- Good use of segmented controls and clear visual states
- Teal primary, futuristic
- Both light and dark mode
- iPhone 15 Pro frame (393x852)
- Show the multi-file state (2-3 files uploaded with different configs)
```

---

## PROMPT 8: Cart Screen

```
CONTEXT: The cart in this hyperlocal commerce app is multi-seller by design. A user can have items from multiple different shops in one cart. This is a strategic differentiator — most marketplace apps limit to single-seller carts.

Key business rules:
- Cart items are grouped by seller
- Each seller group shows: seller avatar, name, online status, items, subtotal
- Printing items show: filename, page count, config summary (color, size, copies)
- Simple items show: product name, quantity stepper, price
- Combined total shown at bottom across all sellers
- Delivery fees are NOT shown in cart — shown at checkout
- User can modify quantities, remove items
- Swiping an item left reveals delete option
- Empty cart has a friendly illustration + CTA to browse shops

Design the cart screen.

LAYOUT:

NAVIGATION:
- Back arrow + "Your cart" title
- Optional: "Clear all" action (top right, requires confirmation)

SELLER GROUP:
- Group header: seller avatar/icon + shop name + online status
  - Subtle background tint to separate groups
  - Collapsible/expandable (chevron toggle)
- Items within group:
  - PRINTING ITEM: file icon + product name + filename with page count (e.g., "thesis_final.pdf · 24 pages") + config summary (Color, A4, 2 copies) + price. No quantity stepper (quantity is copies, edited via config). "Edit" link to reopen config.
  - SIMPLE ITEM: product name + description + price + quantity stepper (- N +). Price updates with quantity.
- Seller subtotal row at bottom of each group

CART SUMMARY (below all groups):
- Per-seller line items showing seller name + subtotal
- Discount line (if applicable, in green)
- Horizontal divider
- Total: large, bold, primary color
- Note: "Delivery charges calculated at checkout"

BOTTOM CTA:
- Fixed at bottom
- "Proceed to checkout" — full-width primary button
- Shows total price in the button text

EMPTY STATE:
- Centered illustration (clean, geometric — shopping bag or cart)
- "Your cart is empty"
- "Browse nearby shops and add items"
- "Explore shops" CTA button

INTERACTIONS:
- Swipe left on item → reveals red "Remove" action with trash icon
- Swipe left further → auto-deletes with undo toast
- Quantity stepper: bounce animation on press, haptic feedback
- Removing last item from a seller group: group collapses and removes with animation
- Total updates with animated number transition
- Edit config: tapping "Edit" on printing item opens config bottom sheet

ANIMATIONS:
- Item removal: slide out + height collapse with spring physics
- Seller group collapse: smooth accordion
- Price updates: counting animation (numbers roll)
- Empty state: illustration fades in with slight scale
- Swipe-to-delete: elastic overscroll feel
- Screen load: staggered card entrance

VISUAL DIRECTION:
- Futuristic, clean, minimal
- Clear visual hierarchy between seller groups
- Teal primary, modern depth
- Both light and dark mode
- iPhone 15 Pro frame (393x852)
- Show the multi-seller state (2 sellers, 3-4 items total)
```

---

## PROMPT 9: Checkout Screen

```
CONTEXT: This is the most complex screen in the app. The checkout must handle multi-seller orders while feeling like a single, simple flow. This is a hyperlocal commerce app where users order from nearby local shops.

Key business rules:
- User may have items from multiple sellers — each seller needs its own delivery option
- Product payment goes through the platform (Razorpay/UPI)
- Delivery payment goes DIRECTLY to the delivery partner (separate) — this is a deliberate business decision for transparency
- Delivery options come from multiple providers (Porter, Dunzo, Uber Direct) with different prices and ETAs
- Each seller section shows: collapsed item list, price breakdown, delivery provider selection
- The platform shows "Recommended" (best value) and "Cheapest"/"Fastest" badges on delivery options
- Final "Pay" button shows only the product total (not delivery)
- Clear note explaining delivery fee is paid separately to partner

Design the checkout screen.

LAYOUT:

NAVIGATION:
- Back arrow + "Checkout" title

DELIVERY ADDRESS BAR:
- Pinned at top
- Location icon + "Deliver to" label + address line + "Change" link
- Tapping "Change" opens address bottom sheet
- Subtle background differentiation

PER-SELLER SECTION (repeated for each seller):
- Section header: seller icon + seller name + item count + seller subtotal
  - Tappable to expand/collapse items list
  - Collapsed by default (showing summary only)
- Expanded items: brief item list (name, qty, price per item)
- "Select delivery" sub-heading
- Delivery option cards (2-3 per seller):
  - Radio selection (one active per seller)
  - Card layout: radio button + provider name + badge (Recommended/Cheapest/Fastest) + ETA range + price
  - Selected state: teal border + light teal background
  - Unselected: light gray border
  - Provider logo/icon (optional)
- "Self pickup" option (if seller supports): saves delivery fee

ORDER SUMMARY (below all seller sections):
- Collapsible detailed breakdown:
  - Per-seller item totals
  - Discount (if any)
  - Platform fee (if any, currently ₹0)
- Prominent total: "You pay now: ₹XXX"
- Delivery fee note with info icon: "Delivery fee (₹XX + ₹YY) paid directly to delivery partners"
  - Tapping info icon shows tooltip/bottom sheet explaining why

BOTTOM CTA:
- Fixed at bottom
- "Pay ₹XXX" with lock icon (security signal)
- Disabled if delivery not selected for all sellers
- Loading state when processing

EDGE CASES:
- Single seller: simplified layout (no per-seller grouping needed, but use same component)
- Seller offline at checkout time: warning banner "Quick Print Hub went offline. Remove items?"
- No delivery available: "No delivery partners available. Try self-pickup or check back later."

INTERACTIONS:
- Seller sections: smooth accordion expand/collapse
- Delivery option selection: radio animation + card border transition
- Price recalculation: animated number updates
- Address change: sheet opens → on select → delivery options refresh (skeleton loading)
- Info tooltip: bottom sheet slides up with explanation

ANIMATIONS:
- Delivery option card: pulse highlight on selection
- Pay button: subtle shimmer/glow when ready
- Price summary: counting animation on total changes
- Section expand/collapse: spring physics accordion
- Screen load: top-down stagger (address → seller 1 → seller 2 → summary)

VISUAL DIRECTION:
- This must feel trustworthy — users are about to pay. Clean, confident, no visual clutter
- Futuristic but not flashy. Think Apple Pay level of calm confidence
- Clear separation between seller sections (4px dividers or card grouping)
- Teal primary, muted backgrounds
- Both light and dark mode
- iPhone 15 Pro frame (393x852)
- Show the multi-seller state (2 sellers with different delivery options)
```

---

## PROMPT 10: Payment Flow (UPI + States)

```
CONTEXT: Payment in this hyperlocal commerce app is UPI-first (India-focused). The payment is handled via Razorpay SDK which launches a UPI intent. The user pays only for products — delivery is paid separately to the partner.

Design the payment processing flow including all states.

PAYMENT PROCESSING SCREEN:
- Shown after user taps "Pay ₹XXX" on checkout
- Centered layout:
  - Animated illustration/icon (processing indicator — not a spinner, something more premium)
  - "Completing your payment..." text
  - "₹534 via UPI" subtitle
  - Order summary micro-card below (seller names, item counts)
- This screen shows while Razorpay SDK handles the actual UPI flow
- Cancel option at bottom (subtle, not prominent)

PAYMENT SUCCESS SCREEN:
- Big animated checkmark (green, Lottie-style celebration animation)
- "Payment successful!" heading
- "₹534 paid" in large display text
- Order card(s) preview:
  - For multi-seller: show mini cards for each order created
  - Each: "Order #QP2847 — Quick Print Hub — 2 items"
  - Each card tappable to go to order detail
- "Track your orders" primary CTA
- "Continue shopping" secondary CTA
- Confetti or particle animation on success (subtle, not overwhelming)

PAYMENT FAILURE SCREEN:
- Animated illustration (clean, empathetic — not alarming)
- "Payment didn't go through" heading (not aggressive error language)
- Reason if available: "Transaction timed out" / "Payment declined by bank"
- "Retry payment" primary CTA (prominent)
- "Try a different method" secondary option
- "Cancel order" tertiary/ghost option at bottom
- Reassurance text: "Don't worry, no amount was deducted"

PAYMENT PENDING SCREEN (for cases where UPI is delayed):
- Animated waiting illustration (clock or hourglass, subtle)
- "Payment is being confirmed..."
- "This usually takes a few seconds. We'll notify you once confirmed."
- "Check order status" link
- Auto-refreshes status every 5 seconds

ANIMATIONS:
- Checkout → Processing: smooth transition, overlay dims
- Processing indicator: looping animation (pulsing circles, orbiting dots — something modern)
- Success: celebration burst animation → settles into checkmark
- Failure: gentle shake → icon appears
- All transitions use spring physics
- Auto-navigation to success/failure (no manual tap needed)

VISUAL DIRECTION:
- Success should feel celebratory but clean
- Failure should feel calm and recoverable, not scary
- Processing should feel assured and premium
- Futuristic, modern, confident
- Teal primary, green for success, warm red for failure (not harsh)
- Both light and dark mode
- iPhone 15 Pro frame (393x852)
```

---

## PROMPT 11: Orders List Screen

```
CONTEXT: This is the Orders tab (Tab 2) of the hyperlocal commerce app. Shows all user orders — active ones prominently at top, past orders below. Each order is linked to one seller (multi-seller checkout creates separate orders per seller).

Key business rules:
- Order states: CREATED → PAID → SELLER_ACCEPTED → PREPARING → READY_FOR_PICKUP → PICKED_UP → DELIVERED
- Also: SELLER_REJECTED, USER_CANCELLED, ORDER_EXPIRED, DELIVERY_FAILED
- Active orders = any state before DELIVERED or terminal states
- Each order shows: order number, seller name, items summary, total, status, ETA if applicable
- Tapping an order goes to order detail

Design the orders list screen.

LAYOUT:

TOP SECTION — ACTIVE ORDERS:
- Section label: "Active" with count badge
- Order cards (larger, more prominent):
  - Seller avatar + seller name
  - Status pill (color-coded by state):
    - Blue: Paid, Seller accepted
    - Amber: Preparing
    - Teal: Ready for pickup, Picked up (in transit)
    - Green: Delivered
    - Red: Rejected, Cancelled, Failed, Expired
  - Items: "2 items — Document printing, Spiral binding"
  - Total: "₹414"
  - ETA bar: if in delivery, show "Arriving in ~15 min" with subtle progress indicator
  - Live status animation (pulsing dot or subtle indicator for active states)

BOTTOM SECTION — PAST ORDERS:
- Section label: "Past orders"
- Compact order cards:
  - Seller name + date
  - Items summary (truncated)
  - Total + status pill
  - "Reorder" button (adds same items to cart)
- Sorted by date (newest first)
- Infinite scroll with loading indicator

EMPTY STATE:
- Illustration (clean, geometric)
- "No orders yet"
- "Explore shops near you" CTA

INTERACTIONS:
- Pull-to-refresh with custom animation
- Tap order card → navigates to order detail
- Reorder tap → confirmation bottom sheet → adds items → navigates to cart
- Active order cards: subtle live pulse animation
- Swipe order card → no action (orders are not deletable)

ANIMATIONS:
- Screen entry: staggered card load
- Status pill: subtle color pulse for active orders
- Pull-to-refresh: custom indicator
- New order appears: slides in from top with spring animation
- Order status update: card highlights briefly (glow) then updates

VISUAL DIRECTION:
- Futuristic, clean, informative
- Active orders should feel "alive" — subtle motion, prominence
- Past orders should feel settled, archived
- Teal primary, status-colored pills
- Both light and dark mode
- iPhone 15 Pro frame (393x852)
- Show 2 active orders + 2 past orders
```

---

## PROMPT 12: Order Detail + Tracking Screen

```
CONTEXT: This is the post-purchase source of truth in the hyperlocal commerce app. Once an order is placed, this screen shows everything about it — status, timeline, items, seller info, delivery info, pricing. The platform doesn't build custom map tracking — it links to the delivery provider's tracking page.

Key business rules:
- Order has a state machine with immutable history (every transition logged with timestamp)
- Timeline shows all completed steps + current step + future steps
- Delivery info shows provider name, ETA, partner contact (when assigned)
- Tracking link opens delivery provider's tracking page in external browser
- User can cancel order if it's in a cancellable state (pre-PICKED_UP)
- Refund is auto-initiated on cancellation
- Payment summary shows what user paid (product cost) and delivery fee separately with note

Design the order detail screen.

LAYOUT:

NAVIGATION:
- Back arrow + "Order #QP2847" + "Need help?" link (top right)

STATUS BANNER:
- Full-width card below nav
- Icon representing current state (animated):
  - Preparing: chef hat / tools icon with subtle animation
  - Ready: package icon
  - In transit: truck with moving animation
  - Delivered: checkmark celebration
- Main status text: "Being prepared" / "Ready for pickup" / "On the way" / "Delivered"
- Sub text: "Your order is being printed right now"
- Background color matches status (light teal for active, light green for delivered, light amber for waiting)

TIMELINE:
- Vertical step indicator
- Each step: dot/icon + title + timestamp
- Completed steps: teal dot with checkmark + full opacity
- Current step: animated pulsing dot/ring + bold text
- Future steps: gray dot + muted text
- Connecting line between steps (solid for completed, dashed for future)
- Steps: Order placed → Payment confirmed → Seller accepted → Preparing → Ready for pickup → Picked up → Delivered

DELIVERY SECTION:
- Card with delivery provider info
- Before assignment: "Delivery partner will be assigned when order is ready"
- After assignment: Provider name + partner name + phone (call button) + vehicle type
- Tracking: "Track delivery" button that opens external link
  - Icon: external link indicator
- ETA display when in transit

SELLER SECTION:
- Seller avatar + name + address
- Call button (phone icon)
- Message button (chat icon — for future messaging feature)

ITEMS SECTION:
- Full item list with quantities, prices
- For printing: filename, pages, config summary
- Expandable if many items

PRICE BREAKDOWN:
- Subtotal
- Discount (if any)
- Delivery fee with asterisk: "₹35*"
- Total paid (bold, primary color)
- Footnote: "*Delivery paid directly to delivery partner"

ACTIONS:
- "Cancel order" button (only when cancellable — red outline button)
  - Confirmation sheet: "Cancel this order? ₹414 will be refunded in 3-5 business days."
  - "Yes, cancel" / "Keep order" options
- "Download receipt" (future)
- "Rate order" (future — show after delivered)

STATES TO SHOW:
1. Active order in "Preparing" state (mid-flow, delivery not yet assigned)
2. Active order "In transit" (delivery assigned, tracking available)
3. Completed/delivered state
4. Cancelled state (with refund info)

ANIMATIONS:
- Timeline dots: pulse animation on current step
- Status banner: icon has subtle loop animation matching state
- In-transit: truck icon moves subtly
- Delivery assigned: card slides in with spring animation
- Cancel confirmation: bottom sheet with backdrop blur
- Status update: entire banner cross-fades to new state

VISUAL DIRECTION:
- This is a trust screen — must feel reliable, informative, complete
- Futuristic timeline design (not dated stepper)
- Teal primary, status-aware colors
- Glassmorphism on delivery tracking card
- Both light and dark mode
- iPhone 15 Pro frame (393x852)
```

---

## PROMPT 13: Profile & Settings

```
CONTEXT: Profile tab (Tab 3) of a hyperlocal commerce app. Standard profile section with settings. The user is a consumer who orders from local shops.

Features: edit profile, manage addresses, view favorites, notification preferences, appearance (light/dark/system), help & support, about, logout.

Design the profile tab and its sub-screens.

PROFILE MAIN SCREEN:
- User info card at top:
  - Avatar circle (initials if no photo, with option to add photo)
  - Name (large)
  - Phone number (muted)
  - "Edit profile" link/button
- Menu list:
  - Icon + label + chevron for each item
  - Grouped into sections with subtle dividers:
    - Section 1: My Addresses, Favorites, Notification Preferences
    - Section 2: Appearance, Language (future)
    - Section 3: Help & Support, About, Rate the app
  - Logout at bottom (red text, no icon)

EDIT PROFILE (sub-screen):
- Avatar with edit camera icon overlay
- Name input field
- Email input field (optional)
- Phone number (read-only, shown but not editable — tied to auth)
- Save button

MY ADDRESSES (sub-screen):
- List of saved addresses:
  - Icon by type (home/office/pin), label, full address, receiver name
  - Tappable to edit
  - Swipe left to delete with confirmation
- "Add new address" button at bottom (or FAB)
- Empty state if no saved addresses

ADD/EDIT ADDRESS (sub-screen):
- Search bar for Google Places autocomplete
- Address line (auto-filled, editable)
- Floor/Building/Landmark input
- Label selector: Home | Office | Other (custom text)
- Receiver name input
- Receiver phone input
- Save button

FAVORITES (sub-screen):
- Grid or list of favorited sellers (reuse seller card component)
- Unfavorite: tap heart icon → confirmation → removes with animation
- Empty state: "No favorites yet — heart a shop to save it here"

NOTIFICATION PREFERENCES (sub-screen):
- Toggle switches:
  - Order updates (default ON) — "Get notified about order status changes"
  - Promotions (default OFF) — "Deals and offers from nearby shops"
  - New sellers (default OFF) — "When new shops open in your area"

APPEARANCE (sub-screen or inline toggle):
- Three options: Light | Dark | System
- Segmented control or radio cards with preview thumbnails
- Live preview: switching should immediately change the current screen

ANIMATIONS:
- Menu items: subtle press animation (scale 0.98)
- Avatar edit: camera icon appears with bounce
- Address delete: swipe reveal + slide out
- Toggle switches: smooth slide with color transition
- Appearance switch: smooth cross-fade between themes

VISUAL DIRECTION:
- Futuristic but familiar — users know how profile sections work, don't reinvent
- Clean grouping, good spacing
- Teal accents on interactive elements
- Both light and dark mode
- iPhone 15 Pro frame (393x852)
```

---

## PROMPT 14: Messaging / Chat Screen (Future Feature)

```
CONTEXT: The hyperlocal commerce app uses a WhatsApp bot as a relay between users and sellers. All messages flow through the platform's bot, giving visibility into conversations. This is the future in-app messaging UI that will replace WhatsApp relay.

Use cases:
- Pre-purchase: "Can you print on glossy paper?" / "Do you have A3 size?"
- Order-related: "My files are attached, please check" / "How long will it take?"
- Contacting unverified sellers (discovered via Maps API) before they're onboarded
- File sharing: users can send PDFs/images through chat

Design the messaging screens.

CONVERSATION LIST:
- Screen title: "Messages"
- List of conversations:
  - Seller avatar + seller name
  - Last message preview (truncated)
  - Timestamp (relative: "2m ago", "Yesterday")
  - Unread indicator (badge with count)
  - Online status of seller
- Search bar at top to filter conversations
- Empty state: "No conversations yet. Message a shop to get started."

CHAT SCREEN:
- Header: back arrow + seller avatar + seller name + online status + call/info buttons
- Message bubbles:
  - User messages: right-aligned, teal background
  - Seller messages: left-aligned, gray background
  - System messages: centered, muted, smaller text (e.g., "Order #QP2847 created")
- File messages:
  - Shared files show as cards: file icon + filename + size + "View" button
  - Image messages show inline thumbnail (tappable to full screen)
- Timestamp grouping: "Today", "Yesterday", etc.
- Input bar at bottom:
  - Text input (multi-line expandable)
  - Attachment button (paper clip) → opens: Camera, Photo library, Document
  - Send button (teal, appears when text entered)
- Message states: sending (clock icon), sent (single check), delivered (double check), read (colored double check)

INTERACTIONS:
- Long press message: copy, delete options
- Image tap: full-screen viewer with zoom
- Pull-down: load older messages
- Keyboard-aware: input bar rises with keyboard
- Voice message button (hold to record — future, show placeholder)

ANIMATIONS:
- New message: slides in from bottom with spring
- Send: bubble appears with subtle scale animation
- Typing indicator: animated dots (three bouncing dots)
- File upload: progress bar within the message bubble
- Unread badge: subtle pulse

VISUAL DIRECTION:
- Familiar messaging UX (WhatsApp/iMessage patterns) but with the app's design language
- Clean, fast, futuristic
- Teal for user bubbles, light gray for seller bubbles
- Both light and dark mode
- iPhone 15 Pro frame (393x852)
```

---

## PROMPT 15: Empty States, Loading States & Error States Collection

```
CONTEXT: A hyperlocal commerce app needs consistent empty states, loading states, and error states across all screens. These are the moments that define perceived quality.

Design a collection of states used across the app.

LOADING / SKELETON STATES:
- Home screen skeleton: address pill shimmer + search bar shimmer + banner placeholder + category circles shimmer + seller card skeletons (3)
- Seller detail skeleton: hero placeholder + info shimmer + product rows shimmer
- Orders list skeleton: order card shimmers (2-3)
- Cart skeleton: seller group shimmer
- All skeletons use a smooth shimmer animation (gradient sweep from left to right)
- Skeleton shapes match actual content shapes exactly

EMPTY STATES (each needs illustration + text + CTA):
1. Empty cart: "Your cart is feeling light" + "Explore nearby shops" CTA
2. No sellers nearby: "No shops in your area yet" + "Try changing your location" CTA + location change button
3. No orders: "You haven't ordered anything yet" + "Start exploring" CTA
4. No favorites: "Save your favorite shops here" + "Browse shops" CTA
5. No search results: "Nothing matches '{query}'" + "Try different keywords" suggestion
6. No messages: "Start a conversation with a shop" + description

ILLUSTRATION STYLE:
- Flat, geometric, modern — not cutesy cartoons
- Use the app's color palette (teal, gray, amber accents)
- Minimal detail — abstract shapes suggesting the concept
- Consistent size and positioning across all empty states
- Consider using animated illustrations (subtle floating/pulsing elements)

ERROR STATES:
1. Network error: "No internet connection" + animated icon (wifi with X) + "Retry" button
2. Server error: "Something went wrong" + "We're working on it. Try again in a moment." + "Retry" button
3. Session expired: "Your session expired" + "Please login again" + "Login" button
4. Location permission denied: "We need your location" + explanation + "Open settings" button
5. Payment error: (covered in payment flow prompt)

TOAST / SNACKBAR NOTIFICATIONS:
- Success toast: green left border + checkmark icon + message + auto-dismiss (3s)
- Error toast: red left border + X icon + message + dismiss button
- Info toast: teal left border + info icon + message
- Warning toast: amber left border + warning icon + message
- All toasts slide in from top with spring animation, auto-dismiss

VISUAL DIRECTION:
- Consistent, systematic, professional
- Empty states should feel encouraging, not sad
- Error states should feel recoverable, not alarming
- Futuristic, clean illustration style
- Teal primary, semantic colors for states
- Both light and dark mode
- Show each state at iPhone 15 Pro width (393px)
```

---

## PROMPT 16: Micro-Interactions & Animation Specs

```
CONTEXT: A hyperlocal commerce app (React Native) needs a comprehensive animation and micro-interaction specification. The app should feel fast, responsive, and premium — like a native iOS app, not a web wrapper.

This is a specification document for developers, not a screen design. I need you to create an interactive animation showcase that demonstrates each animation.

ANIMATION SYSTEM:
- Spring physics as default (not linear or ease-in-out)
- Default spring config: damping 15, stiffness 150, mass 1
- Snappy spring config: damping 20, stiffness 300 (for quick interactions)
- Gentle spring config: damping 20, stiffness 100 (for overlays, sheets)
- Duration guidelines: instant interactions (100-200ms), transitions (250-400ms), dramatic (400-600ms)
- Use React Native Reanimated 3 for all animations

MICRO-INTERACTIONS TO DEFINE:

1. Button press: scale to 0.97 + haptic light
2. Card press: scale to 0.98 + slight brightness change
3. Toggle switch: thumb slides with spring + track color cross-fades
4. Quantity stepper: number bounces on change + button scale press
5. Favorite heart: fill animation (outline → filled with scale overshoot 1.2 → 1.0) + particle burst
6. Add to cart: button morphs from "Add" text to quantity stepper + cart bar bounces in
7. Pull to refresh: custom indicator (logo rotation or progress ring)
8. Tab switch: icon morphs (outline to filled) + label slides in + indicator slides
9. Bottom sheet: drag gesture with velocity-based dismiss + rubber-band overscroll
10. Floating cart bar: slides up from bottom with spring on first item, bounces on update
11. Skeleton shimmer: gradient sweep animation, continuous loop
12. Price counter: digits animate individually (odometer-style roll)
13. Toast notification: slides in from top + progress bar countdown + auto-dismiss slide out
14. Status pill update: cross-fade + subtle flash/highlight
15. Swipe to delete: elastic drag + red reveal + snap to action point
16. Page transition: stack push with shared element where possible
17. Address pill tap: subtle bounce + sheet rises with spring
18. Search results: staggered fade-in (30ms delay per item)
19. Seller card load: stagger up from bottom (50ms delay per card)
20. Order timeline: dots pulse in sequence (current step animated loop)
21. Parallax scroll: hero image moves at 0.5x scroll speed
22. Confetti / success: particle burst from center, 1 second, fades out

For each interaction, show:
- Visual demonstration (animated)
- Spring/timing configuration
- Trigger condition
- Reanimated code snippet concept

VISUAL DIRECTION:
- Interactive showcase page where each animation can be triggered
- Clean, organized, systematic
- Group by category (buttons, navigation, lists, feedback, loading)
- Both light and dark mode considerations
- Reference frame: iPhone 15 Pro
```

---

## Usage Notes

**Order of prompts:** Start with Prompt 0 (Design System) to establish tokens and components. Then do screens in priority order: Home (4) → Seller Detail (6) → Cart (8) → Checkout (9) → Order Detail (12) → Auth (2) → the rest.

**Between prompts:** Reference back to the design system. Say things like "Using the design system we established, now design..." to maintain consistency.

**Iteration:** After each screen, ask for variants: "Show me this screen in dark mode", "Show the loading skeleton state", "Show the error state for this screen."

**Export:** Ask Claude Design to export assets, tokens, and specs in formats your React Native developer needs (color values, spacing values, component hierarchy).
