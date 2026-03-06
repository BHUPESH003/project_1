import { Router, Request, Response } from 'express';

export const apiRoutes = Router();

/**
 * Welcome endpoint
 */
apiRoutes.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Welcome to Express API',
    docs: '/api-docs',
  });
});
