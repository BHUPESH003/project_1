/**
 * Swagger/OpenAPI Configuration
 */

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Express API',
    version: '1.0.0',
    description: 'A professional Express.js REST API with TypeScript and Swagger documentation',
    contact: {
      name: 'API Support',
      url: 'https://example.com',
      email: 'support@example.com',
    },
    license: {
      name: 'ISC',
      url: 'https://opensource.org/licenses/ISC',
    },
  },
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Development server',
    },
    {
      url: 'https://api.example.com',
      description: 'Production server',
    },
  ],
  components: {
    schemas: {
      User: {
        type: 'object',
        required: ['name', 'email'],
        properties: {
          id: {
            type: 'string',
            description: 'User unique identifier',
            example: 'user_1707899400000_abc123def',
          },
          name: {
            type: 'string',
            description: 'User full name',
            example: 'John Doe',
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'User email address',
            example: 'john@example.com',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'User creation timestamp',
            example: '2024-02-14T10:30:00.000Z',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'User last update timestamp',
            example: '2024-02-14T10:35:00.000Z',
          },
        },
      },
      ApiResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            description: 'Operation status',
            example: true,
          },
          statusCode: {
            type: 'integer',
            description: 'HTTP status code',
            example: 200,
          },
          message: {
            type: 'string',
            description: 'Response message',
            example: 'Operation successful',
          },
          data: {
            type: 'object',
            nullable: true,
            description: 'Response data',
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'Response timestamp',
            example: '2024-02-14T10:30:00.000Z',
          },
        },
      },
      Error: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false,
          },
          statusCode: {
            type: 'integer',
            example: 400,
          },
          message: {
            type: 'string',
            example: 'Error message',
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            example: '2024-02-14T10:30:00.000Z',
          },
        },
      },
      HealthStatus: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          message: {
            type: 'string',
            example: 'Server is healthy',
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
          },
          uptime: {
            type: 'number',
            description: 'Server uptime in seconds',
            example: 145.234,
          },
        },
      },
    },
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT authentication token',
      },
    },
  },
  security: [],
  tags: [
    {
      name: 'Health',
      description: 'Health check endpoints',
    },
    {
      name: 'API',
      description: 'Main API endpoints',
    },
    {
      name: 'Users',
      description: 'User management endpoints',
    },
    {
      name: 'Test',
      description: 'Test/debug endpoints',
    },
  ],
};

export const swaggerOptions = {
  definition: swaggerDefinition,
  apis: ['./src/routes/*.ts', './src/index.ts'],
};

/**
 * Swagger UI Options
 */
export const swaggerUiOptions = {
  swaggerOptions: {
    url: '/api-docs/swagger.json',
    persistAuthorization: true,
  },
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Express API Documentation',
  swaggerUrl: '/api-docs/swagger.json',
};
