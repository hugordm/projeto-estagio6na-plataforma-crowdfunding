import type { JsonSchema } from './zod-schema';

// Modelos de resposta da API (escritos à mão: as respostas vêm do Prisma, não de schemas zod).
// Convenções: erros { error }, listas { data, meta }, dinheiro sempre string com 2 casas.

const money = (example: string, description: string): JsonSchema => ({
  type: 'string',
  pattern: '^\\d+\\.\\d{2}$',
  description: `${description} Valor monetário como texto com 2 casas decimais.`,
  example,
});

const dateTime = (example: string): JsonSchema => ({ type: 'string', format: 'date-time', example });

export const schemas: Record<string, JsonSchema> = {
  Error: {
    type: 'object',
    required: ['error'],
    properties: { error: { type: 'string', description: 'Mensagem em português.', example: 'Campanha não encontrada' } },
  },
  Message: {
    type: 'object',
    required: ['message'],
    properties: { message: { type: 'string', example: 'Senha redefinida com sucesso. Faça login com a nova senha.' } },
  },
  PaginationMeta: {
    type: 'object',
    required: ['page', 'limit', 'total', 'totalPages'],
    properties: {
      page: { type: 'integer', example: 1 },
      limit: { type: 'integer', example: 10 },
      total: { type: 'integer', example: 23 },
      totalPages: { type: 'integer', example: 3 },
    },
  },
  User: {
    type: 'object',
    required: ['id', 'name', 'email', 'createdAt'],
    properties: {
      id: { type: 'integer', example: 7 },
      name: { type: 'string', example: 'Ana Souza' },
      email: { type: 'string', format: 'email', example: 'ana@example.com' },
      createdAt: dateTime('2026-10-19T12:00:00.000Z'),
    },
  },
  AuthResponse: {
    type: 'object',
    required: ['user', 'token'],
    properties: {
      user: { $ref: '#/components/schemas/User' },
      token: { type: 'string', description: 'JWT válido por 7 dias. Envie em Authorization: Bearer <token>.', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
    },
  },
  Category: {
    type: 'object',
    required: ['id', 'name'],
    properties: { id: { type: 'integer', example: 2 }, name: { type: 'string', example: 'Educação' } },
  },
  Campaign: {
    type: 'object',
    required: ['id', 'title', 'description', 'goalAmount', 'raisedAmount', 'progress', 'donorsCount', 'deadline', 'daysLeft', 'expired', 'status', 'category', 'owner'],
    properties: {
      id: { type: 'integer', example: 12 },
      title: { type: 'string', example: 'Biblioteca comunitária do bairro' },
      description: { type: 'string', example: 'Montar uma biblioteca na sala da associação de moradores, com livros doados e um espaço de leitura.' },
      goalAmount: money('3000.00', 'Meta.'),
      raisedAmount: money('450.00', 'Soma das doações.'),
      progress: { type: 'number', description: 'Percentual da meta (2 casas; pode passar de 100).', example: 15 },
      donorsCount: { type: 'integer', description: 'Doadores distintos.', example: 4 },
      imageUrl: { type: 'string', format: 'uri', nullable: true, example: 'http://localhost:3001/uploads/9b2f6c1e-1d2a-4c55-9e1f-0a7b3c2d4e5f.png' },
      imageGeneratedByAi: { type: 'boolean', description: 'true quando a capa foi gerada pela IA deste servidor.', example: false },
      deadline: { ...dateTime('2026-12-20T02:59:59.999Z'), description: 'Fim do dia do prazo em America/Sao_Paulo (23:59:59.999 de 19/12/2026 em Brasília). Doações são aceitas até este instante.' },
      daysLeft: {
        type: 'integer',
        description: 'Dias de calendário de hoje até o prazo, em America/Sao_Paulo (prazo hoje = 0, "Último dia"). Nunca negativo: prazo passado também é 0, com expired = true.',
        example: 30,
      },
      expired: { type: 'boolean', description: 'true quando o dia do prazo já terminou em America/Sao_Paulo (não aceita mais doações).', example: false },
      status: { type: 'string', enum: ['ACTIVE', 'FINISHED'], example: 'ACTIVE' },
      ownerId: { type: 'integer', example: 7 },
      categoryId: { type: 'integer', example: 2 },
      owner: { type: 'object', properties: { id: { type: 'integer', example: 7 }, name: { type: 'string', example: 'Ana Souza' } } },
      category: { $ref: '#/components/schemas/Category' },
      createdAt: dateTime('2026-10-19T12:00:00.000Z'),
      updatedAt: dateTime('2026-10-19T12:00:00.000Z'),
    },
  },
  // Mesmo formato de Campaign (daysLeft e expired vêm em todas as respostas de campanha).
  CampaignDetail: { allOf: [{ $ref: '#/components/schemas/Campaign' }] },
  CampaignPage: {
    type: 'object',
    required: ['data', 'meta'],
    properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Campaign' } }, meta: { $ref: '#/components/schemas/PaginationMeta' } },
  },
  MyCampaignPage: {
    type: 'object',
    required: ['data', 'meta'],
    properties: { data: { type: 'array', items: { $ref: '#/components/schemas/CampaignDetail' } }, meta: { $ref: '#/components/schemas/PaginationMeta' } },
  },
  CampaignSearchResult: {
    type: 'object',
    required: ['data', 'meta', 'mode'],
    properties: {
      data: {
        type: 'array',
        items: {
          allOf: [
            { $ref: '#/components/schemas/Campaign' },
            { type: 'object', properties: { similarity: { type: 'number', description: 'Só na busca semântica (0 a 1).', example: 0.52 } } },
          ],
        },
      },
      meta: { $ref: '#/components/schemas/PaginationMeta' },
      mode: { type: 'string', enum: ['semantic', 'text'], description: '"text" quando a busca semântica não está disponível.', example: 'text' },
      notice: { type: 'string', example: 'A busca inteligente está indisponível no momento. Mostrando resultados da busca por texto.' },
    },
  },
  Donation: {
    type: 'object',
    properties: {
      id: { type: 'integer', example: 31 },
      amount: money('150.50', 'Valor doado.'),
      message: { type: 'string', nullable: true, example: 'Boa sorte com a biblioteca!' },
      donorId: { type: 'integer', example: 9 },
      campaignId: { type: 'integer', example: 12 },
      createdAt: dateTime('2026-10-20T15:30:00.000Z'),
    },
  },
  DonationPage: {
    type: 'object',
    required: ['data', 'meta'],
    properties: {
      data: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 31 },
            amount: money('150.50', 'Valor doado.'),
            message: { type: 'string', nullable: true, example: 'Boa sorte!' },
            donorName: { type: 'string', example: 'Bruno Lima' },
            createdAt: dateTime('2026-10-20T15:30:00.000Z'),
          },
        },
      },
      meta: { $ref: '#/components/schemas/PaginationMeta' },
    },
  },
  MyDonationPage: {
    type: 'object',
    required: ['data', 'meta'],
    properties: {
      data: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 31 },
            amount: money('150.50', 'Valor doado.'),
            message: { type: 'string', nullable: true, example: 'Boa sorte!' },
            createdAt: dateTime('2026-10-20T15:30:00.000Z'),
            campaign: {
              type: 'object',
              properties: {
                id: { type: 'integer', example: 12 },
                title: { type: 'string', example: 'Biblioteca comunitária do bairro' },
                status: { type: 'string', enum: ['ACTIVE', 'FINISHED'] },
              },
            },
          },
        },
      },
      meta: { $ref: '#/components/schemas/PaginationMeta' },
    },
  },
  Url: {
    type: 'object',
    required: ['url'],
    properties: { url: { type: 'string', format: 'uri', example: 'http://localhost:3001/uploads/0e23a47f-a42c-448a-a294-f22335981274.svg' } },
  },
  Features: {
    type: 'object',
    required: ['semanticSearch', 'aiCover', 'aiChat', 'aiWriting'],
    properties: {
      semanticSearch: { type: 'boolean', description: '"Busca inteligente" (embeddings).', example: false },
      aiCover: { type: 'boolean', description: 'Capa gerada por IA.', example: true },
      aiChat: { type: 'boolean', description: 'Chatbot de suporte.', example: true },
      aiWriting: { type: 'boolean', description: '"Melhorar descrição com IA" e "Sugerir categoria".', example: true },
    },
  },
};

