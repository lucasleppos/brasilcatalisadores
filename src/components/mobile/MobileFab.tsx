import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileFabProps {
  onClick: () => void;
  label: string;
  className?: string;
}

/** Botão de ação circular flutuante acima da barra de abas. */
export function MobileFab({ onClick, label, className }: MobileFabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 h-14 w-14 rounded-full",
        "bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition-transform",
        className
      )}
    >
      <Plus className="h-6 w-6" />
    </button>
  );
}
