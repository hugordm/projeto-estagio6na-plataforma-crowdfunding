import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

const categories = ['Saúde', 'Educação', 'Tecnologia', 'Arte e Cultura', 'Causas Sociais', 'Meio Ambiente'];

async function main() {
  // upsert torna o seed idempotente: pode rodar várias vezes sem duplicar.
  for (const name of categories) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  }
  console.log(`Seed concluído: ${categories.length} categorias.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
