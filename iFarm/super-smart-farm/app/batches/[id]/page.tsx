// app/batches/[id]/page.tsx — Batch Profitability Dashboard (Server Component).
// Aggregation runs on the server, close to the data. Respects pnlInclusion so
// excluded overhead/CapEx never distorts batch profit.
import { getBatchPnL } from "@/lib/batch-pnl";
import { formatLak } from "@/lib/currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const SYMBOLS: Record<string, string> = { LAK: "₭", THB: "฿", USD: "$", CNY: "¥" };
const fmt = (v: { toNumber(): number }) => v.toNumber().toLocaleString();

export default async function BatchDashboard({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pnl = await getBatchPnL(id);
  const profitable = pnl.netProfitLak.greaterThanOrEqualTo(0);

  return (
    <div className="grid gap-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          ກຳໄລ-ຂາດທຶນ — Profitability · {pnl.batchName}
        </h1>
        <Badge variant={profitable ? "default" : "destructive"}>
          {profitable ? "ກຳໄລ Profit" : "ຂາດທຶນ Loss"}
        </Badge>
      </header>

      {/* Unified KPI row — everything normalised to LAK */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi title="ລາຍຮັບລວມ — Total Income" value={formatLak(pnl.totalIncomeLak)} />
        <Kpi title="ລາຍຈ່າຍລວມ — Total Expense" value={formatLak(pnl.totalExpenseLak)} />
        <Kpi
          title="ກຳໄລສຸດທິ — Net Profit (LAK)"
          value={formatLak(pnl.netProfitLak)}
          accent={profitable ? "text-emerald-600" : "text-destructive"}
        />
      </div>

      {/* Per-currency breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>ແຍກຕາມສະກຸນເງິນ — By Currency</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Currency</TableHead>
                <TableHead className="text-right">Income</TableHead>
                <TableHead className="text-right">Expense</TableHead>
                <TableHead className="text-right">Net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pnl.byCurrency.map((c) => {
                const net = c.income.minus(c.expense);
                return (
                  <TableRow key={c.currency}>
                    <TableCell className="font-medium">
                      {SYMBOLS[c.currency]} {c.currency}
                    </TableCell>
                    <TableCell className="text-right">{fmt(c.income)}</TableCell>
                    <TableCell className="text-right">{fmt(c.expense)}</TableCell>
                    <TableCell
                      className={`text-right font-medium ${
                        net.greaterThanOrEqualTo(0)
                          ? "text-emerald-600"
                          : "text-destructive"
                      }`}
                    >
                      {fmt(net)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <p className="mt-3 text-xs text-muted-foreground">
            Net Profit (LAK) above converts every currency to Kip using the FX rate
            snapshotted on each transaction — figures are historically accurate.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({
  title,
  value,
  accent,
}: {
  title: string;
  value: string;
  accent?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-normal text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-semibold ${accent ?? ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
