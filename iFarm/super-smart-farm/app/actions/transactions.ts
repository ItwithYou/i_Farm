// app/actions/transactions.ts
"use server";

// Server Action for posting a transaction. The server is authoritative for
// validation (Zod) and the FX snapshot — client-computed money is never trusted.
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { buildRateMap, toLakEquivalent } from "@/lib/currency";
import { revalidatePath } from "next/cache";

const TransactionSchema = z.object({
  date: z.coerce.date(),
  type: z.enum(["INCOME", "EXPENSE"]),
  description: z.string().min(1, "Description required"),
  subCategoryId: z.string().cuid(),
  batchId: z.string().cuid().optional().nullable(),
  pnlInclusion: z.boolean().default(true),
  // Amounts arrive as strings to preserve precision over the wire.
  amountLak: z.string().default("0"),
  amountThb: z.string().default("0"),
  amountUsd: z.string().default("0"),
  amountCny: z.string().default("0"),
  notes: z.string().optional(),
});

export type CreateTransactionResult =
  | { ok: true }
  | { ok: false; message: string };

export async function createTransaction(raw: unknown): Promise<CreateTransactionResult> {
  const parsed = TransactionSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  // Resolve the effective FX rate map for this transaction's date (newest rate
  // per currency on/before the date).
  const rateRows = await prisma.exchangeRate.findMany({
    where: { effectiveDate: { lte: data.date } },
    orderBy: { effectiveDate: "desc" },
    distinct: ["currency"],
  });
  const rates = buildRateMap(rateRows);

  const amountLakEquivalent = toLakEquivalent(data, rates);

  await prisma.transaction.create({
    data: {
      date: data.date,
      type: data.type,
      description: data.description,
      notes: data.notes,
      subCategoryId: data.subCategoryId,
      batchId: data.batchId ?? null,
      pnlInclusion: data.pnlInclusion,
      amountLak: data.amountLak,
      amountThb: data.amountThb,
      amountUsd: data.amountUsd,
      amountCny: data.amountCny,
      amountLakEquivalent: amountLakEquivalent.toString(),
    },
  });

  revalidatePath("/transactions");
  revalidatePath("/batches");
  return { ok: true };
}
