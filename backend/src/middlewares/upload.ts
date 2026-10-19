import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { HttpError } from '../lib/http-error';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

// memoryStorage: o arquivo fica num Buffer (no máximo 5 MB) até validarmos o conteúdo;
// só depois ele é gravado pelo storage.service.
// Não filtramos pelo Content-Type nem pela extensão enviados pelo cliente (podem ser forjados
// e variam entre clientes): o tipo é decidido pelos bytes do arquivo, no controller (detectImageType).
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
}).single('image');

// Executa o multer e traduz os erros dele para mensagens em português no formato { error }.
export function singleImageUpload(req: Request, res: Response, next: NextFunction) {
  imageUpload(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'Imagem muito grande. O tamanho máximo é 5 MB.'
          : err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT'
            ? 'Envie um único arquivo no campo "image".'
            : 'Erro ao processar o arquivo enviado.';
      return next(new HttpError(400, message));
    }
    next(err);
  });
}
