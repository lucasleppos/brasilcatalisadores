import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function lastMonths(n: number) {
  const out: { key: string; label: string }[] = [];
  const d = new Date();
  d.setDate(1);
  for (let i = 0; i < n; i++) {
    out.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: `${MONTHS[d.getMonth()]}/${d.getFullYear()}` });
    d.setMonth(d.getMonth() - 1);
  }
  return out;
}

/** Seletor de mês: mês corrente por padrão; meses anteriores ficam em stand-by até serem escolhidos. */
export function MonthSelect({ value, onChange, className }: { value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className ?? "w-[170px]"}><SelectValue /></SelectTrigger>
      <SelectContent>
        {lastMonths(12).map(m => <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>)}
        <SelectItem value="all">Todas as compras</SelectItem>
      </SelectContent>
    </Select>
  );
}
