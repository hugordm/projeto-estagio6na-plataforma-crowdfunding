import { Router } from 'express';
import { requireAuth } from '../middlewares/auth';
import { singleImageUpload } from '../middlewares/upload';
import { uploadLimiter } from '../middlewares/rate-limit';
import * as uploadController from '../controllers/upload.controller';

export const uploadRoutes = Router();

// requireAuth vem antes do multer: sem login, o arquivo nem chega a ser lido.
uploadRoutes.post('/campaign-image', requireAuth, uploadLimiter, singleImageUpload, uploadController.uploadCampaignImage);
