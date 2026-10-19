import 'dotenv/config';
import express, { type Router } from 'express';
import cors from 'cors';
import { prisma } from './lib/prisma';
import { corsOrigins, trustProxySetting } from './lib/http-config';
import { authRoutes } from './routes/auth.routes';
import { categoryRoutes } from './routes/category.routes';
import { campaignRoutes } from './routes/campaign.routes';
import { uploadRoutes } from './routes/upload.routes';
import { chatRoutes } from './routes/chat.routes';
import { meRoutes } from './routes/me.routes';
import { configRoutes } from './routes/config.routes';
import { docsEnabled, docsRoutes } from './routes/docs.routes';
import { UPLOADS_DIR, UPLOADS_ROUTE } from './services/storage.service';
import { errorHandler, notFoundHandler } from './middlewares/error';

// Prefixo de cada grupo de rotas. Também usado por scripts/docs-check.ts para conferir
// se toda rota registrada está na documentação OpenAPI.
export const routeMounts: [string, Router][] = [
  ['/auth', authRoutes],
  ['/categories', categoryRoutes],
  ['/campaigns', campaignRoutes],
  ['/uploads', uploadRoutes],
  ['/chat', chatRoutes],
  ['/me', meRoutes],
  ['/config', configRoutes],
];

export const app = express();

// Atrás de proxy (Render, Docker, Nginx), o IP real do cliente vem no X-Forwarded-For (ver TRUST_PROXY).
app.set('trust proxy', trustProxySetting());
// Só o frontend (FRONTEND_URL) pode chamar a API pelo navegador.
app.use(cors({ origin: corsOrigins() }));
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

for (const [path, router] of routeMounts) app.use(path, router);

// Documentação da API: GET /docs (Swagger UI) e GET /docs.json. Desligue com DOCS_ENABLED=false.
if (docsEnabled()) app.use(docsRoutes);

// Arquivos enviados e capas geradas. nosniff impede o navegador de "adivinhar" outro tipo de conteúdo.
// Para SVG (capas da IA), uma CSP restritiva: mesmo aberto direto no navegador, o arquivo não pode
// rodar scripts, carregar nada externo nem navegar (sandbox). O express.static já envia image/svg+xml.
app.use(
  UPLOADS_ROUTE,
  express.static(UPLOADS_DIR, {
    index: false,
    setHeaders: (res, filePath) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      if (filePath.endsWith('.svg')) {
        res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
      }
    },
  }),
);

// Precisam ficar depois de todas as rotas.
app.use(notFoundHandler);
app.use(errorHandler);
