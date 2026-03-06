import { TableHead } from "@/components/ui/table";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import type { SortDirection } from "@/hooks/use-sortable";
import { cn } from "@/lib/utils";

interface SortableTableHeadProps {
  children: React.ReactNode;
  column: string;
  currentColumn: string | null;
  direction: SortDirection;
  onToggle: (column: string) => void;
  className?: string;
}

export function SortableTableHead({
  children,
  column,
  currentColumn,
  direction,
  onToggle,
  className,
}: SortableTableHeadProps) {
  const isActive = currentColumn === column;

  return (
    <TableHead
      className={cn("text-xs cursor-pointer select-none hover:text-foreground transition-colors", className)}
      onClick={() => onToggle(column)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {isActive && direction === "asc" ? (
          <ArrowUp className="h-3 w-3" />
        ) : isActive && direction === "desc" ? (
          <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </span>
    </TableHead>
  );
}
