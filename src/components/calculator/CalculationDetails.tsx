import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalculatorResult } from "@/lib/calculator";

const fmt = (n: number, decimals = 4) => n.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
const fmtUsd = (n: number) => `$ ${fmt(n)}`;
const fmtBrl = (n: number) => `R$ ${fmt(n, 2)}`;

function SectionHeader({ title }: { title: string }) {
  return (
    <TableRow className="bg-muted/30">
      <TableCell colSpan={2} className="py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </TableCell>
    </TableRow>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <TableRow>
      <TableCell className={`py-1.5 text-xs ${bold ? "font-semibold" : ""}`}>{label}</TableCell>
      <TableCell className={`py-1.5 text-xs text-right ${bold ? "font-semibold text-primary" : ""}`}>{value}</TableCell>
    </TableRow>
  );
}

export default function CalculationDetails({ result }: { result: CalculatorResult }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">Detalhamento do Cálculo</CardTitle></CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Etapa</TableHead>
              <TableHead className="text-xs text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <SectionHeader title="Conversão de Peso" />
            <Row label="Peso Líquido" value={`${fmt(result.netWeightKg)} kg`} />
            <Row label="Peso Úmido" value={`${fmt(result.wetWeightLb)} lb`} />
            <Row label="Peso Seco" value={`${fmt(result.dryWeightLb)} lb`} />
            <Row label="Peso Seco" value={`${fmt(result.dryWeightG)} g`} />

            <SectionHeader title="Conteúdo de Metal (g)" />
            <Row label="Pt contido" value={`${fmt(result.ptContentG)} g`} />
            <Row label="Pd contido" value={`${fmt(result.pdContentG)} g`} />
            <Row label="Rh contido" value={`${fmt(result.rhContentG)} g`} />

            <SectionHeader title="Metal Pagável (g)" />
            <Row label="Pt pagável" value={`${fmt(result.ptPayableG)} g`} />
            <Row label="Pd pagável" value={`${fmt(result.pdPayableG)} g`} />
            <Row label="Rh pagável" value={`${fmt(result.rhPayableG)} g`} />

            <SectionHeader title="Troy Oz" />
            <Row label="Pt" value={`${fmt(result.ptTroyOz)} ozt`} />
            <Row label="Pd" value={`${fmt(result.pdTroyOz)} ozt`} />
            <Row label="Rh" value={`${fmt(result.rhTroyOz)} ozt`} />

            <SectionHeader title="Valor dos Metais (USD)" />
            <Row label="Pt" value={fmtUsd(result.ptValueUsd)} />
            <Row label="Pd" value={fmtUsd(result.pdValueUsd)} />
            <Row label="Rh" value={fmtUsd(result.rhValueUsd)} />
            <Row label="Total Bruto" value={fmtUsd(result.grossMetalValueUsd)} bold />

            <SectionHeader title="Deduções" />
            <Row label="Treatment" value={`- ${fmtUsd(result.treatmentDeduction)}`} />
            <Row label="Refining Pt" value={`- ${fmtUsd(result.refiningPtDeduction)}`} />
            <Row label="Refining Pd" value={`- ${fmtUsd(result.refiningPdDeduction)}`} />
            <Row label="Refining Rh" value={`- ${fmtUsd(result.refiningRhDeduction)}`} />
            <Row label="Lease Pt" value={`- ${fmtUsd(result.leasePtDeduction)}`} />
            <Row label="Lease Pd" value={`- ${fmtUsd(result.leasePdDeduction)}`} />
            <Row label="Lease Rh" value={`- ${fmtUsd(result.leaseRhDeduction)}`} />
            <Row label="Custo Operacional" value={`- ${fmtUsd(result.operationalDeduction)}`} />
            <Row label="Custo Logístico" value={`- ${fmtUsd(result.logisticDeduction)}`} />
            <Row label="Total Deduções" value={`- ${fmtUsd(result.totalDeductions)}`} bold />

            <SectionHeader title="Resultado" />
            <Row label="Valor Líquido" value={fmtUsd(result.netValueUsd)} />
            <Row label="Margem Fornecedor" value={`- ${fmtUsd(result.clientDiscountValue)}`} />
            <Row label="Valor Final USD" value={fmtUsd(result.finalValueUsd)} bold />
            <Row label="Valor Final BRL" value={fmtBrl(result.finalValueBrl)} bold />
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
