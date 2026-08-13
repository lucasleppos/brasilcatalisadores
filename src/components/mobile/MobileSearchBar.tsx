import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface MobileSearchBarProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  right?: React.ReactNode;
}

/** Busca arredondada estilo iOS, para o topo das listas mobile. */
export function MobileSearchBar({ value, onChange, placeholder, right }: MobileSearchBarProps) {
  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur px-4 py-2 flex items-center gap-2 border-b border-border/60">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || "Buscar…"}
          className="pl-9 h-10 rounded-full bg-muted/60 border-0"
        />
      </div>
      {right}
    </div>
  );
}
