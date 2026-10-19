import { z } from 'zod';

// Converte os schemas zod usados na validação das rotas em JSON Schema (formato do OpenAPI 3.0),
// com o conversor nativo do zod 4 (z.toJSONSchema). Assim a documentação dos corpos e dos
// parâmetros acompanha automaticamente as regras reais (tamanhos, obrigatórios, enums...).

export type JsonSchema = { [key: string]: unknown };

export function zodToSchema(schema: z.ZodType): JsonSchema {
  const json = z.toJSONSchema(schema, {
    io: 'input', // o que o cliente envia (antes de coerções e transformações)
    target: 'openapi-3.0',
    unrepresentable: 'any',
    override: (ctx) => {
      // z.coerce.date() não tem equivalente direto: na API a data vai como texto ISO 8601.
      if (ctx.zodSchema._zod.def.type === 'date') {
        ctx.jsonSchema.type = 'string';
        ctx.jsonSchema.format = 'date-time';
      }
    },
  }) as JsonSchema;
  delete json.$schema;
  return json;
}

// Corpo da requisição a partir do schema, com descrições e exemplo opcionais por campo.
export function zodBody(schema: z.ZodType, extras: { descriptions?: Record<string, string>; example?: unknown } = {}): JsonSchema {
  const json = zodToSchema(schema);
  const properties = (json.properties ?? {}) as Record<string, JsonSchema>;
  for (const [field, description] of Object.entries(extras.descriptions ?? {})) {
    if (properties[field]) properties[field].description = description;
  }
  return extras.example === undefined ? json : { ...json, example: extras.example };
}

// Parâmetros de query a partir de um schema de objeto (cada propriedade vira um parâmetro).
export function zodQueryParameters(schema: z.ZodType, descriptions: Record<string, string> = {}) {
  const json = zodToSchema(schema);
  const properties = (json.properties ?? {}) as Record<string, JsonSchema>;
  const required = new Set((json.required as string[] | undefined) ?? []);
  return Object.entries(properties).map(([name, property]) => ({
    name,
    in: 'query',
    required: required.has(name) && property.default === undefined,
    description: descriptions[name],
    schema: property,
  }));
}
