// Diagnóstico da IA (Anthropic): mostra os provedores escolhidos, confere as variáveis (sem mostrar
// valores) e faz uma chamada pequena de chat. Opção com custo: --cover (capa SVG, ~US$ 0,05 a 0,15;
// o SVG gerado é salvo só na pasta temporária do sistema para conferência, não em uploads/).
// Uso: npx tsx scripts/check-ai.ts [--cover]
import 'dotenv/config';
import { AiError } from '../src/lib/ai-types';
import { chat, chatProvider } from '../src/lib/llm';
import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { generateSvgCover } from '../src/services/svg-cover.service';
import { coverProvider } from '../src/services/ai-cover.service';
import { getFeatures } from '../src/services/features.service';

const vars = [
  'CHAT_PROVIDER',
  'COVER_PROVIDER',
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_CHAT_MODEL',
  'ANTHROPIC_COVER_MODEL',
];
for (const name of vars) console.log(`${name}: ${process.env[name] ? 'definida' : 'ausente'}`);
console.log(`\nProvedor de chat: ${chatProvider() ?? 'valor não suportado'} | provedor de capa: ${coverProvider() ?? 'valor não suportado'}`);
console.log('Recursos ligados (GET /config/features):', JSON.stringify(getFeatures()));

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

await step('chat (anthropic)', async () =>
  chat([{ role: 'user', content: 'Responda apenas: ok' }], { maxTokens: 10 }),
);
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
