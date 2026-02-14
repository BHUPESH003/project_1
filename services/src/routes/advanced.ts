import { Router } from 'express';
import * as userController from '../controllers/userController';

export const advancedRoutes = Router();

/**
 * Advanced API Routes with Controller Pattern
 * Uncomment to use in src/index.ts: app.use('/api/v1', advancedRoutes);
 */

// User routes
advancedRoutes.get('/users', userController.getAllUsers);
advancedRoutes.get('/users/:id', userController.getUserById);
advancedRoutes.post('/users', userController.createUser);
advancedRoutes.put('/users/:id', userController.updateUser);
advancedRoutes.delete('/users/:id', userController.deleteUser);
