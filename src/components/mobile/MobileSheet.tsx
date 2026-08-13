import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

interface MobileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/** Tela cheia que sobe de baixo, com cabeçalho fixo e rodapé de ação opcional. */
export function MobileSheet({ open, onOpenChange, title, subtitle, children, footer }: MobileSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[100dvh] max-h-[100dvh] p-0 gap-0 flex flex-col rounded-t-2xl border-0 [&>button]:hidden"
      >
        <header className="shrink-0 flex items-center gap-1 border-b border-border bg-card px-2 py-2 pt-[env(safe-area-inset-top)]">
          <Button variant="ghost" size="sm" className="px-2" onClick={() => onOpenChange(false)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <p className="font-medium text-[15px] truncate">{title}</p>
            {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
          </div>
        </header>
        <div className="flex-1 overflow-y-auto overscroll-contain p-3">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-border bg-card p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
