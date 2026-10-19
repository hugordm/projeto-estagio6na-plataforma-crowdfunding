// Diagnóstico da IA: mostra os provedores escolhidos, confere as variáveis (sem mostrar valores)
// e faz chamadas pequenas de chat (pelo provedor ativo) e de embeddings (OpenRouter).
// Opções com custo: --image (imagem pelo OpenRouter, ~US$ 0,007) e --cover (capa SVG pela Anthropic,
// ~US$ 0,05 a 0,15; o SVG gerado é salvo só na pasta temporária do sistema para conferência, não em uploads/).
// Uso: npx tsx scripts/check-ai.ts [--image] [--cover]
import 'dotenv/config';
import { AiError } from '../src/lib/ai-types';
import { chat, chatProvider } from '../src/lib/llm';
import { embed, generateImage } from '../src/lib/openrouter';
import { detectImageType } from '../src/lib/image-type';
import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { generateSvgCover } from '../src/services/svg-cover.service';
import { coverProvider } from '../src/services/ai-cover.service';

const vars = [
  'CHAT_PROVIDER',
  'COVER_PROVIDER',
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_CHAT_MODEL',
  'ANTHROPIC_COVER_MODEL',
  'OPENROUTER_API_KEY',
  'OPENROUTER_CHAT_MODEL',
  'OPENROUTER_EMBEDDING_MODEL',
  'OPENROUTER_IMAGE_MODEL',
];
for (const name of vars) console.log(`${name}: ${process.env[name] ? 'definida' : 'ausente'}`);
console.log(`\nProvedor de chat: ${chatProvider()} | provedor de capa: ${coverProvider()}`);

async function step(label: string, run: () => Promise<string>) {
  const start = Date.now();
  try {
    const result = await run();
    console.log(`✔ ${label} (${Date.now() - start} ms): ${result}`);
  } catch (error) {
    const detail = error instanceof AiError ? `[${error.kind}] ${error.message}` : String(error);
    console.log(`✘ ${label}: ${detail}`);
    process.exitCode = 1;
  }
}

await step(`chat (${chatProvider()})`, async () =>
  chat([{ role: 'user', content: 'Responda apenas: ok' }], { maxTokens: 10 }),
);
await step('embeddings (openrouter)', async () => {
  const [vector] = await embed(['teste de embedding']);
  return `${vector.length} dimensões`;
});
if (process.argv.includes('--image')) {
  await step('imagem (openrouter)', async () => {
    const image = await generateImage('Ilustração simples de uma árvore verde, fundo claro, sem texto.');
    return `${image.content.length} bytes, ${image.mediaType}, tipo detectado: ${detectImageType(image.content)?.extension ?? 'desconhecido'}`;
  });
}
if (process.argv.includes('--cover')) {
  await step('capa SVG (anthropic)', async () => {
    const svg = await generateSvgCover({
      title: 'Horta comunitária no bairro',
      description: 'Queremos transformar um terreno vazio em uma horta para as famílias plantarem alimentos.',
      categoryName: 'Meio Ambiente',
    });
    const file = path.join(tmpdir(), 'check-ai-capa.svg');
    await writeFile(file, svg);
    return `${Buffer.byteLength(svg)} bytes, sanitizado, salvo em ${file}`;
  });
}
