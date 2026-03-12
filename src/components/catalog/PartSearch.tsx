import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { CatalogPart, searchParts } from "@/lib/catalog";

interface PartSearchProps {
  onSelect: (part: CatalogPart) => void;
}

export default function PartSearch({ onSelect }: PartSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogPart[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const r = await searchParts(query.trim());
      setResults(r);
      setOpen(true);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (part: CatalogPart) => {
    onSelect(part);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Buscar peça por código, ref, marca ou carro..."
          className="h-8 text-sm pl-7"
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-52 overflow-auto">
          {results.map(part => (
            <button
              key={part.id}
              className="w-full text-left px-3 py-2 hover:bg-accent text-xs space-y-0.5 border-b last:border-b-0"
              onClick={() => handleSelect(part)}
            >
              <div className="flex justify-between items-center">
                <span className="font-medium">{part.code || part.reference}</span>
                {part.groupName && (
                  <Badge variant="outline" className="text-[10px]">{part.groupName} ({part.groupMargin}%)</Badge>
                )}
              </div>
              <div className="text-muted-foreground">
                {part.brand} {part.vehicle} — {part.weight} kg | Pt:{part.ptPpm} Pd:{part.pdPpm} Rh:{part.rhPpm}
              </div>
            </button>
          ))}
        </div>
      )}
      {open && query.trim() && results.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md p-3 text-xs text-muted-foreground text-center">
          Nenhuma peça encontrada
        </div>
      )}
    </div>
  );
}
