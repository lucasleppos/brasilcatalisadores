import {
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
  "Conferência": { short: "Confer.", icon: ClipboardCheck },
  "Moagem": { short: "Moagem", icon: Cog },
  "Laboratorio": { short: "Lab", icon: FlaskConical },
  "Demonstrativo": { short: "Demonstr.", icon: DollarSign },
  "Aprovação": { short: "Aprovação", icon: Stamp },
  "Corte": { short: "Corte", icon: Scissors },
};

export function groupUI(label: string): GroupUI {
  return PROCESS_GROUP_UI[label] || { short: label, icon: ListChecks };
}
