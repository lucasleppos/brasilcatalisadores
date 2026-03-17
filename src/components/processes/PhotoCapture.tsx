import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Upload, Loader2, X } from "lucide-react";
import { uploadStagePhoto } from "@/lib/stage-tasks";

interface PhotoCaptureProps {
  purchaseId: string;
  onUploaded: (url: string) => void;
  disabled?: boolean;
}

export default function PhotoCapture({ purchaseId, onUploaded, disabled }: PhotoCaptureProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    setPreview(URL.createObjectURL(file));
    try {
      const url = await uploadStagePhoto(purchaseId, file);
      if (url) {
        onUploaded(url);
        setPreview(null);
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />

      {preview && (
        <div className="relative w-full h-24 rounded-md overflow-hidden border">
          <img src={preview} alt="Preview" className="w-full h-full object-cover" />
          {uploading && (
            <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          )}
          {!uploading && (
            <button onClick={() => setPreview(null)} className="absolute top-1 right-1 bg-background/80 rounded-full p-0.5">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="flex-1 h-8 text-xs"
          disabled={disabled || uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Camera className="h-3 w-3 mr-1" />}
          Tirar Foto
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="flex-1 h-8 text-xs"
          disabled={disabled || uploading}
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/*";
            input.onchange = (e) => {
              const f = (e.target as HTMLInputElement).files?.[0];
              if (f) handleFile(f);
            };
            input.click();
          }}
        >
          <Upload className="h-3 w-3 mr-1" />
          Galeria
        </Button>
      </div>
    </div>
  );
}
