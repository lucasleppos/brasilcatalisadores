import QRCode from "qrcode";

/**
 * Build a tracking label code for a ceramic lot.
 * Format: LOT-<AAMMDD>-<purchaseNumberSanitized>-<seq 2 digits>
 * Ex: purchase "29/03/2026 - 03", seq 1 -> "LOT-260329-03-01"
 */
export function buildLabelCode(purchaseNumber: string, purchaseDateIso: string, seq: number): string {
  const d = new Date(purchaseDateIso);
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  // Extract the daily counter (last "- NN" part) if present, else sanitize the whole number
  const match = purchaseNumber.match(/-\s*(\d+)\s*$/);
  const suffix = match ? match[1].padStart(2, "0") : purchaseNumber.replace(/\D+/g, "").slice(-4) || "00";
  const seqStr = String(seq).padStart(2, "0");
  return `LOT-${yy}${mm}${dd}-${suffix}-${seqStr}`;
}

/** Returns a data-URL PNG for the given code. Suitable for embedding in <img>. */
export async function generateQRCodeDataUrl(text: string, sizePx = 220): Promise<string> {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: sizePx,
    color: { dark: "#000000", light: "#ffffff" },
  });
}

/** Full URL used inside the QR code, pointing to the internal process view. */
export function buildLabelUrl(code: string): string {
  if (typeof window === "undefined") return code;
  return `${window.location.origin}/processos?lote=${encodeURIComponent(code)}`;
}
