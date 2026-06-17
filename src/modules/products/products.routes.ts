import { Router } from 'express';
import { asyncHandler } from '../../core/async-handler';
import { getProducts } from './products.controller';

export const productsRouter = Router();

productsRouter.get('/', asyncHandler(getProducts));
