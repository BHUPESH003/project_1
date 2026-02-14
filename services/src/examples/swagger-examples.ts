/**
 * Swagger Documentation Examples
 * Copy these examples to document your own endpoints
 */

// ============================================
// EXAMPLE 1: Simple GET Endpoint
// ============================================

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products
 *     description: Retrieve a list of all products in the system
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number for pagination
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *         example: 10
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       price:
 *                         type: number
 *       500:
 *         description: Server error
 */

// ============================================
// EXAMPLE 2: POST Endpoint with Request Body
// ============================================

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a new product
 *     description: Create a new product in the system
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *             properties:
 *               name:
 *                 type: string
 *                 description: Product name
 *                 example: iPhone 15
 *               price:
 *                 type: number
 *                 description: Product price in rupees
 *                 example: 79999
 *               description:
 *                 type: string
 *                 description: Product description
 *                 example: Latest iPhone model
 *     responses:
 *       201:
 *         description: Product created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: prod_1707899400000
 *                     name:
 *                       type: string
 *                       example: iPhone 15
 *                     price:
 *                       type: number
 *                       example: 79999
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */

// ============================================
// EXAMPLE 3: GET Endpoint with Path Parameter
// ============================================

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get product by ID
 *     description: Retrieve a specific product using its ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *         example: prod_1707899400000
 *     responses:
 *       200:
 *         description: Product found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     price:
 *                       type: number
 *       404:
 *         description: Product not found
 *       500:
 *         description: Server error
 */

// ============================================
// EXAMPLE 4: PUT Endpoint (Update)
// ============================================

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Update a product
 *     description: Update product information
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Product updated successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Product not found
 *       500:
 *         description: Server error
 */

// ============================================
// EXAMPLE 5: DELETE Endpoint
// ============================================

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Delete a product
 *     description: Delete a product from the system
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *       404:
 *         description: Product not found
 *       500:
 *         description: Server error
 */

// ============================================
// EXAMPLE 6: Endpoint with Bearer Token Auth
// ============================================

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: Get admin dashboard
 *     description: Get admin dashboard data (requires authentication)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data retrieved
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       500:
 *         description: Server error
 */

// ============================================
// EXAMPLE 7: Complex Request Body with Array
// ============================================

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create an order
 *     description: Create a new order with multiple items
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *               - customerId
 *             properties:
 *               customerId:
 *                 type: string
 *                 example: cust_1707899400000
 *               items:
 *                 type: array
 *                 description: Order items
 *                 items:
 *                   type: object
 *                   required:
 *                     - productId
 *                     - quantity
 *                   properties:
 *                     productId:
 *                       type: string
 *                       example: prod_1
 *                     quantity:
 *                       type: integer
 *                       example: 2
 *                     price:
 *                       type: number
 *                       example: 99.99
 *               shippingAddress:
 *                 type: object
 *                 properties:
 *                   street:
 *                     type: string
 *                   city:
 *                     type: string
 *                   zipCode:
 *                     type: string
 *     responses:
 *       201:
 *         description: Order created successfully
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */

// ============================================
// EXAMPLE 8: Endpoint with Multiple Response Types
// ============================================

/**
 * @swagger
 * /api/search:
 *   get:
 *     summary: Search products
 *     description: Search for products by query
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *         example: laptop
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                     results:
 *                       type: array
 *                 - type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                     message:
 *                       type: string
 *       400:
 *         description: Missing search query
 *       500:
 *         description: Server error
 */

// ============================================
// EXAMPLE 9: Endpoint with Filtering & Pagination
// ============================================

/**
 * @swagger
 * /api/products/filtered:
 *   get:
 *     summary: Get filtered products
 *     description: Get products with filtering and pagination
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Product category filter
 *         example: electronics
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price filter
 *         example: 1000
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price filter
 *         example: 50000
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *         example: 20
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [price_asc, price_desc, name_asc, name_desc]
 *         description: Sort order
 *         example: price_asc
 *     responses:
 *       200:
 *         description: Filtered products retrieved
 *       400:
 *         description: Invalid parameters
 *       500:
 *         description: Server error
 */

// ============================================
// EXAMPLE 10: Reusable Component Schema
// ============================================

/**
 * Add this to src/config/swagger.ts in components.schemas:
 */

/*
Product: {
  type: 'object',
  required: ['name', 'price'],
  properties: {
    id: {
      type: 'string',
      example: 'prod_1707899400000',
    },
    name: {
      type: 'string',
      example: 'iPhone 15',
    },
    price: {
      type: 'number',
      example: 79999,
    },
    description: {
      type: 'string',
      example: 'Latest iPhone model',
    },
    category: {
      type: 'string',
      example: 'electronics',
    },
    inStock: {
      type: 'boolean',
      example: true,
    },
    createdAt: {
      type: 'string',
      format: 'date-time',
    },
    updatedAt: {
      type: 'string',
      format: 'date-time',
    },
  },
}
*/

// ============================================
// USAGE EXAMPLES
// ============================================

/*
COPY & CUSTOMIZE:
1. Copy the example that matches your use case
2. Replace placeholders with your actual data
3. Paste before your route handler
4. Add to src/routes/ file
5. Rebuild: npm run build
6. Check Swagger UI: http://localhost:3001/api-docs

COMMON PATTERNS:
- Change /api/products to your endpoint
- Change [Products] tag to your category
- Update request/response schemas to match your data
- Update status codes and descriptions
- Add bearerAuth for protected endpoints
*/

export const swaggerExamples = {
  note: 'See this file for Swagger documentation examples',
};
