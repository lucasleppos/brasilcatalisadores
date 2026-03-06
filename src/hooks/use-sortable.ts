import { useState, useMemo } from "react";

export type SortDirection = "asc" | "desc" | null;

export interface SortState {
  column: string | null;
  direction: SortDirection;
}

export function useSortable<T>(data: T[]) {
  const [sort, setSort] = useState<SortState>({ column: null, direction: null });

  const toggleSort = (column: string) => {
    setSort((prev) => {
      if (prev.column !== column) return { column, direction: "asc" };
      if (prev.direction === "asc") return { column, direction: "desc" };
      return { column: null, direction: null };
    });
  };

  const sorted = useMemo(() => {
    if (!sort.column || !sort.direction) return data;
    const col = sort.column;
    const dir = sort.direction === "asc" ? 1 : -1;

    return [...data].sort((a, b) => {
      const aVal = (a as any)[col];
      const bVal = (b as any)[col];

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      if (typeof aVal === "number" && typeof bVal === "number") {
        return (aVal - bVal) * dir;
      }

      return String(aVal).localeCompare(String(bVal), "pt-BR", { numeric: true }) * dir;
    });
  }, [data, sort]);

  return { sorted, sort, toggleSort };
}
