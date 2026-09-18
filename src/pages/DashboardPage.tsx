import { useMemo, useState } from "react";
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
  type FlowKey,
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

type FlowFilter = FlowKey | "all";

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
  flows,
  showValue,
  onExport,
}: {
  title: string;
  rows: DailyRow[];
  flows: FlowKey[];
  showValue: boolean;
  onExport: () => void;
}) {
  const flowCount = (r: DailyRow) => flows.reduce((s, k) => s + r.byFlow[k].count, 0);
  const flowValue = (r: DailyRow) => flows.reduce((s, k) => s + r.byFlow[k].value, 0);

  const visible = rows.filter((r) => flowCount(r) > 0);
  const total = visible.reduce(
    (acc, r) => {
      acc.count += flowCount(r);
      acc.value += flowValue(r);
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
                  {flows.map((k) => (
                    <TableHead key={k} className="text-right">
                      {FLOW_TITLES[k]}
                    </TableHead>
                  ))}
                  {flows.length > 1 && <TableHead className="text-right">Qtd. Total</TableHead>}
                  {showValue && flows.length > 1 && (
                    <TableHead className="text-right">Valor Total</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((r) => (
                  <TableRow key={r.day}>
                    <TableCell className="font-medium">{String(r.day).padStart(2, "0")}</TableCell>
                    {flows.map((k) => (
                      <TableCell key={k} className="text-right">
                        {r.byFlow[k].count || "—"}
                        {showValue && r.byFlow[k].count > 0 && (
                          <span className="block text-xs text-muted-foreground">
                            {fmt(r.byFlow[k].value)}
                          </span>
                        )}
                      </TableCell>
                    ))}
                    {flows.length > 1 && (
                      <TableCell className="text-right font-medium">{flowCount(r)}</TableCell>
                    )}
                    {showValue && flows.length > 1 && (
                      <TableCell className="text-right font-medium">{fmt(flowValue(r))}</TableCell>
                    )}
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50">
                  <TableCell className="font-semibold">Total</TableCell>
                  {flows.map((k) => (
                    <TableCell key={k} className="text-right font-semibold">
                      {visible.reduce((s, r) => s + r.byFlow[k].count, 0)}
                    </TableCell>
                  ))}
                  {flows.length > 1 && (
                    <TableCell className="text-right font-semibold">{total.count}</TableCell>
                  )}
                  {showValue && flows.length > 1 && (
                    <TableCell className="text-right font-semibold">{fmt(total.value)}</TableCell>
                  )}
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
  const [flowFilter, setFlowFilter] = useState<FlowFilter>("all");

  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1, 0, 0, 0, 0);
  const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59, 999);

  const { data, isLoading } = useQuery({
    queryKey: ["daily-purchase-report", monthStart.toISOString()],
    queryFn: () => loadDailyPurchaseReport(monthStart, monthEnd),
  });

  const flows: FlowKey[] = flowFilter === "all" ? FLOW_KEYS : [flowFilter];

  const chartData = useMemo(() => {
    if (!data) return [];
    let compCum = 0;
    return data.included.map((row, i) => {
      const completed_value = flows.reduce((s, k) => s + data.completed[i].byFlow[k].value, 0);
      compCum += completed_value;
      return {
        day: row.day,
        completed_value,
        completed_cum: compCum,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, flowFilter]);

  const monthLabel = format(month, "MMMM 'de' yyyy", { locale: ptBR });
  const isCurrentMonth =
    month.getFullYear() === now.getFullYear() && month.getMonth() === now.getMonth();

  const shiftMonth = (delta: number) =>
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));

  const totalsFor = (side: "included" | "completed") => {
    const t = data?.totals[side];
    if (!t) return { count: 0, value: 0 };
    return {
      count: flows.reduce((s, k) => s + t.byFlow[k].count, 0),
      value: flows.reduce((s, k) => s + t.byFlow[k].value, 0),
    };
  };

  const exportRows = (rows: DailyRow[], withValue: boolean) =>
    rows
      .filter((r) => flows.reduce((s, k) => s + r.byFlow[k].count, 0) > 0)
      .map((r) => {
        const out: Record<string, unknown> = { Dia: r.date };
        for (const k of flows) {
          out[`${FLOW_TITLES[k]} (qtd)`] = r.byFlow[k].count;
          if (withValue) out[`${FLOW_TITLES[k]} (R$)`] = r.byFlow[k].value;
        }
        if (flows.length > 1) out["Qtd. Total"] = flows.reduce((s, k) => s + r.byFlow[k].count, 0);
        if (withValue && flows.length > 1)
          out["Valor Total (R$)"] = flows.reduce((s, k) => s + r.byFlow[k].value, 0);
        return out;
      });

  const chartConfig = {
    completed_value: { label: "Concluídas (dia)", color: "hsl(var(--primary))" },
    completed_cum: { label: "Concluídas (acum.)", color: "hsl(var(--primary))" },
  };

  const filterButtons: { key: FlowFilter; label: string }[] = [
    { key: "all", label: "Todos" },
    ...FLOW_KEYS.map((k) => ({ key: k as FlowFilter, label: FLOW_TITLES[k] })),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Compras incluídas e concluídas por dia</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 border rounded-md p-1">
            {filterButtons.map((b) => (
              <Button
                key={b.key}
                variant={flowFilter === b.key ? "default" : "ghost"}
                size="sm"
                className="h-8"
                onClick={() => setFlowFilter(b.key)}
              >
                {b.label}
              </Button>
            ))}
          </div>
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
              value={String(totalsFor("included").count)}
              sub={
                flows.length > 1
                  ? FLOW_KEYS.map((k) => `${FLOW_TITLES[k]}: ${data.totals.included.byFlow[k].count}`).join(" · ")
                  : undefined
              }
              icon={Package}
            />
            <KpiCard
              title="Compras concluídas"
              value={String(totalsFor("completed").count)}
              sub={
                flows.length > 1
                  ? FLOW_KEYS.map((k) => `${FLOW_TITLES[k]}: ${data.totals.completed.byFlow[k].count}`).join(" · ")
                  : undefined
              }
              icon={CheckCircle2}
            />
            <KpiCard
              title="Valor concluído no mês"
              value={fmt(totalsFor("completed").value)}
              icon={DollarSign}
            />
            <KpiCard
              title="Valor incluído no mês"
              value={fmt(totalsFor("included").value)}
              icon={DollarSign}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Valores diários e acumulado do mês</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[340px] w-full">
                <ComposedChart data={chartData}>
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
            flows={flows}
            showValue
            onExport={() =>
              exportToExcel(exportRows(data.completed, true), `concluidas-${format(month, "yyyy-MM")}`)
            }
          />

          <DailyTable
            title="Compras incluídas por dia"
            rows={data.included}
            flows={flows}
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
