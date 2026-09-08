import QRCode from "qrcode";

/**
 * Build a tracking label code for a ceramic lot.
 * Format: LOT-<AAMMDD>-<purchaseNumberSanitized>-<seq 2 digits>
 * Ex: purchase "29/03/2026 - 03", seq 1 -> "LOT-260329-03-01"
 */
function baseCode(purchaseNumber: string, purchaseDateIso: string): string {
  // Purchase number already comes as DDMMYY-NN — use it as-is
  const clean = (purchaseNumber || "").trim();
  const direct = clean.match(/^(\d{6})\s*-\s*(\d+)$/);
  if (direct) return `${direct[1]}-${direct[2].padStart(2, "0")}`;
  // Fallback: build DDMMYY from the purchase date
  const d = new Date(purchaseDateIso);
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const match = clean.match(/-\s*(\d+)\s*$/);
  const suffix = match ? match[1].padStart(2, "0") : clean.replace(/\D+/g, "").slice(-4) || "00";
  return `${dd}${mm}${yy}-${suffix}`;
}

/**
 * Build a tracking label code for a lot.
 * Format: LOT-<DDMMYY>-<NN>-<seq 2 digits>
 * Ex: purchase "020926-05", seq 1 -> "LOT-020926-05-01"
 */
export function buildLabelCode(purchaseNumber: string, purchaseDateIso: string, seq: number): string {
  return `LOT-${baseCode(purchaseNumber, purchaseDateIso)}-${String(seq).padStart(2, "0")}`;
}

/** Display code shown on the printed label (without per-group sequence). */
export function buildLabelCodeDisplay(purchaseNumber: string, purchaseDateIso: string): string {
  return `LOT-${baseCode(purchaseNumber, purchaseDateIso)}`;
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
