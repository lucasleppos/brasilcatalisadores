import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface MobileListRowProps {
  /** Selo à esquerda (ex.: PC / SA / CE) */
  badge?: string;
  badgeClassName?: string;
  title: string;
  subtitle?: React.ReactNode;
  detail?: React.ReactNode;
  /** Carimbo à direita (ex.: tempo na etapa) */
  stamp?: string;
  alert?: boolean;
  onClick?: () => void;
}

export function MobileListRow({
  badge,
  badgeClassName,
  title,
  subtitle,
  detail,
  stamp,
  alert,
  onClick,
}: MobileListRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-start gap-3 px-4 py-3 text-left active:bg-muted/60 transition-colors"
    >
      {badge && (
        <span
          className={cn(
            "shrink-0 h-11 w-11 rounded-full flex items-center justify-center text-xs font-semibold bg-secondary text-secondary-foreground",
            badgeClassName
          )}
        >
          {badge}
        </span>
      )}
      <span className="flex-1 min-w-0">
        <span className="flex items-baseline gap-2">
          <span className="flex-1 truncate font-medium text-[15px] leading-tight">{title}</span>
          {stamp && <span className="shrink-0 text-xs text-muted-foreground">{stamp}</span>}
        </span>
        {subtitle && (
          <span className="mt-0.5 flex items-center gap-1 text-[13px] text-muted-foreground truncate">
            {subtitle}
            {alert && <span className="text-destructive">⚠</span>}
          </span>
        )}
        {detail && (
          <span className="mt-0.5 block text-[13px] text-muted-foreground truncate">{detail}</span>
        )}
      </span>
      <ChevronRight className="h-4 w-4 text-muted-foreground/60 shrink-0 mt-3" />
    </button>
  );
}

export function MobileListDivider() {
  return <div className="ml-[4.25rem] border-b border-border/70" />;
}
