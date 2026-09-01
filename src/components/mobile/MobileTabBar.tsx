import { cn } from "@/lib/utils";

export interface MobileTab {
  key: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  count?: number;
}

interface MobileTabBarProps {
  tabs: MobileTab[];
  active: string;
  onChange: (key: string) => void;
}

export function MobileTabBar({ tabs, active, onChange }: MobileTabBarProps) {
  if (tabs.length <= 1) return null;
  return (
    <nav className="shrink-0 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_hsl(var(--foreground)/0.06)]">
      <div className="flex min-h-20 px-1">
        {tabs.map((tab) => {
          const isActive = tab.key === active;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-3 transition-[color,transform] active:scale-95 motion-reduce:transition-none",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <span className="relative">
                {Icon && <Icon className="h-[26px] w-[26px]" />}
                {!!tab.count && (
                  <span className="absolute -top-1.5 -right-3 min-w-[1rem] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] leading-4 text-center">
                    {tab.count}
                  </span>
                )}
              </span>
              <span className="max-w-full truncate text-center text-[11px] font-medium leading-tight">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
