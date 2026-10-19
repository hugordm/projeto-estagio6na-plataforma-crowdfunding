import { z } from 'zod';
import { Prisma } from '../../generated/prisma/client';

/*
 * Convenção de valores monetários da API:
 * - No banco: Decimal(12,2); no código: Prisma.Decimal (decimal.js), nunca number,
 *   para não perder precisão em somas.
 * - Na entrada: aceita número (150.5) ou string ("150.50"), com no máximo 2 casas decimais.
 * - Na saída: sempre string com 2 casas decimais, ex.: "150.50".
 * - progress é number (percentual com 2 casas) e pode passar de 100.
 */

const MAX_AMOUNT = new Prisma.Decimal('9999999999.99');

export function moneySchema(label: string) {
  return z
    .union([z.number(), z.string()], { error: `${label} é obrigatório e deve ser um número` })
    .transform((value, ctx) => {
      const text = String(value).trim();
      if (!/^\d+(\.\d{1,2})?$/.test(text)) {
        ctx.addIssue({ code: 'custom', message: `${label} deve ser um número positivo com até 2 casas decimais` });
        return z.NEVER;
      }
      const amount = new Prisma.Decimal(text);
      if (amount.lte(0)) {
        ctx.addIssue({ code: 'custom', message: `${label} deve ser maior que zero` });
        return z.NEVER;
      }
      if (amount.gt(MAX_AMOUNT)) {
        ctx.addIssue({ code: 'custom', message: `${label} excede o valor máximo permitido` });
        return z.NEVER;
      }
      return amount;
    });
}

export function formatMoney(value: Prisma.Decimal): string {
  return value.toFixed(2);
}

export function calcProgress(raised: Prisma.Decimal, goal: Prisma.Decimal): number {
  if (goal.lte(0)) return 0;
  return raised.div(goal).mul(100).toDecimalPlaces(2).toNumber();
}
