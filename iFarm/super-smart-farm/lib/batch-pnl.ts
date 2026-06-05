// lib/batch-pnl.ts
// Per-batch Profit & Loss aggregation. Enforces the Include_in_batch_profit
// rule and reports both a per-currency breakdown and a unified LAK total.
import { prisma } from "@/lib/prisma";
import Decimal from "decimal.js";
import type { Currency } from "@prisma/client";

export interface CurrencyBreakdown {
  currency: Currency;
  income: Decimal;
  expense: Decimal;
}

export interface BatchPnL {
  batchId: string;
  batchName: string;
  byCurrency: CurrencyBreakdown[];
  totalIncomeLak: Decimal; // unified, from snapshotted LAK-equivalent
  totalExpenseLak: Decimal;
  netProfitLak: Decimal;
}

/**
 * Computes per-batch P&L. Only lines with pnlInclusion=true are counted —
 * this is where the Include_in_batch_profit rule is enforced.
 */
export async function getBatchPnL(batchId: string): Promise<BatchPnL> {
  const batch = await prisma.batch.findUniqueOrThrow({
    where: { id: batchId },
    include: {
      transactions: { where: { pnlInclusion: true } },
    },
  });

  const init = () => ({ income: new Decimal(0), expense: new Decimal(0) });
  const buckets: Record<Currency, { income: Decimal; expense: Decimal }> = {
    LAK: init(),
    THB: init(),
    USD: init(),
    CNY: init(),
  };
  let totalIncomeLak = new Decimal(0);
  let totalExpenseLak = new Decimal(0);

  for (const t of batch.transactions) {
    const legs: [Currency, Decimal][] = [
      ["LAK", new Decimal(t.amountLak.toString())],
      ["THB", new Decimal(t.amountThb.toString())],
      ["USD", new Decimal(t.amountUsd.toString())],
      ["CNY", new Decimal(t.amountCny.toString())],
    ];
    const lakEq = new Decimal(t.amountLakEquivalent.toString());

    if (t.type === "INCOME") {
      for (const [c, v] of legs) buckets[c].income = buckets[c].income.plus(v);
      totalIncomeLak = totalIncomeLak.plus(lakEq);
    } else {
      for (const [c, v] of legs) buckets[c].expense = buckets[c].expense.plus(v);
      totalExpenseLak = totalExpenseLak.plus(lakEq);
    }
  }

  return {
    batchId: batch.id,
    batchName: batch.name,
    byCurrency: (Object.keys(buckets) as Currency[]).map((c) => ({
      currency: c,
      ...buckets[c],
    })),
    totalIncomeLak,
    totalExpenseLak,
    netProfitLak: totalIncomeLak.minus(totalExpenseLak),
  };
}
