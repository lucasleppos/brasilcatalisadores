import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect, SearchableOption } from "@/components/ui/searchable-select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { useMemo } from "react";

export type DateFilterPreset = "week" | "month" | "all";
export type MaterialFilter = "all" | "ceramico" | "pecas" | "sacola";

const MATERIAL_OPTIONS: { value: MaterialFilter; label: string }[] = [
  { value: "all", label: "Todos os tipos" },
  { value: "ceramico", label: "Cerâmico" },
  { value: "pecas", label: "Peças" },
  { value: "sacola", label: "Peça em Sacola" },
];

interface ProcessFiltersProps {
  suppliers: string[];
  buyers: string[];
  supplierFilter: string;
  buyerFilter: string;
  materialFilter: MaterialFilter;
  onSupplierChange: (v: string) => void;
  onBuyerChange: (v: string) => void;
  onMaterialChange: (v: MaterialFilter) => void;
  pendingCount: number;
  datePreset: DateFilterPreset;
  onDatePresetChange: (v: DateFilterPreset) => void;
  customRange: DateRange | undefined;
  onCustomRangeChange: (r: DateRange | undefined) => void;
}

export default function ProcessFilters({
  suppliers, buyers, supplierFilter, buyerFilter, materialFilter,
  onSupplierChange, onBuyerChange, onMaterialChange, pendingCount,
  datePreset, onDatePresetChange, customRange, onCustomRangeChange,
}: ProcessFiltersProps) {
  const isCustom = datePreset === "all" && customRange?.from;

  const supplierOptions: SearchableOption[] = useMemo(
    () => [
      { value: "all", label: "Todos os fornecedores" },
      ...suppliers.map((s) => ({ value: s, label: s })),
    ],
    [suppliers]
  );

  const handlePreset = (v: string) => {
    if (v) {
      onDatePresetChange(v as DateFilterPreset);
      onCustomRangeChange(undefined);
    }
  };

  const handleCustomRange = (range: DateRange | undefined) => {
    onCustomRangeChange(range);
    if (range?.from) {
      onDatePresetChange("all");
    }
  };

  return (
    <div className="flex gap-3 flex-wrap items-center">
      <SearchableSelect
        value={supplierFilter}
        onValueChange={onSupplierChange}
        options={supplierOptions}
        placeholder="Fornecedor"
        searchPlaceholder="Buscar fornecedor..."
        emptyText="Nenhum fornecedor encontrado"
        className="w-48 h-8"
      />
      <Select value={buyerFilter} onValueChange={onBuyerChange}>
        <SelectTrigger className="h-8 text-sm w-48"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os compradores</SelectItem>
          {buyers.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={materialFilter} onValueChange={(v) => onMaterialChange(v as MaterialFilter)}>
        <SelectTrigger className="h-8 text-sm w-44"><SelectValue /></SelectTrigger>
        <SelectContent>
          {MATERIAL_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>

      <ToggleGroup type="single" value={isCustom ? "" : datePreset} onValueChange={handlePreset} className="h-8">
        <ToggleGroupItem value="week" className="text-xs h-8 px-3">Semana</ToggleGroupItem>
        <ToggleGroupItem value="month" className="text-xs h-8 px-3">Mês</ToggleGroupItem>
        <ToggleGroupItem value="all" className="text-xs h-8 px-3">Todos</ToggleGroupItem>
      </ToggleGroup>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className={cn("h-8 text-xs gap-1", isCustom && "border-primary text-primary")}>
            <CalendarIcon className="h-3 w-3" />
            {isCustom && customRange?.from
              ? `${format(customRange.from, "dd/MM", { locale: ptBR })} - ${customRange.to ? format(customRange.to, "dd/MM", { locale: ptBR }) : "..."}`
              : "Período"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={customRange}
            onSelect={handleCustomRange}
            numberOfMonths={2}
            locale={ptBR}
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>

      <Badge variant="secondary" className="text-xs h-8 flex items-center">
        {pendingCount} tarefa{pendingCount !== 1 ? "s" : ""} pendente{pendingCount !== 1 ? "s" : ""}
      </Badge>
    </div>
  );
}
