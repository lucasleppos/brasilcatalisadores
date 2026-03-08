import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ProcessFiltersProps {
  suppliers: string[];
  buyers: string[];
  supplierFilter: string;
  buyerFilter: string;
  onSupplierChange: (v: string) => void;
  onBuyerChange: (v: string) => void;
  pendingCount: number;
}

export default function ProcessFilters({
  suppliers, buyers, supplierFilter, buyerFilter,
  onSupplierChange, onBuyerChange, pendingCount,
}: ProcessFiltersProps) {
  return (
    <div className="flex gap-3 flex-wrap">
      <Select value={supplierFilter} onValueChange={onSupplierChange}>
        <SelectTrigger className="h-8 text-sm w-48"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os fornecedores</SelectItem>
          {suppliers.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={buyerFilter} onValueChange={onBuyerChange}>
        <SelectTrigger className="h-8 text-sm w-48"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os compradores</SelectItem>
          {buyers.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
        </SelectContent>
      </Select>
      <Badge variant="secondary" className="text-xs h-8 flex items-center">
        {pendingCount} tarefa{pendingCount !== 1 ? "s" : ""} pendente{pendingCount !== 1 ? "s" : ""}
      </Badge>
    </div>
  );
}
