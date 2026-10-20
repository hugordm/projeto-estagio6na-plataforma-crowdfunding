// Dados de DEMONSTRAÇÃO (opcional): 2 usuários, 5 campanhas fictícias e algumas doações.
// Idempotente: rodar de novo atualiza os mesmos registros (prazos voltam a ficar no futuro) sem duplicar.
// Uso: npm run seed:demo          -> cria/atualiza
//      npm run seed:demo:clean    -> apaga só o que este script cria (usuários @example.com abaixo)
// Requer as categorias do seed principal (npx prisma db seed).
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma';
import { addCalendarDays, endOfDeadlineDay, todayInSaoPaulo } from '../src/lib/dates';
import { BCRYPT_COST } from '../src/services/auth.service';

// Senha conhecida, documentada no README. Só para demonstração local.
const DEMO_PASSWORD = 'demo1234';

const USERS = [
  { name: 'Ana Demonstração', email: 'ana.demo@example.com' },
  { name: 'Bruno Demonstração', email: 'bruno.demo@example.com' },
];

const PREFIX = '[Demo]'; // deixa claro na tela que a campanha é fictícia

type DemoCampaign = {
  owner: number; // índice em USERS
  title: string;
  description: string;
  category: string;
  goal: string;
  days: number; // prazo: hoje + N dias
  donations: { amount: string; message?: string }[]; // feitas pelo OUTRO usuário (dono não doa para si)
};

const CAMPAIGNS: DemoCampaign[] = [
  {
    owner: 0,
    title: 'Horta comunitária na praça fictícia',
    description:
      'Campanha fictícia criada para demonstração. A ideia é transformar um canteiro abandonado de uma praça imaginária em uma horta comunitária, com canteiros elevados, composteira e oficinas abertas aos vizinhos aos sábados.',
    category: 'Meio Ambiente',
    goal: '3500.00',
    days: 45,
    donations: [{ amount: '150.00', message: 'Doação de exemplo. Boa sorte com a horta!' }, { amount: '80.00' }],
  },
  {
    owner: 0,
    title: 'Laboratório de informática para escola imaginária',
    description:
      'Campanha fictícia criada para demonstração. Uma escola inventada para este exemplo quer montar uma sala com 10 computadores usados e reformados para aulas de programação no contraturno.',
    category: 'Educação',
    goal: '12000.00',
    days: 60,
    donations: [{ amount: '500.00', message: 'Doação de exemplo para testar a plataforma.' }],
  },
  {
    owner: 1,
    title: 'Sarau de música no centro cultural de exemplo',
    description:
      'Campanha fictícia criada para demonstração. O objetivo é bancar som, cadeiras e lanche para uma série de quatro saraus gratuitos com artistas locais em um centro cultural imaginário.',
    category: 'Arte e Cultura',
    goal: '2000.00',
    days: 30,
    donations: [{ amount: '200.00', message: 'Exemplo: adoro saraus!' }, { amount: '50.00' }, { amount: '120.00' }],
  },
  {
    owner: 1,
    title: 'Cadeira de rodas para personagem fictício',
    description:
      'Campanha fictícia criada para demonstração. Arrecadação de exemplo para a compra de uma cadeira de rodas motorizada para um morador imaginário, com manutenção pelo primeiro ano.',
    category: 'Saúde',
    goal: '9000.00',
    days: 75,
    donations: [],
  },
  {
    owner: 0,
    title: 'Aplicativo de caronas solidárias (protótipo de exemplo)',
    description:
      'Campanha fictícia criada para demonstração. Um grupo inventado de estudantes quer custear servidor e testes de um protótipo de aplicativo que conecta vizinhos para caronas até postos de saúde.',
    category: 'Tecnologia',
    goal: '6000.00',
    days: 90,
    donations: [{ amount: '300.00', message: 'Doação de exemplo.' }],
  },
];

const demoEmails = USERS.map((u) => u.email);

// Prazo = hoje + N dias em America/Sao_Paulo, gravado como o fim desse dia (mesma regra da API).
function daysFromNow(days: number): Date {
  return endOfDeadlineDay(addCalendarDays(todayInSaoPaulo(), days));
}

async function seed() {
  const categories = await prisma.category.findMany();
  const categoryId = (name: string) => {
    const found = categories.find((c) => c.name === name);
    if (!found) throw new Error(`Categoria "${name}" não encontrada. Rode antes: npx prisma db seed`);
    return found.id;
  };

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_COST);
  const users = [];
  for (const user of USERS) {
    users.push(
      await prisma.user.upsert({
        where: { email: user.email },
        update: { name: user.name, passwordHash },
        create: { ...user, passwordHash },
      }),
    );
  }

  const campaignIds: number[] = [];
  for (const demo of CAMPAIGNS) {
    const owner = users[demo.owner];
    const donor = users[1 - demo.owner];
    const title = `${PREFIX} ${demo.title}`;
    const data = {
      title,
      description: demo.description,
      goalAmount: demo.goal,
      deadline: daysFromNow(demo.days),
      status: 'ACTIVE' as const,
      categoryId: categoryId(demo.category),
      ownerId: owner.id,
    };

    // Mesmo dono + mesmo título = mesma campanha (é o que torna o script idempotente).
    const existing = await prisma.campaign.findFirst({ where: { ownerId: owner.id, title } });
    const campaign = existing
      ? await prisma.campaign.update({ where: { id: existing.id }, data })
      : await prisma.campaign.create({ data });
    campaignIds.push(campaign.id);

    // Refaz as doações de exemplo (só as feitas por usuários de demonstração).
    await prisma.$transaction([
      prisma.donation.deleteMany({ where: { campaignId: campaign.id, donor: { email: { in: demoEmails } } } }),
      prisma.donation.createMany({
        data: demo.donations.map((d) => ({ ...d, campaignId: campaign.id, donorId: donor.id })),
      }),
    ]);
  }

  console.log(`Demonstração pronta: ${users.length} usuários e ${campaignIds.length} campanhas.`);
  console.log(`Login: ${demoEmails.join(' ou ')} | senha: ${DEMO_PASSWORD}`);

}

// Apaga os usuários de demonstração, as campanhas deles (com todas as doações recebidas, sem as quais
// a campanha não pode ser apagada) e as doações que eles fizeram. Tokens e gerações de IA saem em cascata.
async function clean() {
  const users = await prisma.user.findMany({ where: { email: { in: demoEmails } }, select: { id: true } });
  const userIds = users.map((u) => u.id);
  if (userIds.length === 0) {
    console.log('Nada a apagar: usuários de demonstração não encontrados.');
    return;
  }

  const [donations, campaigns, deletedUsers] = await prisma.$transaction([
    prisma.donation.deleteMany({ where: { OR: [{ donorId: { in: userIds } }, { campaign: { ownerId: { in: userIds } } }] } }),
    prisma.campaign.deleteMany({ where: { ownerId: { in: userIds } } }),
    prisma.user.deleteMany({ where: { id: { in: userIds } } }),
  ]);
  console.log(`Removidos: ${deletedUsers.count} usuários, ${campaigns.count} campanhas e ${donations.count} doações de demonstração.`);
}

const run = process.argv.includes('--clean') ? clean : seed;

run()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
