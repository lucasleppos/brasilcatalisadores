import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

export type DateFilterPreset = "week" | "month" | "all";

interface ProcessFiltersProps {
  suppliers: string[];
  buyers: string[];
  supplierFilter: string;
  buyerFilter: string;
  onSupplierChange: (v: string) => void;
  onBuyerChange: (v: string) => void;
  pendingCount: number;
  datePreset: DateFilterPreset;
  onDatePresetChange: (v: DateFilterPreset) => void;
  customRange: DateRange | undefined;
  onCustomRangeChange: (r: DateRange | undefined) => void;
}

export default function ProcessFilters({
  suppliers, buyers, supplierFilter, buyerFilter,
  onSupplierChange, onBuyerChange, pendingCount,
  datePreset, onDatePresetChange, customRange, onCustomRangeChange,
}: ProcessFiltersProps) {
  const isCustom = datePreset === "all" && customRange?.from;

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
