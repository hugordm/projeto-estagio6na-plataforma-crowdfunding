import { Router } from 'express';
import * as categoryController from '../controllers/category.controller';

export const categoryRoutes = Router();

categoryRoutes.get('/', categoryController.list);