export const securitySchemes = {
  bearerAuth: {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description: 'Token devolvido por POST /auth/login ou /auth/register (válido por 7 dias). Clique em "Authorize" e cole só o token.',
  },
};

// Respostas de erro reaproveitadas (sempre { error }).
const errorResponse = (description: string, example: string) => ({
  description,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' }, example: { error: example } } },
});

export const responses = {
  BadRequest: errorResponse('Dados inválidos (validação).', 'Título deve ter pelo menos 3 caracteres'),
  Unauthorized: errorResponse('Sem token, token inválido ou expirado.', 'Token inválido ou expirado'),
  Forbidden: errorResponse('Sem permissão (ex.: não é o dono).', 'Você não tem permissão para alterar esta campanha'),
  NotFound: errorResponse('Recurso não encontrado.', 'Campanha não encontrada'),
  Conflict: errorResponse('Conflito com o estado atual.', 'E-mail já cadastrado'),
  TooManyRequests: errorResponse('Limite de requisições atingido (rate limit).', 'Muitas mensagens em pouco tempo. Aguarde um minuto e tente novamente.'),
  AiUnavailable: errorResponse('Recurso de IA não configurado ou indisponível.', 'A IA está indisponível no momento. Tente novamente em instantes.'),
  AiRejected: errorResponse('A IA recusou o pedido ou não sugeriu nada válido.', 'A IA não conseguiu atender a este pedido. Ajuste o texto e tente de novo.'),
  AiBadResponse: errorResponse('A IA não deu uma resposta válida.', 'A IA não deu uma resposta válida desta vez. Tente novamente.'),
  ServerError: errorResponse('Erro interno.', 'Erro interno do servidor'),
};
