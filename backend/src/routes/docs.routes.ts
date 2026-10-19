import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { openApiDocument } from '../docs/openapi';

// DOCS_ENABLED=false desliga a documentação (UI e JSON), ex.: em produção. Padrão: ligada.
export function docsEnabled(): boolean {
  return process.env.DOCS_ENABLED !== 'false';
}

// GET /docs.json: especificação OpenAPI 3. GET /docs: Swagger UI (com o botão "Authorize" para o JWT).
// A API não envia CSP global (só nos SVG de /uploads), então a Swagger UI não precisa de ajuste de CSP.
export const docsRoutes = Router();

docsRoutes.get('/docs.json', (_req, res) => {
  res.json(openApiDocument);
});

docsRoutes.use(
  '/docs',
  swaggerUi.serve,
  swaggerUi.setup(openApiDocument, {
    customSiteTitle: 'API Crowdfunding - Documentação',
    swaggerOptions: { persistAuthorization: true, docExpansion: 'list', tagsSorter: 'alpha' },
  }),
);
