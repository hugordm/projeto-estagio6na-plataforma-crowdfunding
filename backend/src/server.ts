import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { prisma } from './lib/prisma';
import { authRoutes } from './routes/auth.routes';
import { categoryRoutes } from './routes/category.routes';
import { campaignRoutes } from './routes/campaign.routes';
import { uploadRoutes } from './routes/upload.routes';
import { chatRoutes } from './routes/chat.routes';
import { UPLOADS_DIR, UPLOADS_ROUTE } from './services/storage.service';
import { errorHandler, notFoundHandler } from './middlewares/error';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'API de Crowdfunding no ar' });
});

app.get('/health-db', async (req, res) => {
  try {
    const users = await prisma.user.count();
    res.json({ status: 'ok', database: 'conectado', users });
  } catch (error) {
    console.error('Erro ao consultar o banco:', error);
    res.status(500).json({ status: 'erro', database: 'falha na consulta' });
  }
});

app.use('/auth', authRoutes);
app.use('/categories', categoryRoutes);
app.use('/campaigns', campaignRoutes);
app.use('/uploads', uploadRoutes);
app.use('/chat', chatRoutes);

// Arquivos enviados (imagens de capa). nosniff impede o navegador de "adivinhar" outro tipo de conteúdo.
app.use(
  UPLOADS_ROUTE,
  express.static(UPLOADS_DIR, {
    index: false,
    setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
  }),
);

// Precisam ficar depois de todas as rotas.
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
