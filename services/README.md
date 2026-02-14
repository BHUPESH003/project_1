# Express.js REST API

A professional, production-ready Express.js server with TypeScript, middleware setup, Swagger documentation, and best practices.

## 📁 Folder Structure

```
express-api/
├── src/
│   ├── index.ts              # Main server entry point
│   ├── config/               # Configuration files
│   │   └── swagger.ts        # Swagger/OpenAPI configuration
│   ├── middleware/           # Express middleware
│   │   ├── errorHandler.ts   # Global error handler
│   │   └── requestLogger.ts  # Request logging
│   ├── routes/               # API routes
│   │   ├── health.ts         # Health check endpoints
│   │   └── api.ts            # Main API endpoints
│   ├── controllers/          # (Optional) Controller logic
│   ├── services/             # (Optional) Business logic
│   └── utils/                # (Optional) Utility functions
├── dist/                     # Compiled JavaScript
├── .env.example              # Environment variable template
├── .gitignore                # Git ignore file
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
└── README.md                 # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation

```bash
# Navigate to project
cd services/express-api

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
```

### Development

```bash
# Start development server with hot reload
npm run dev:watch

# Or with basic dev mode
npm run dev
```

Server will start on `http://localhost:3001`

## 📚 API Documentation

### Swagger/OpenAPI Docs
Interactive API documentation is available at:

```
http://localhost:3001/api-docs
```

Features:
- ✅ Interactive endpoint testing ("Try it out")
- ✅ Full request/response schemas
- ✅ Error codes and descriptions
- ✅ Auto-generated from JSDoc comments

### OpenAPI Specification (JSON)
```
http://localhost:3001/api-docs/swagger.json
```

For detailed Swagger documentation, see [SWAGGER_GUIDE.md](./SWAGGER_GUIDE.md)

### Production

```bash
# Build TypeScript
npm run build

# Start production server
npm start
```

## 🔌 API Endpoints

### Health Check
```
GET /health
GET /health/detailed
```

### API Routes
```
GET  /api              # Welcome message
GET  /api/users        # Get users (example)
POST /api/users        # Create user (example)
POST /api/echo         # Echo endpoint (test)
```

## 📝 Environment Variables

Create `.env` file from `.env.example`:

```env
PORT=3001
NODE_ENV=development
APP_NAME=ExpressAPI
CORS_ORIGIN=*
```

## 🛠️ Scripts

- `npm run dev` - Start development server
- `npm run dev:watch` - Start with TypeScript watch mode
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run compiled server
- `npm run watch` - Watch TypeScript changes

## 📦 Dependencies

### Core
- **express** - Web framework
- **cors** - CORS middleware
- **helmet** - Security middleware
- **morgan** - HTTP request logger
- **dotenv** - Environment variables

### Documentation
- **swagger-ui-express** - Serves Swagger UI
- **swagger-jsdoc** - Generates OpenAPI spec from JSDoc comments

### Dev
- **typescript** - TypeScript support
- **ts-node** - Run TypeScript directly
- **nodemon** - Auto-reload on changes
- **@types/express** - TypeScript types for Express
- **@types/node** - TypeScript types for Node.js
- **@types/swagger-ui-express** - TypeScript types for Swagger UI
- **@types/swagger-jsdoc** - TypeScript types for Swagger JSDoc

## 🔒 Security Features

✅ Helmet - Sets various HTTP headers  
✅ CORS - Configurable cross-origin requests  
✅ Input validation - Body size limits  
✅ Error handling - Centralized error management  
✅ Environment variables - Sensitive config isolation  

## 📊 Middleware Stack

1. **Swagger UI** - Interactive API documentation
2. **Helmet** - Security headers
3. **CORS** - Cross-origin handling
4. **Body Parser** - JSON/URL parsing
5. **Morgan** - HTTP logging
6. **Request Logger** - Custom request tracking
7. **Routes** - API endpoints
8. **Error Handler** - Global error handling

## 🧩 Extending the API

### Add New Route

Create `src/routes/users.ts`:
```typescript
import { Router, Request, Response } from 'express';

export const userRoutes = Router();

userRoutes.get('/', (req: Request, res: Response) => {
  res.json({ users: [] });
});
```

Import in `src/index.ts`:
```typescript
import { userRoutes } from './routes/users';
app.use('/api/users', userRoutes);
```

### Add Controller

Create `src/controllers/userController.ts`:
```typescript
import { Request, Response } from 'express';

export const getUsers = (req: Request, res: Response) => {
  res.json({ users: [] });
};
```

## 🐛 Debugging

Enable debug logs:
```bash
DEBUG=express:* npm run dev
```

## 📝 Notes

- All routes are TypeScript
- Centralized error handling with custom `AppError` class
- Graceful shutdown handling (SIGTERM, SIGINT)
- Production-ready structure
- Easy to extend with controllers, services, and utilities

## 📄 License

ISC
