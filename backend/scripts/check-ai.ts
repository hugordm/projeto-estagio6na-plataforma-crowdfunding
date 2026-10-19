// Diagnóstico da integração com o OpenRouter: confere as variáveis (sem mostrar valores)
// e faz uma chamada pequena de chat e de embeddings. Com --image, gera também uma imagem (tem custo).
// Uso: npx tsx scripts/check-ai.ts [--image]
import 'dotenv/config';
import { chat, embed, generateImage, OpenRouterError } from '../src/lib/openrouter';
import { detectImageType } from '../src/lib/image-type';

const vars = ['OPENROUTER_API_KEY', 'OPENROUTER_CHAT_MODEL', 'OPENROUTER_EMBEDDING_MODEL', 'OPENROUTER_IMAGE_MODEL'];
for (const name of vars) console.log(`${name}: ${process.env[name] ? 'definida' : 'AUSENTE'}`);

async function step(label: string, run: () => Promise<string>) {
  const start = Date.now();
  try {
    const result = await run();
    console.log(`✔ ${label} (${Date.now() - start} ms): ${result}`);
  } catch (error) {
    const detail = error instanceof OpenRouterError ? `[${error.kind}] ${error.message}` : String(error);
    console.log(`✘ ${label}: ${detail}`);
    process.exitCode = 1;
  }
}

await step('chat', async () => chat([{ role: 'user', content: 'Responda apenas: ok' }], { maxTokens: 10 }));
await step('embeddings', async () => {
  const [vector] = await embed(['teste de embedding']);
  return `${vector.length} dimensões`;
});
if (process.argv.includes('--image')) {
  await step('imagem', async () => {
    const image = await generateImage('Ilustração simples de uma árvore verde, fundo claro, sem texto.');
    return `${image.content.length} bytes, ${image.mediaType}, tipo detectado: ${detectImageType(image.content)?.extension ?? 'desconhecido'}`;
  });
}
