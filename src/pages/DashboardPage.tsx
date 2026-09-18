import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Download, Package, CheckCircle2, DollarSign, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  loadDailyPurchaseReport,
  exportToExcel,
  FLOW_KEYS,
  FLOW_TITLES,
  type DailyRow,
} from "@/lib/reports";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtShort = (v: number) =>
  `R$${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k`;

function KpiCard({
  title,
  value,
  sub,
  icon: Icon,
}: {
  title: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function DailyTable({
  title,
  rows,
  showValue,
  onExport,
}: {
  title: string;
  rows: DailyRow[];
  showValue: boolean;
  onExport: () => void;
}) {
  const visible = rows.filter((r) => r.count > 0);
  const total = visible.reduce(
    (acc, r) => {
      acc.count += r.count;
      acc.value += r.value;
      return acc;
    },
    { count: 0, value: 0 }
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">{title}</CardTitle>
        <Button variant="outline" size="icon" onClick={onExport} title="Exportar para Excel">
          <Download className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma compra neste mês.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dia</TableHead>
                  {FLOW_KEYS.map((k) => (
                    <TableHead key={k} className="text-right">
                      {FLOW_TITLES[k]}
                    </TableHead>
                  ))}
                  <TableHead className="text-right">Qtd. Total</TableHead>
                  {showValue && <TableHead className="text-right">Valor Total</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((r) => (
                  <TableRow key={r.day}>
                    <TableCell className="font-medium">{String(r.day).padStart(2, "0")}</TableCell>
                    {FLOW_KEYS.map((k) => (
                      <TableCell key={k} className="text-right">
                        {r.byFlow[k].count || "—"}
                        {showValue && r.byFlow[k].count > 0 && (
                          <span className="block text-xs text-muted-foreground">
                            {fmt(r.byFlow[k].value)}
                          </span>
                        )}
                      </TableCell>
                    ))}
                    <TableCell className="text-right font-medium">{r.count}</TableCell>
                    {showValue && <TableCell className="text-right font-medium">{fmt(r.value)}</TableCell>}
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50">
                  <TableCell className="font-semibold">Total</TableCell>
                  {FLOW_KEYS.map((k) => (
                    <TableCell key={k} className="text-right font-semibold">
                      {visible.reduce((s, r) => s + r.byFlow[k].count, 0)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-semibold">{total.count}</TableCell>
                  {showValue && <TableCell className="text-right font-semibold">{fmt(total.value)}</TableCell>}
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const now = new Date();
  const [month, setMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1));

  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1, 0, 0, 0, 0);
  const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59, 999);

  const { data, isLoading } = useQuery({
    queryKey: ["daily-purchase-report", monthStart.toISOString()],
    queryFn: () => loadDailyPurchaseReport(monthStart, monthEnd),
  });

  const monthLabel = format(month, "MMMM 'de' yyyy", { locale: ptBR });
  const isCurrentMonth =
    month.getFullYear() === now.getFullYear() && month.getMonth() === now.getMonth();

  const shiftMonth = (delta: number) =>
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));

  const exportRows = (rows: DailyRow[], withValue: boolean) =>
    rows
      .filter((r) => r.count > 0)
      .map((r) => {
        const out: Record<string, unknown> = { Dia: r.date };
        for (const k of FLOW_KEYS) {
          out[`${FLOW_TITLES[k]} (qtd)`] = r.byFlow[k].count;
          if (withValue) out[`${FLOW_TITLES[k]} (R$)`] = r.byFlow[k].value;
        }
        out["Qtd. Total"] = r.count;
        if (withValue) out["Valor Total (R$)"] = r.value;
        return out;
      });

  const chartConfig = {
    included_value: { label: "Incluídas (dia)", color: "hsl(var(--muted-foreground))" },
    completed_value: { label: "Concluídas (dia)", color: "hsl(var(--primary))" },
    included_cum: { label: "Incluídas (acum.)", color: "hsl(var(--muted-foreground))" },
    completed_cum: { label: "Concluídas (acum.)", color: "hsl(var(--primary))" },
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Compras incluídas e concluídas por dia</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => shiftMonth(-1)} title="Mês anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 px-3 py-2 border rounded-md min-w-[180px] justify-center">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium capitalize">{monthLabel}</span>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => shiftMonth(1)}
            disabled={isCurrentMonth}
            title="Mês seguinte"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading || !data ? (
        <div className="h-64 flex items-center justify-center text-muted-foreground">Carregando...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="Compras incluídas"
              value={String(data.totals.included.count)}
              sub={FLOW_KEYS.map((k) => `${FLOW_TITLES[k]}: ${data.totals.included.byFlow[k].count}`).join(" · ")}
              icon={Package}
            />
            <KpiCard
              title="Compras concluídas"
              value={String(data.totals.completed.count)}
              sub={FLOW_KEYS.map((k) => `${FLOW_TITLES[k]}: ${data.totals.completed.byFlow[k].count}`).join(" · ")}
              icon={CheckCircle2}
            />
            <KpiCard title="Valor concluído no mês" value={fmt(data.totals.completed.value)} icon={DollarSign} />
            <KpiCard title="Valor incluído no mês" value={fmt(data.totals.included.value)} icon={DollarSign} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Valores diários e acumulado do mês</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[340px] w-full">
                <ComposedChart data={data.chart}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="day" className="text-xs" />
                  <YAxis yAxisId="left" className="text-xs" tickFormatter={fmtShort} />
                  <YAxis yAxisId="right" orientation="right" className="text-xs" tickFormatter={fmtShort} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend
                    formatter={(v) => chartConfig[v as keyof typeof chartConfig]?.label || String(v)}
                  />
                  <Bar yAxisId="left" dataKey="included_value" fill="var(--color-included_value)" radius={[3, 3, 0, 0]} />
                  <Bar yAxisId="left" dataKey="completed_value" fill="var(--color-completed_value)" radius={[3, 3, 0, 0]} />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="included_cum"
                    stroke="var(--color-included_cum)"
                    strokeDasharray="4 4"
                    dot={false}
                    strokeWidth={2}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="completed_cum"
                    stroke="var(--color-completed_cum)"
                    dot={false}
                    strokeWidth={2}
                  />
                </ComposedChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <DailyTable
            title="Compras concluídas por dia"
            rows={data.completed}
            showValue
            onExport={() =>
              exportToExcel(exportRows(data.completed, true), `concluidas-${format(month, "yyyy-MM")}`)
            }
          />

          <DailyTable
            title="Compras incluídas por dia"
            rows={data.included}
            showValue={false}
            onExport={() =>
              exportToExcel(exportRows(data.included, false), `incluidas-${format(month, "yyyy-MM")}`)
            }
          />
        </>
      )}
    </div>
  );
}
