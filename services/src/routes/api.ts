import { Router, Request, Response } from 'express';

export const apiRoutes = Router();

/**
 * @swagger
 * /api:
 *   get:
 *     summary: Welcome endpoint
 *     description: Returns welcome message and available API endpoints
 *     tags: [API]
 *     responses:
 *       200:
 *         description: Welcome response with endpoints information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Welcome to Express API
 *                 version:
 *                   type: string
 *                   example: 1.0.0
 *                 endpoints:
 *                   type: object
 *                   properties:
 *                     health:
 *                       type: string
 *                       example: /health
 *                     api:
 *                       type: string
 *                       example: /api
 */
apiRoutes.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Welcome to Express API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api',
      docs: '/api-docs',
    },
  });
});

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users
 *     description: Retrieve a list of all users in the system
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: List of users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Users endpoint
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
apiRoutes.get('/users', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Users endpoint',
    data: [
      { id: 1, name: 'User 1', email: 'user1@example.com' },
      { id: 2, name: 'User 2', email: 'user2@example.com' },
    ],
  });
});

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create a new user
 *     description: Create a new user with name and email. Both fields are required.
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *             properties:
 *               name:
 *                 type: string
 *                 description: User full name
 *                 example: Jane Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User email address
 *                 example: jane@example.com
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User created successfully
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid input (missing or invalid fields)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
apiRoutes.post('/users', (req: Request, res: Response) => {
  const { name, email } = req.body;

  if (!name || !email) {
    res.status(400).json({
      success: false,
      message: 'Name and email are required',
    });
    return;
  }

  res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: {
      id: 3,
      name,
      email,
    },
  });
});

/**
 * @swagger
 * /api/echo:
 *   post:
 *     summary: Echo test endpoint
 *     description: Echo back the request body for testing purposes
 *     tags: [Test]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             example:
 *               message: "Hello World"
 *     responses:
 *       200:
 *         description: Echo response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Echo response
 *                 receivedData:
 *                   type: object
 *                   description: The data you sent
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
apiRoutes.post('/echo', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Echo response',
    receivedData: req.body,
    timestamp: new Date().toISOString(),
  });
});
