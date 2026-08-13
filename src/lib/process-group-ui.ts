import {
  Inbox,
  ClipboardCheck,
  FlaskConical,
  DollarSign,
  Stamp,
  Scissors,
  Cog,
  ListChecks,
} from "lucide-react";

type IconType = React.ComponentType<{ className?: string }>;

interface GroupUI {
  short: string;
  icon: IconType;
}

/** Rótulo curto + ícone por grupo de processo (usado na barra inferior mobile). */
export const PROCESS_GROUP_UI: Record<string, GroupUI> = {
  "Inclusão": { short: "Inclusão", icon: Inbox },
  "Conferência": { short: "Conferência", icon: ClipboardCheck },
  "Prep. Amostra / Análise": { short: "Amostra", icon: FlaskConical },
  "Precif. / Demonstrativo": { short: "Precif.", icon: DollarSign },
  "Aprovação": { short: "Aprovação", icon: Stamp },
  "Corte": { short: "Corte", icon: Scissors },
  "Trit. / Homog. / Amostr.": { short: "Trituração", icon: Cog },
};

export function groupUI(label: string): GroupUI {
  return PROCESS_GROUP_UI[label] || { short: label, icon: ListChecks };
}
