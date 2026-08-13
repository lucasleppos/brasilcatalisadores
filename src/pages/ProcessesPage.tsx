import ProcessBoard from "@/components/processes/ProcessBoard";
import MobileProcessBoard from "@/components/processes/MobileProcessBoard";
import { useIsMobile } from "@/hooks/use-mobile";

export default function ProcessesPage() {
  const isMobile = useIsMobile();
  return isMobile ? <MobileProcessBoard /> : <ProcessBoard />;
}
