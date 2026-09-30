import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Download, Scale, DollarSign, Search, Atom } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { exportToExcel, FLOW_KEYS, FLOW_TITLES, type FlowKey } from "@/lib/reports";
import { loadMetalsReport, hedgeLabel, toOzt } from "@/lib/metals-report";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const num = (v: number, d = 4) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });

function MetalCard({ label, grams }: { label: string; grams: number }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Atom className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{num(grams, 2)} g</div>
        <div className="text-xs text-muted-foreground">{num(toOzt(grams), 4)} ozt</div>
      </CardContent>
    </Card>
  );
}

export default function MetalsHedgeTab() {
  const [from, setFrom] = useState<Date | undefined>();
  const [to, setTo] = useState<Date | undefined>();
  const [hedgeId, setHedgeId] = useState("all");
  const [flow, setFlow] = useState<string>("all");
  const [buyer, setBuyer] = useState("all");
  const [supplier, setSupplier] = useState("all");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["metals-report", from, to, hedgeId, flow, buyer, supplier, search],
    queryFn: () =>
      loadMetalsReport({
        from,
        to,
        hedgeId,
        flow: flow === "all" ? undefined : (flow as FlowKey),
        buyer,
        supplier,
        search,
      }),
  });

  const rows = data?.rows || [];
  const t = data?.totals;

  const handleExport = () => {
    exportToExcel(
      rows.map((r) => ({
        Data: format(new Date(r.date), "dd/MM/yyyy"),
        Compra: r.purchaseNumber,
        Filial: r.location,
        Fornecedor: r.supplierName,
        Comprador: r.buyer,
        Tipo: r.flowLabel,
        Hedge: r.hedge?.name || "Sem hedge",
        "Pt (US$/ozt)": r.hedge?.ptPrice ?? "",
        "Pd (US$/ozt)": r.hedge?.pdPrice ?? "",
        "Rh (US$/ozt)": r.hedge?.rhPrice ?? "",
        "Câmbio (R$)": r.hedge?.usdToBrl ?? "",
        "Peso (kg)": Number(r.weightKg.toFixed(4)),
        "Pt (g)": Number(r.ptG.toFixed(4)),
        "Pt (ozt)": Number(toOzt(r.ptG).toFixed(4)),
        "Pd (g)": Number(r.pdG.toFixed(4)),
        "Pd (ozt)": Number(toOzt(r.pdG).toFixed(4)),
        "Rh (g)": Number(r.rhG.toFixed(4)),
        "Rh (ozt)": Number(toOzt(r.rhG).toFixed(4)),
        "Valor Pago (R$)": Number(r.totalBrl.toFixed(2)),
        Origem: r.origin,
      })),
      "metais-hedge"
    );
  };

  const datePicker = (label: string, value: Date | undefined, onChange: (d?: Date) => void) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("w-[150px] justify-start text-left font-normal", !value && "text-muted-foreground")}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, "dd/MM/yyyy") : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={value} onSelect={onChange} locale={ptBR} className="p-3 pointer-events-auto" />
      </PopoverContent>
    </Popover>
  );

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        {datePicker("De", from, setFrom)}
        {datePicker("Até", to, setTo)}

        <Select value={hedgeId} onValueChange={setHedgeId}>
          <SelectTrigger className="w-[340px]">
            <SelectValue placeholder="Hedge" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os hedges</SelectItem>
            <SelectItem value="none">Sem hedge vinculado</SelectItem>
            {(data?.hedges || []).map((h) => (
              <SelectItem key={h.id} value={h.id}>
                {hedgeLabel(h)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={buyer} onValueChange={setBuyer}>
          <SelectTrigger className="w-[190px]">
            <SelectValue placeholder="Comprador" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os compradores</SelectItem>
            {(data?.buyers || []).map((b) => (
              <SelectItem key={b} value={b}>
                {b}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={flow} onValueChange={setFlow}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {FLOW_KEYS.map((k) => (
              <SelectItem key={k} value={k}>
                {FLOW_TITLES[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={supplier} onValueChange={setSupplier}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Fornecedor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os fornecedores</SelectItem>
            {(data?.suppliers || []).map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar nº da compra..."
            className="w-[190px] pl-9"
          />
        </div>

        <Button variant="outline" onClick={handleExport} disabled={!rows.length}>
          <Download className="mr-2 h-4 w-4" /> Excel
        </Button>
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center text-muted-foreground">Carregando...</div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Comprado</CardTitle>
                <Scale className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{num(t?.weightKg || 0, 3)} kg</div>
                <div className="text-xs text-muted-foreground">{t?.count || 0} compras</div>
              </CardContent>
            </Card>
            <MetalCard label="Platina (Pt)" grams={t?.ptG || 0} />
            <MetalCard label="Paládio (Pd)" grams={t?.pdG || 0} />
            <MetalCard label="Ródio (Rh)" grams={t?.rhG || 0} />
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Valor Total Pago</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{brl(t?.totalBrl || 0)}</div>
              </CardContent>
            </Card>
          </div>

          {/* Tabela */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Metal contido bruto por compra</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Compra</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Comprador</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Hedge / Cotações</TableHead>
                    <TableHead className="text-right">Peso (kg)</TableHead>
                    <TableHead className="text-right">Pt</TableHead>
                    <TableHead className="text-right">Pd</TableHead>
                    <TableHead className="text-right">Rh</TableHead>
                    <TableHead className="text-right">Valor Pago</TableHead>
                    <TableHead>Origem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center text-muted-foreground py-8">
                        Nenhuma compra encontrada para os filtros escolhidos.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="whitespace-nowrap">{format(new Date(r.date), "dd/MM/yyyy")}</TableCell>
                        <TableCell className="font-medium whitespace-nowrap">
                          {r.purchaseNumber}
                          {r.location ? <div className="text-xs text-muted-foreground">{r.location}</div> : null}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{r.supplierName}</TableCell>
                        <TableCell className="whitespace-nowrap">{r.buyer || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="whitespace-nowrap">{r.flowLabel}</Badge>
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {r.hedge ? (
                            <>
                              <div className="font-medium">{r.hedge.name}</div>
                              <div className="text-muted-foreground">
                                Pt US$ {num(r.hedge.ptPrice, 2)} / Pd US$ {num(r.hedge.pdPrice, 2)} / Rh US${" "}
                                {num(r.hedge.rhPrice, 2)}
                              </div>
                              <div className="text-muted-foreground">US$ 1 = R$ {num(r.hedge.usdToBrl, 2)}</div>
                            </>
                          ) : (
                            <span className="text-muted-foreground">Sem hedge</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">{num(r.weightKg, 4)}</TableCell>
                        {[r.ptG, r.pdG, r.rhG].map((g, i) => (
                          <TableCell key={i} className="text-right whitespace-nowrap">
                            <div>{num(g, 4)} g</div>
                            <div className="text-xs text-muted-foreground">{num(toOzt(g), 4)} ozt</div>
                          </TableCell>
                        ))}
                        <TableCell className="text-right whitespace-nowrap">{brl(r.totalBrl)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={r.origin === "Pendente" ? "outline" : "secondary"}
                            className="whitespace-nowrap"
                          >
                            {r.origin}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
