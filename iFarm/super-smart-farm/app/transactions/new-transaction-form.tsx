// app/transactions/new-transaction-form.tsx
"use client";

// Multi-currency transaction entry form. Submits to the createTransaction
// Server Action; all money math/validation happens server-side.
import { useState, useTransition } from "react";
import { createTransaction } from "@/app/actions/transactions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Option = { id: string; label: string };

interface Props {
  subCategories: Option[]; // pre-fetched in the parent server component
  batches: Option[];
}

const CURRENCIES = [
  { key: "amountLak", label: "ກີບ (LAK)", symbol: "₭" },
  { key: "amountThb", label: "ບາດ (THB)", symbol: "฿" },
  { key: "amountUsd", label: "ໂດລາ (USD)", symbol: "$" },
  { key: "amountCny", label: "ຢວນ (CNY)", symbol: "¥" },
] as const;

export function NewTransactionForm({ subCategories, batches }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    setError(null);
    const payload = {
      date: formData.get("date"),
      type: formData.get("type"),
      description: formData.get("description"),
      subCategoryId: formData.get("subCategoryId"),
      batchId: formData.get("batchId") || null,
      pnlInclusion: formData.get("pnlInclusion") === "on",
      amountLak: formData.get("amountLak") || "0",
      amountThb: formData.get("amountThb") || "0",
      amountUsd: formData.get("amountUsd") || "0",
      amountCny: formData.get("amountCny") || "0",
      notes: formData.get("notes") || undefined,
    };
    startTransition(async () => {
      const res = await createTransaction(payload).catch(() => ({
        ok: false as const,
        message: "Failed to save",
      }));
      if (!res.ok) setError(res.message);
    });
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>ບັນທຶກລາຍການໃໝ່ — New Transaction</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={onSubmit} className="grid gap-5">
          {/* Date + Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="date">ວັນທີ — Date</Label>
              <Input
                id="date"
                name="date"
                type="date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="type">ປະເພດ — Type</Label>
              <Select name="type" defaultValue="EXPENSE">
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INCOME">ລາຍຮັບ — Income</SelectItem>
                  <SelectItem value="EXPENSE">ລາຍຈ່າຍ — Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="grid gap-1.5">
            <Label htmlFor="description">ເນື້ອໃນ — Description</Label>
            <Input id="description" name="description" required />
          </div>

          {/* Sub-category + Batch */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="subCategoryId">ໝວດຍ່ອຍ — Sub-category</Label>
              <Select name="subCategoryId" required>
                <SelectTrigger id="subCategoryId">
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {subCategories.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="batchId">ງວດ — Batch (optional)</Label>
              <Select name="batchId">
                <SelectTrigger id="batchId">
                  <SelectValue placeholder="No batch" />
                </SelectTrigger>
                <SelectContent>
                  {batches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Multi-currency grid */}
          <fieldset className="grid gap-2 rounded-lg border p-4">
            <legend className="px-1 text-sm font-medium">
              ຈຳນວນເງິນ — Amounts (enter any combination)
            </legend>
            <div className="grid grid-cols-2 gap-4">
              {CURRENCIES.map((c) => (
                <div key={c.key} className="grid gap-1.5">
                  <Label htmlFor={c.key}>{c.label}</Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {c.symbol}
                    </span>
                    <Input
                      id={c.key}
                      name={c.key}
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue="0"
                      className="pl-7"
                      inputMode="decimal"
                    />
                  </div>
                </div>
              ))}
            </div>
          </fieldset>

          {/* P&L inclusion flag */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label htmlFor="pnlInclusion">
                ນັບເຂົ້າກຳໄລງວດ — Include in batch P&amp;L
              </Label>
              <p className="text-sm text-muted-foreground">
                Turn off for shared admin / capital expenditure.
              </p>
            </div>
            <Switch id="pnlInclusion" name="pnlInclusion" defaultChecked />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="notes">ໝາຍເຫດ — Notes</Label>
            <Textarea id="notes" name="notes" rows={2} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={isPending}>
            {isPending ? "ກຳລັງບັນທຶກ…" : "ບັນທຶກ — Save Transaction"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
