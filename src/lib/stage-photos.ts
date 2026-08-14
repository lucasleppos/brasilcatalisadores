import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "stage-photos";
const EXPIRES_IN = 60 * 60; // 1h

/** Aceita tanto o caminho puro quanto URLs públicas legadas do bucket. */
export function toStagePhotoPath(value: string): string {
  if (!value) return "";
  const marker = `/${BUCKET}/`;
  const idx = value.indexOf(marker);
  if (idx >= 0) return value.slice(idx + marker.length).split("?")[0];
  return value.replace(/^\/+/, "");
}

/** Gera uma URL temporária assinada (bucket privado). */
export async function getStagePhotoUrl(value: string): Promise<string | null> {
  const path = toStagePhotoPath(value);
  if (!path) return null;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, EXPIRES_IN);
  return data?.signedUrl ?? null;
}

export async function openStagePhoto(value: string) {
  const url = await getStagePhotoUrl(value);
  if (url) window.open(url, "_blank", "noopener,noreferrer");
}

/** Hook para exibir a foto (assina a URL sob demanda). */
export function useStagePhotoUrl(value: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!value) {
      setUrl(null);
      return;
    }
    getStagePhotoUrl(value).then((signed) => {
      if (active) setUrl(signed);
    });
    return () => {
      active = false;
    };
  }, [value]);

  return url;
}
