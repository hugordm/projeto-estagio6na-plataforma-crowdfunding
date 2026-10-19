import type { Request, Response } from 'express';
import * as categoryService from '../services/category.service';

export async function list(_req: Request, res: Response) {
  res.json(await categoryService.listCategories());
}
