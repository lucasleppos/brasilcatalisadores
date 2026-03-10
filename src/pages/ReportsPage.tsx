import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Download, Package, DollarSign, TrendingUp, BarChart3, Activity, Scale } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import {
  loadPurchasesSummary,
  loadBagsAnalysis,
  loadPipelineData,
  loadDashboardKPIs,
  exportToExcel,
  type DateRange,
} from "@/lib/reports";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  ResponsiveContainer,
  Cell,
} from "recharts";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtNum = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 1 });

// ─── KPI Card ───
function KpiCard({ title, value, icon: Icon }: { title: string; value: string; icon: React.ElementType }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

// ─── Tab 1: Purchases Summary ───
function PurchasesTab() {
  const [dateRange, setDateRange] = useState<DateRange>({});
  const [supplier, setSupplier] = useState<string>("");
  const [location, setLocation] = useState<string>("");

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers-list"],
    queryFn: async () => {
      const { data } = await supabase.from("suppliers").select("name").order("name");
      return data || [];
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["purchases-summary", dateRange, supplier, location],
    queryFn: () =>
      loadPurchasesSummary(
        dateRange,
        supplier || undefined,
        location || undefined
      ),
  });

  const chartConfig = {
    total_brl: { label: "Total (R$)", color: "hsl(var(--primary))" },
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-[220px] justify-start text-left font-normal", !dateRange.from && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange.from
                ? dateRange.to
                  ? `${format(dateRange.from, "dd/MM/yy")} - ${format(dateRange.to, "dd/MM/yy")}`
                  : format(dateRange.from, "dd/MM/yyyy")
                : "Período"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={dateRange.from ? { from: dateRange.from, to: dateRange.to } : undefined}
              onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
              locale={ptBR}
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        <Select value={supplier} onValueChange={setSupplier}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Fornecedor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {suppliers?.map((s) => (
              <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={location} onValueChange={setLocation}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filial" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="matriz">Matriz</SelectItem>
            <SelectItem value="filial">Filial</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="icon"
          onClick={() => {
            if (data?.raw) {
              exportToExcel(
                data.raw.map((p) => ({
                  Data: p.date,
                  Fornecedor: p.supplier_name,
                  Filial: p.location,
                  "Total (R$)": p.total_brl,
                })),
                "resumo-compras"
              );
            }
          }}
          title="Exportar Excel"
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>

      {/* Chart */}
      {isLoading ? (
        <div className="h-64 flex items-center justify-center text-muted-foreground">Carregando...</div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Total Comprado por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart data={data?.monthly || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `R$${fmtNum(v / 1000)}k`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="total_brl" fill="var(--color-total_brl)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Supplier ranking */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ranking de Fornecedores</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fornecedor</TableHead>
                <TableHead className="text-right">Compras</TableHead>
                <TableHead className="text-right">Total (R$)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.suppliers || []).slice(0, 15).map((s) => (
                <TableRow key={s.supplier_name}>
                  <TableCell className="font-medium">{s.supplier_name}</TableCell>
                  <TableCell className="text-right">{s.count}</TableCell>
                  <TableCell className="text-right">{fmt(s.total_brl)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab 2: Bags Analysis ───
function BagsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["bags-analysis"],
    queryFn: loadBagsAnalysis,
  });

  const chartConfig = {
    total_paid_brl: { label: "Pago (R$)", color: "hsl(var(--primary))" },
    refiner_total_value: { label: "Refinador (R$)", color: "hsl(var(--accent))" },
  };

  const chartData = (data?.rows || [])
    .filter((r) => r.refiner_total_value && r.refiner_total_value > 0)
    .slice(0, 20);

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="h-64 flex items-center justify-center text-muted-foreground">Carregando...</div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard title="Bags Fechados" value={String(data?.closedCount || 0)} icon={Package} />
            <KpiCard title="Peso Total" value={`${fmtNum(data?.totalWeight || 0)} kg`} icon={Scale} />
            <KpiCard title="Valor Pago Total" value={fmt(data?.totalPaid || 0)} icon={DollarSign} />
            <KpiCard title="Valor Refinador Total" value={fmt(data?.totalRefiner || 0)} icon={TrendingUp} />
          </div>

          {/* Chart */}
          {chartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pago vs Refinador por Bag</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="bag_number" className="text-xs" />
                    <YAxis className="text-xs" tickFormatter={(v) => `R$${fmtNum(v / 1000)}k`} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="total_paid_brl" fill="var(--color-total_paid_brl)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="refiner_total_value" fill="var(--color-refiner_total_value)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          {/* Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Comparativo de Bags</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (data?.rows) {
                    exportToExcel(
                      data.rows.map((r) => ({
                        Bag: r.bag_number,
                        Status: r.status,
                        "Peso (kg)": r.total_weight,
                        "Pago (R$)": r.total_paid_brl,
                        "Refinador (R$)": r.refiner_total_value || "",
                        "Margem %": r.margin_pct !== null ? fmtNum(r.margin_pct) : "",
                      })),
                      "analise-bags"
                    );
                  }
                }}
              >
                <Download className="h-4 w-4 mr-1" /> Excel
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bag</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Peso (kg)</TableHead>
                    <TableHead className="text-right">Pago (R$)</TableHead>
                    <TableHead className="text-right">Refinador (R$)</TableHead>
                    <TableHead className="text-right">Margem %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.rows || []).map((r) => (
                    <TableRow key={r.bag_number}>
                      <TableCell className="font-medium">{r.bag_number}</TableCell>
                      <TableCell>{r.status}</TableCell>
                      <TableCell className="text-right">{fmtNum(r.total_weight)}</TableCell>
                      <TableCell className="text-right">{fmt(r.total_paid_brl)}</TableCell>
                      <TableCell className="text-right">{r.refiner_total_value ? fmt(r.refiner_total_value) : "—"}</TableCell>
                      <TableCell className="text-right">
                        {r.margin_pct !== null ? (
                          <span className={r.margin_pct >= 0 ? "text-green-600" : "text-destructive"}>
                            {fmtNum(r.margin_pct)}%
                          </span>
                        ) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ─── Tab 3: Pipeline ───
function PipelineTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["pipeline-data"],
    queryFn: loadPipelineData,
  });

  const chartConfig = {
    count: { label: "Compras", color: "hsl(var(--primary))" },
  };

  const COLORS = [
    "hsl(var(--primary))",
    "hsl(var(--accent))",
    "hsl(38, 50%, 55%)",
    "hsl(30, 15%, 45%)",
    "hsl(120, 40%, 45%)",
  ];

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="h-64 flex items-center justify-center text-muted-foreground">Carregando...</div>
      ) : (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Compras por Status</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (data) {
                    exportToExcel(
                      data.map((r) => ({
                        Status: r.status,
                        Quantidade: r.count,
                        "Tempo Médio (dias)": r.avg_days ?? "",
                      })),
                      "pipeline-operacional"
                    );
                  }
                }}
              >
                <Download className="h-4 w-4 mr-1" /> Excel
              </Button>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <BarChart data={data || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="status" type="category" width={120} className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {(data || []).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tempo Médio por Etapa</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Etapa</TableHead>
                    <TableHead className="text-right">Compras</TableHead>
                    <TableHead className="text-right">Tempo Médio (dias)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data || []).map((r) => (
                    <TableRow key={r.status}>
                      <TableCell className="font-medium">{r.status}</TableCell>
                      <TableCell className="text-right">{r.count}</TableCell>
                      <TableCell className="text-right">{r.avg_days !== null ? `${r.avg_days} dias` : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ─── Tab 4: Dashboard Financeiro ───
function FinancialTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-kpis"],
    queryFn: loadDashboardKPIs,
  });

  const chartConfig = {
    invested: { label: "Investido (R$)", color: "hsl(var(--primary))" },
  };

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="h-64 flex items-center justify-center text-muted-foreground">Carregando...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard title="Total Investido" value={fmt(data?.total_invested || 0)} icon={DollarSign} />
            <KpiCard title="Retorno Refinador" value={fmt(data?.total_refiner || 0)} icon={TrendingUp} />
            <KpiCard title="Margem Média" value={`${fmtNum(data?.avg_margin || 0)}%`} icon={Activity} />
            <KpiCard title="Câmbio USD/BRL" value={`R$ ${fmtNum(data?.usd_to_brl || 0)}`} icon={BarChart3} />
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Evolução do Investimento Mensal</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (data?.monthly_evolution) {
                    exportToExcel(
                      data.monthly_evolution.map((m) => ({
                        Mês: m.month,
                        "Investido (R$)": m.invested,
                      })),
                      "dashboard-financeiro"
                    );
                  }
                }}
              >
                <Download className="h-4 w-4 mr-1" /> Excel
              </Button>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <LineChart data={data?.monthly_evolution || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => `R$${fmtNum(v / 1000)}k`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="invested"
                    stroke="var(--color-invested)"
                    strokeWidth={2}
                    dot={{ fill: "var(--color-invested)" }}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ─── Main Page ───
export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-display font-bold">Relatórios</h1>

      <Tabs defaultValue="compras" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="compras">Compras</TabsTrigger>
          <TabsTrigger value="bags">Bags</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
        </TabsList>

        <TabsContent value="compras">
          <PurchasesTab />
        </TabsContent>
        <TabsContent value="bags">
          <BagsTab />
        </TabsContent>
        <TabsContent value="pipeline">
          <PipelineTab />
        </TabsContent>
        <TabsContent value="financeiro">
          <FinancialTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
