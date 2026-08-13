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
    <nav className="shrink-0 border-t border-border bg-card pb-[env(safe-area-inset-bottom)]">
      <div className="flex overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab.key === active;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              className={cn(
                "flex-1 min-w-[4.5rem] flex flex-col items-center gap-0.5 py-2 px-1 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <span className="relative">
                {Icon && <Icon className="h-5 w-5" />}
                {!!tab.count && (
                  <span className="absolute -top-1.5 -right-3 min-w-[1rem] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] leading-4 text-center">
                    {tab.count}
                  </span>
                )}
              </span>
              <span className="text-[10px] leading-tight text-center truncate max-w-[5.5rem]">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
