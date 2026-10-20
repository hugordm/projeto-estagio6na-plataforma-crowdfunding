import type { Request, Response } from 'express';
import { getFeatures } from '../services/features.service';

// GET /config/features -> { aiCover, aiChat, aiWriting } (só booleanos)
export function features(_req: Request, res: Response) {
  res.json(getFeatures());
}
