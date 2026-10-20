import type { Request, Response } from 'express';
import { HttpError } from '../lib/http-error';
import { detectImageType } from '../lib/image-type';
import { saveImage } from '../services/storage.service';

// POST /uploads/campaign-image (multipart, campo "image") -> { url }
export async function uploadCampaignImage(req: Request, res: Response) {
  if (!req.file) throw new HttpError(400, 'Nenhuma imagem enviada. Use o campo "image".');

  // Valida pelo conteúdo: um .exe renomeado para .png é recusado aqui.
  const type = detectImageType(req.file.buffer);
  if (!type) throw new HttpError(400, 'Formato não suportado. Envie uma imagem JPEG, PNG ou WebP.');

  const url = await saveImage(req.file.buffer, type);
  res.status(201).json({ url });
}
