import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from '../controllers/auth.controller';
import { campaignSchema, listQuerySchema, searchQuerySchema, updateCampaignSchema } from '../controllers/campaign.controller';
import { donationSchema } from '../controllers/donation.controller';
import { aiCoverSchema } from '../controllers/ai-cover.controller';
import { categoryInputSchema, descriptionInputSchema } from '../controllers/ai-writing.controller';
import { chatSchema } from '../controllers/chat.controller';
import { paginationSchema } from '../lib/pagination';
import { responses, schemas, securitySchemes } from './components';
import { zodBody, zodQueryParameters, type JsonSchema } from './zod-schema';

// Especificação OpenAPI 3.0 da API, servida em GET /docs.json e exibida em GET /docs.
// Corpos e parâmetros vêm dos schemas zod dos controllers (zodBody/zodQueryParameters);
// respostas e exemplos estão em components.ts. scripts/docs-check.ts confere que toda rota
// registrada no Express aparece aqui e que o documento é uma spec válida.

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const errors = (...names: (keyof typeof responses)[]) =>
  Object.fromEntries(
    names.map((name) => [
      { BadRequest: '400', Unauthorized: '401', Forbidden: '403', NotFound: '404', Conflict: '409', TooManyRequests: '429', AiUnavailable: '503', AiRejected: '422', AiBadResponse: '502', ServerError: '500' }[name],
      { $ref: `#/components/responses/${name}` },
    ]),
  );
const ok = (description: string, schema: JsonSchema, example?: unknown) => ({
  description,
  content: { 'application/json': example === undefined ? { schema } : { schema, example } },
});
const jsonBody = (schema: JsonSchema) => ({ required: true, content: { 'application/json': { schema } } });
const bearer = [{ bearerAuth: [] }];
const idParam = { name: 'id', in: 'path', required: true, description: 'Id da campanha.', schema: { type: 'integer', minimum: 1, example: 12 } };
const pageParams = zodQueryParameters(paginationSchema, { page: 'Página (começa em 1).', limit: 'Itens por página (máximo 50).' });
const moneyInput = 'Valor em reais: número ou texto com até 2 casas decimais (ex.: "1500.00"). Na resposta, sempre texto com 2 casas.';

