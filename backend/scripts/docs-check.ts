// Confere a documentação OpenAPI (npm run docs:check):
// 1) o documento é uma especificação OpenAPI válida (@apidevtools/swagger-parser);
// 2) toda rota registrada no Express (app.ts + routeMounts) aparece na especificação;
// 3) toda operação da especificação existe no Express (exceto os arquivos estáticos de /uploads).
// Não abre o servidor nem chama serviços externos. Sai com código 1 se algo estiver errado.
import SwaggerParser from '@apidevtools/swagger-parser';
import type { Router } from 'express';
import { app, routeMounts } from '../src/app';
import { openApiDocument } from '../src/docs/openapi';

type RouteLayer = { route?: { path: string; methods: Record<string, boolean> } };
const STATIC_PATHS = new Set(['/uploads/{file}']); // servido pelo express.static, não por uma rota
const DOCS_PATHS = new Set(['/docs.json']); // a própria documentação

// "/campaigns" + "/:id/donations" -> "/campaigns/{id}/donations"
function toOpenApiPath(prefix: string, path: string): string {
  const full = `${prefix}${path === '/' ? '' : path}` || '/';
  return full.replace(/:(\w+)/g, '{$1}');
}

function routesOf(router: Pick<Router, 'stack'>, prefix: string): string[] {
  return (router.stack as RouteLayer[]).flatMap((layer) =>
    layer.route
      ? Object.keys(layer.route.methods).map((method) => `${method.toUpperCase()} ${toOpenApiPath(prefix, layer.route!.path)}`)
      : [],
  );
}

async function main() {
  let problems = 0;

  try {
    await SwaggerParser.validate(structuredClone(openApiDocument) as never);
    console.log('✔ Especificação OpenAPI válida');
  } catch (error) {
    problems++;
    console.log(`✘ Especificação inválida: ${error instanceof Error ? error.message : error}`);
  }

  // app.router é o roteador principal do Express 5 (rotas declaradas direto no app, como /health-db).
  const appRouter = (app as unknown as { router: Pick<Router, 'stack'> }).router;
  const registered = new Set(
    [...routesOf(appRouter, ''), ...routeMounts.flatMap(([prefix, router]) => routesOf(router, prefix))].filter(
      (route) => !DOCS_PATHS.has(route.split(' ')[1]),
    ),
  );

  const documented = new Set(
    Object.entries(openApiDocument.paths).flatMap(([path, operations]) =>
      STATIC_PATHS.has(path) ? [] : Object.keys(operations).map((method) => `${method.toUpperCase()} ${path}`),
    ),
  );

  const missing = [...registered].filter((route) => !documented.has(route));
  const extra = [...documented].filter((route) => !registered.has(route));
  for (const route of missing) console.log(`✘ Rota sem documentação: ${route}`);
  for (const route of extra) console.log(`✘ Documentada, mas não existe no Express: ${route}`);
  problems += missing.length + extra.length;

  console.log(`${registered.size} rotas registradas, ${documented.size} operações documentadas (+ ${STATIC_PATHS.size} estática).`);
  if (problems === 0) console.log('✔ Todas as rotas estão documentadas');
  process.exit(problems === 0 ? 0 : 1);
}

main();
