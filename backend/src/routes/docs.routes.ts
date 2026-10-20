import { createHash, timingSafeEqual } from 'node:crypto';
import { Router, type RequestHandler } from 'express';
import swaggerUi from 'swagger-ui-express';
import { openApiDocument } from '../docs/openapi';
import { docsLimiter } from '../middlewares/rate-limit';

// DOCS_ENABLED=false desliga a documentação (UI e JSON), ex.: em produção. Padrão: ligada.
export function docsEnabled(): boolean {
  return process.env.DOCS_ENABLED !== 'false';
}

// DOCS_USER e DOCS_PASSWORD (as duas) protegem /docs e /docs.json com HTTP Basic. Sem elas: aberto.
function docsCredentials(): { user: string; password: string } | null {
  const user = process.env.DOCS_USER;
  const password = process.env.DOCS_PASSWORD;
  return user && password ? { user, password } : null;
}

// Avisos de configuração no log, na inicialização (nunca imprime os valores).
export function warnDocsConfig(): void {
  const hasUser = Boolean(process.env.DOCS_USER);
  const hasPassword = Boolean(process.env.DOCS_PASSWORD);
  if (hasUser !== hasPassword) {
    console.warn('[docs] Defina DOCS_USER e DOCS_PASSWORD juntos; com só um deles, /docs fica sem senha.');
  } else if (!hasUser && process.env.NODE_ENV === 'production') {
    console.warn('[docs] /docs e /docs.json estão públicos em produção. Defina DOCS_USER e DOCS_PASSWORD ou DOCS_ENABLED=false.');
  }
}

// Compara os SHA-256 dos dois lados: tamanho fixo, então timingSafeEqual não vaza o tamanho do segredo.
function safeEqual(a: string, b: string): boolean {
  const hash = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(hash(a), hash(b));
}

// "Authorization: Basic base64(usuario:senha)" -> { user, password }. A senha pode conter ":".
function parseBasic(header: string | undefined): { user: string; password: string } | null {
  const match = header?.match(/^Basic\s+(\S+)$/i);
  if (!match) return null;
  const decoded = Buffer.from(match[1], 'base64').toString('utf8');
  const separator = decoded.indexOf(':');
  if (separator < 0) return null;
  return { user: decoded.slice(0, separator), password: decoded.slice(separator + 1) };
}

function requireDocsAuth(expected: { user: string; password: string }): RequestHandler {
  return (req, res, next) => {
    const given = parseBasic(req.headers.authorization);
    // As duas comparações rodam sempre (sem atalho), para o tempo não indicar qual campo errou.
    const userOk = safeEqual(given?.user ?? '', expected.user);
    const passwordOk = safeEqual(given?.password ?? '', expected.password);
    if (given && userOk && passwordOk) return next();
    res.setHeader('WWW-Authenticate', 'Basic realm="Docs"');
    res.status(401).json({ error: 'Autenticação necessária para acessar a documentação.' });
  };
}

// GET /docs.json: especificação OpenAPI 3. GET /docs: Swagger UI (com o botão "Authorize" para o JWT).
// A API não envia CSP global (só nos SVG de /uploads), então a Swagger UI não precisa de ajuste de CSP.
export const docsRoutes = Router();

// Rate limit e senha valem para /docs.json, /docs e os arquivos da UI (/docs/*).
const DOCS_PATHS = ['/docs.json', '/docs'];
const credentials = docsCredentials();
docsRoutes.use(DOCS_PATHS, docsLimiter);
if (credentials) docsRoutes.use(DOCS_PATHS, requireDocsAuth(credentials));

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