const paths = {
  // ---------- Status ----------
  '/': {
    get: {
      tags: ['Status'],
      summary: 'Status da API',
      responses: { '200': ok('API no ar.', { type: 'object', properties: { message: { type: 'string' } } }, { message: 'API de Crowdfunding no ar' }) },
    },
  },
  '/health-db': {
    get: {
      tags: ['Status'],
      summary: 'Testa a conexão com o banco',
      responses: {
        '200': ok('Banco conectado.', { type: 'object' }, { status: 'ok', database: 'conectado', users: 12 }),
        '500': ok('Falha na consulta.', { type: 'object' }, { status: 'erro', database: 'falha na consulta' }),
      },
    },
  },

  // ---------- Autenticação ----------
  '/auth/register': {
    post: {
      tags: ['Autenticação'],
      summary: 'Cria uma conta',
      description: 'Senha de 8 a 72 caracteres. Devolve o usuário e um token JWT (já fica logado).',
      requestBody: jsonBody(zodBody(registerSchema, { example: { name: 'Ana Souza', email: 'ana@example.com', password: 'senhaForte123' } })),
      responses: { '201': ok('Conta criada.', ref('AuthResponse')), ...errors('BadRequest', 'Conflict') },
    },
  },
  '/auth/login': {
    post: {
      tags: ['Autenticação'],
      summary: 'Entra com e-mail e senha',
      description: 'Mesma mensagem para e-mail inexistente e senha errada.',
      requestBody: jsonBody(zodBody(loginSchema, { example: { email: 'ana@example.com', password: 'senhaForte123' } })),
      responses: {
        '200': ok('Login feito.', ref('AuthResponse')),
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': ok('Credenciais inválidas.', ref('Error'), { error: 'E-mail ou senha inválidos' }),
      },
    },
  },
  '/auth/forgot-password': {
    post: {
      tags: ['Autenticação'],
      summary: 'Pede o link de redefinição de senha',
      description: 'Resposta sempre igual (não revela se o e-mail existe). O link vale 30 minutos e é de uso único. Rate limit: 10 a cada 15 min por IP e 3 por hora por e-mail.',
      requestBody: jsonBody(zodBody(forgotPasswordSchema, { example: { email: 'ana@example.com' } })),
      responses: {
        '200': ok('Pedido recebido.', ref('Message'), { message: 'Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.' }),
        ...errors('BadRequest', 'TooManyRequests'),
      },
    },
  },
  '/auth/reset-password': {
    post: {
      tags: ['Autenticação'],
      summary: 'Define a nova senha com o token do link',
      description: 'Invalida todas as sessões abertas (tokens JWT anteriores).',
      requestBody: jsonBody(zodBody(resetPasswordSchema, { example: { token: 'token-recebido-no-link-do-email', password: 'novaSenha123' } })),
      responses: {
        '200': ok('Senha redefinida.', ref('Message')),
        '400': ok('Token inválido, expirado ou já usado, ou senha fora das regras.', ref('Error'), { error: 'Link de redefinição inválido ou expirado. Solicite um novo.' }),
        '429': { $ref: '#/components/responses/TooManyRequests' },
      },
    },
  },

  // ---------- Configuração ----------
  '/config/features': {
    get: {
      tags: ['Configuração'],
      summary: 'Recursos de IA ligados no servidor',
      description: 'Só booleanos (nenhum valor de configuração). O frontend esconde o que estiver desligado.',
      responses: { '200': ok('Recursos.', ref('Features')) },
    },
  },

  // ---------- Categorias ----------
  '/categories': {
    get: {
      tags: ['Categorias'],
      summary: 'Lista as categorias',
      responses: { '200': ok('Categorias em ordem alfabética.', { type: 'array', items: ref('Category') }) },
    },
  },

  // ---------- Campanhas ----------
  '/campaigns': {
    get: {
      tags: ['Campanhas'],
      summary: 'Lista campanhas (paginado)',
      parameters: zodQueryParameters(listQuerySchema, {
        page: 'Página (começa em 1).',
        limit: 'Itens por página (máximo 50).',
        category: 'Id (ex.: 2) ou nome da categoria (ex.: Educação).',
        q: 'Texto procurado no título ou na descrição.',
      }),
      responses: { '200': ok('Página de campanhas.', ref('CampaignPage')), ...errors('BadRequest') },
    },
    post: {
      tags: ['Campanhas'],
      summary: 'Cria uma campanha',
      security: bearer,
      requestBody: jsonBody(
        zodBody(campaignSchema, {
          descriptions: {
            goalAmount: moneyInput,
            deadline: 'Dia do prazo em America/Sao_Paulo: "AAAA-MM-DD" (preferido) ou data e hora ISO 8601 (vale o dia desse instante em Brasília). Hoje ou depois; é gravado como o fim desse dia.',
            imageUrl: 'URL devolvida por POST /uploads/campaign-image ou /campaigns/ai-cover, ou URL http(s) externa. SVG só se for um arquivo da plataforma (/uploads deste servidor ou a pasta do Cloudinary configurada). Ao trocar ou remover, a imagem antiga da plataforma é apagada.',
          },
          example: {
            title: 'Biblioteca comunitária do bairro',
            description: 'Montar uma biblioteca na sala da associação de moradores, com livros doados e um espaço de leitura.',
            goalAmount: '3000.00',
            deadline: '2026-12-19',
            categoryId: 2,
            imageUrl: 'http://localhost:3001/uploads/9b2f6c1e-1d2a-4c55-9e1f-0a7b3c2d4e5f.png',
          },
        }),
      ),
      responses: { '201': ok('Campanha criada.', ref('CampaignDetail')), ...errors('BadRequest', 'Unauthorized') },
    },
  },
  '/campaigns/search': {
    get: {
      tags: ['Campanhas'],
      summary: 'Busca inteligente (semântica)',
      description: 'Busca por significado com embeddings. Se a busca semântica não estiver configurada ou falhar, usa a busca por texto e avisa em "notice" (mode = "text"). Rate limit: 30 por minuto.',
      parameters: zodQueryParameters(searchQuerySchema, {
        q: 'Texto da busca (2 a 200 caracteres).',
        category: 'Id ou nome da categoria.',
        page: 'Página.',
        limit: 'Itens por página (máximo 50).',
      }),
      responses: { '200': ok('Resultados.', ref('CampaignSearchResult')), ...errors('BadRequest', 'TooManyRequests') },
    },
  },
  '/campaigns/{id}': {
    get: {
      tags: ['Campanhas'],
      summary: 'Detalhe da campanha',
      parameters: [idParam],
      responses: { '200': ok('Campanha.', ref('CampaignDetail')), ...errors('BadRequest', 'NotFound') },
    },
    put: {
      tags: ['Campanhas'],
      summary: 'Atualiza a campanha (só o dono)',
      description: 'Envie só os campos a alterar. status: "FINISHED" encerra a campanha; imageUrl: null remove a capa.',
      security: bearer,
      parameters: [idParam],
      requestBody: jsonBody(zodBody(updateCampaignSchema, { descriptions: { goalAmount: moneyInput }, example: { title: 'Biblioteca comunitária do bairro (2ª fase)', status: 'ACTIVE' } })),
      responses: { '200': ok('Campanha atualizada.', ref('CampaignDetail')), ...errors('BadRequest', 'Unauthorized', 'Forbidden', 'NotFound') },
    },
    delete: {
      tags: ['Campanhas'],
      summary: 'Exclui a campanha (só o dono)',
      description: 'Campanha que já recebeu doações não pode ser excluída (409): encerre com status "FINISHED".',
      security: bearer,
      parameters: [idParam],
      responses: {
        '204': { description: 'Excluída.' },
        ...errors('BadRequest', 'Unauthorized', 'Forbidden', 'NotFound'),
        '409': ok('Campanha com doações.', ref('Error'), { error: 'Esta campanha já recebeu doações e não pode ser excluída. Encerre-a alterando o status para FINISHED.' }),
      },
    },
  },

  // ---------- Doações ----------
  '/campaigns/{id}/donations': {
    get: {
      tags: ['Doações'],
      summary: 'Doações da campanha (paginado)',
      description: 'Mais recentes primeiro. Mostra só o nome do doador.',
      parameters: [idParam, ...pageParams],
      responses: { '200': ok('Página de doações.', ref('DonationPage')), ...errors('BadRequest', 'NotFound') },
    },
    post: {
      tags: ['Doações'],
      summary: 'Faz uma doação (simulada)',
      description: 'Não há pagamento real. O dono não pode doar para a própria campanha (403); campanha encerrada ou vencida não recebe doações (400).',
      security: bearer,
      parameters: [idParam],
      requestBody: jsonBody(zodBody(donationSchema, { descriptions: { amount: moneyInput }, example: { amount: '150.50', message: 'Boa sorte com a biblioteca!' } })),
      responses: { '201': ok('Doação registrada.', ref('Donation')), ...errors('BadRequest', 'Unauthorized', 'Forbidden', 'NotFound') },
    },
  },

  // ---------- IA ----------
  '/campaigns/ai-cover': {
    post: {
      tags: ['IA'],
      summary: 'Gera uma capa com IA',
      description: 'Ilustração 16:9 (SVG ou imagem, conforme o provedor do servidor). Limites: 3 pedidos a cada 10 minutos e 5 capas por usuário a cada 24 h. Falha não consome o limite.',
      security: bearer,
      requestBody: jsonBody(zodBody(aiCoverSchema, { example: { title: 'Horta comunitária na praça', description: 'Canteiros elevados, composteira e oficinas para vizinhos aos sábados.', categoryId: 6 } })),
      responses: { '201': ok('Capa gerada.', ref('Url')), ...errors('BadRequest', 'Unauthorized', 'TooManyRequests', 'AiRejected', 'AiBadResponse', 'AiUnavailable') },
    },
  },
  '/campaigns/ai-description': {
    post: {
      tags: ['IA'],
      summary: 'Melhora a descrição com IA',
      description: 'Reescreve usando só os fatos do título e da descrição originais, em texto puro. Rate limit: 10 pedidos a cada 10 minutos (somando com ai-category).',
      security: bearer,
      requestBody: jsonBody(zodBody(descriptionInputSchema, { example: { title: 'Telhado da escolinha', description: 'a gente quer arrumar o telhado da escolinha q ta com goteira. tem 80 criança.', category: 'Educação' } })),
      responses: {
        '200': ok('Sugestão.', { type: 'object', properties: { description: { type: 'string' } } }, { description: 'A gente quer arrumar o telhado da escolinha, que está com goteira. A escola tem 80 crianças.' }),
        ...errors('BadRequest', 'Unauthorized', 'TooManyRequests', 'AiRejected', 'AiBadResponse', 'AiUnavailable'),
      },
    },
  },
  '/campaigns/ai-category': {
    post: {
      tags: ['IA'],
      summary: 'Sugere a categoria com IA',
      description: 'Devolve sempre o id de uma categoria existente. Rate limit compartilhado com ai-description.',
      security: bearer,
      requestBody: jsonBody(zodBody(categoryInputSchema, { example: { title: 'Painéis solares na creche', description: 'Instalar energia solar para reduzir a conta de luz da creche.' } })),
      responses: {
        '200': ok('Categoria sugerida.', { type: 'object', properties: { categoryId: { type: 'integer' } } }, { categoryId: 6 }),
        ...errors('BadRequest', 'Unauthorized', 'TooManyRequests', 'AiRejected', 'AiBadResponse', 'AiUnavailable'),
      },
    },
  },
  '/chat': {
    post: {
      tags: ['IA'],
      summary: 'Chatbot de suporte',
      description: 'Login opcional (com token, o rate limit conta por usuário). Só mensagens "user" e "assistant"; a última deve ser do usuário. Resposta em texto puro. Rate limit: 15 por minuto.',
      security: [{}, { bearerAuth: [] }],
      requestBody: jsonBody(zodBody(chatSchema, { example: { messages: [{ role: 'user', content: 'Me explica sobre a biblioteca comunitária do bairro?' }] } })),
      responses: {
        '200': ok('Resposta do assistente.', { type: 'object', properties: { reply: { type: 'string' } } }, { reply: 'A campanha "Biblioteca comunitária do bairro", da categoria Educação, ... Veja em /campaigns/12' }),
        ...errors('BadRequest', 'TooManyRequests'),
        '503': ok('Assistente indisponível.', ref('Error'), { error: 'O assistente está indisponível no momento. Tente novamente em instantes.' }),
      },
    },
  },

  // ---------- Upload ----------
  '/uploads/campaign-image': {
    post: {
      tags: ['Upload'],
      summary: 'Envia a imagem de capa',
      description:
        'JPEG, PNG ou WebP até 5 MB (o tipo é conferido pelos bytes do arquivo; SVG é recusado). Rate limit: 20 por hora. ' +
        'A URL devolvida é deste servidor (/uploads/...) ou a secure_url do Cloudinary, conforme STORAGE_PROVIDER. ' +
        '502/503: falha ou falta de configuração do armazenamento.',
      security: bearer,
      requestBody: {
        required: true,
        content: { 'multipart/form-data': { schema: { type: 'object', required: ['image'], properties: { image: { type: 'string', format: 'binary' } } } } },
      },
      responses: {
        '201': ok('Imagem salva.', ref('Url')),
        ...errors('BadRequest', 'Unauthorized', 'TooManyRequests'),
        '502': ok('Falha ao salvar no provedor de armazenamento.', ref('Error'), { error: 'Não foi possível salvar a imagem agora. Tente novamente em instantes.' }),
        '503': ok('Armazenamento não configurado.', ref('Error'), { error: 'O armazenamento de imagens não está configurado.' }),
      },
    },
  },
  '/uploads/{file}': {
    get: {
      tags: ['Upload'],
      summary: 'Arquivo enviado ou capa gerada (estático, provedor local)',
      description: 'Enviado com X-Content-Type-Options: nosniff; SVG com Content-Security-Policy restritiva.',
      parameters: [{ name: 'file', in: 'path', required: true, schema: { type: 'string', example: '9b2f6c1e-1d2a-4c55-9e1f-0a7b3c2d4e5f.png' } }],
      responses: {
        '200': { description: 'O arquivo.', content: { 'image/*': { schema: { type: 'string', format: 'binary' } } } },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  // ---------- Minha conta ----------
  '/me/campaigns': {
    get: {
      tags: ['Minha conta'],
      summary: 'Campanhas do usuário logado (paginado)',
      security: bearer,
      parameters: pageParams,
      responses: { '200': ok('Página de campanhas.', ref('MyCampaignPage')), ...errors('BadRequest', 'Unauthorized') },
    },
  },
  '/me/donations': {
    get: {
      tags: ['Minha conta'],
      summary: 'Doações feitas pelo usuário logado (paginado)',
      security: bearer,
      parameters: pageParams,
      responses: { '200': ok('Página de doações.', ref('MyDonationPage')), ...errors('BadRequest', 'Unauthorized') },
    },
  },
};

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'API da Plataforma de Crowdfunding',
    version: '1.0.0',
    description: [
      'API REST da plataforma de crowdfunding com IA (projeto de Estágio Supervisionado I, Ciência da Computação, UNINASSAU).',
      '',
      '- Erros: sempre `{ "error": "mensagem" }`.',
      '- Listas paginadas: `{ data: [...], meta: { page, limit, total, totalPages } }`.',
      '- Dinheiro: na resposta, sempre texto com 2 casas decimais (ex.: `"150.50"`).',
      '- Rotas com cadeado: clique em **Authorize** e cole o token de /auth/login.',
    ].join('\n'),
  },
  servers: [{ url: '/', description: 'Este servidor' }],
  tags: [
    { name: 'Status' },
    { name: 'Autenticação', description: 'Cadastro, login e recuperação de senha.' },
    { name: 'Configuração', description: 'Recursos ligados no servidor.' },
    { name: 'Categorias' },
    { name: 'Campanhas', description: 'CRUD, listagem e busca.' },
    { name: 'Doações', description: 'Doações simuladas (sem pagamento real).' },
    { name: 'IA', description: 'Capa, escrita e chatbot (podem estar desligados: veja /config/features).' },
    { name: 'Upload', description: 'Imagens de capa.' },
    { name: 'Minha conta', description: 'Dados do usuário logado.' },
  ],
  paths,
  components: { schemas, securitySchemes, responses },
} as const;
