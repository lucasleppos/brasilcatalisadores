import { Image as ImageIcon } from "lucide-react";
import { useStagePhotoUrl, openStagePhoto } from "@/lib/stage-photos";
import { cn } from "@/lib/utils";

interface StagePhotoThumbProps {
  /** Caminho no bucket (ou URL legada) */
  value: string;
  className?: string;
  clickable?: boolean;
}

export function StagePhotoThumb({ value, className, clickable = true }: StagePhotoThumbProps) {
  const url = useStagePhotoUrl(value);

  if (!url) {
    return (
      <div className={cn("rounded border bg-muted flex items-center justify-center", className)}>
        <ImageIcon className="h-4 w-4 text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      src={url}
      alt="Foto do lote"
      className={cn("rounded border object-cover", clickable && "cursor-pointer", className)}
      onClick={clickable ? () => openStagePhoto(value) : undefined}
    />
  );
}
