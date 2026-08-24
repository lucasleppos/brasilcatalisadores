/**
 * Web Bluetooth support for thermal label printers (Coibeu / TSPL-compatible).
 *
 * Keeps a single connected device per session. All label printing goes through
 * `sendToPrinter`; when Bluetooth is unavailable the caller falls back to the
 * browser print dialog.
 */

export type PrinterLanguage = "tspl" | "escpos";

const PREF_KEY = "label-printer-prefs";

export interface PrinterPrefs {
  /** When false the app always uses the browser print dialog. */
  enabled: boolean;
  language: PrinterLanguage;
  /** Last paired device name (informational only — BLE requires user gesture to re-pair). */
  deviceName?: string;
}

const defaultPrefs: PrinterPrefs = { enabled: true, language: "tspl" };

export function loadPrinterPrefs(): PrinterPrefs {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (!raw) return { ...defaultPrefs };
    return { ...defaultPrefs, ...(JSON.parse(raw) as Partial<PrinterPrefs>) };
  } catch {
    return { ...defaultPrefs };
  }
}

export function savePrinterPrefs(prefs: Partial<PrinterPrefs>): PrinterPrefs {
  const next = { ...loadPrinterPrefs(), ...prefs };
  try { localStorage.setItem(PREF_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  return next;
}

/** Serial-over-BLE services commonly exposed by thermal label printers. */
const SERVICE_UUIDS = [
  "000018f0-0000-1000-8000-00805f9b34fb", // generic printer serial (Coibeu / Elgin / Xprinter)
  "0000ff00-0000-1000-8000-00805f9b34fb",
  "0000ffe0-0000-1000-8000-00805f9b34fb",
  "49535343-fe7d-4ae5-8fa9-9fafd205e455", // Microchip transparent UART
  "6e400001-b5a3-f393-e0a9-e50e24dcca9e", // Nordic UART
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
];

type BleDevice = { name?: string | null; gatt?: unknown; addEventListener: (t: string, cb: () => void) => void };

let device: BleDevice | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let characteristic: any = null;

export function isBluetoothSupported(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return typeof navigator !== "undefined" && !!(navigator as any).bluetooth;
}

export function getConnectedPrinterName(): string | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gatt = (device as any)?.gatt;
  return device && gatt?.connected ? device.name || "Impressora" : null;
}

export function isPrinterConnected(): boolean {
  return !!characteristic && !!getConnectedPrinterName();
}

export function disconnectPrinter(): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (device as any)?.gatt?.disconnect();
  } catch { /* ignore */ }
  device = null;
  characteristic = null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function findWritableCharacteristic(server: any) {
  const services = await server.getPrimaryServices();
  for (const service of services) {
    let chars: unknown[] = [];
    try { chars = await service.getCharacteristics(); } catch { continue; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const writable = (chars as any[]).find(c => c.properties?.write || c.properties?.writeWithoutResponse);
    if (writable) return writable;
  }
  return null;
}

/** Opens the browser device chooser and connects to the selected printer. */
export async function connectPrinter(): Promise<string> {
  if (!isBluetoothSupported()) throw new Error("Este navegador não suporta Bluetooth (use Chrome no Android ou no computador).");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bluetooth = (navigator as any).bluetooth;
  const dev = await bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: SERVICE_UUIDS });
  const server = await dev.gatt.connect();
  const char = await findWritableCharacteristic(server);
  if (!char) {
    try { dev.gatt.disconnect(); } catch { /* ignore */ }
    throw new Error("A impressora não expôs um canal de escrita compatível.");
  }

  device = dev;
  characteristic = char;
  dev.addEventListener("gattserverdisconnected", () => { characteristic = null; });
  savePrinterPrefs({ deviceName: dev.name || undefined });
  return dev.name || "Impressora";
}

/** Reconnects to the already paired device (no user gesture needed after pairing). */
async function ensureConnected(): Promise<void> {
  if (isPrinterConnected()) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gatt = (device as any)?.gatt;
  if (gatt) {
    const server = await gatt.connect();
    characteristic = await findWritableCharacteristic(server);
    if (characteristic) return;
  }
  await connectPrinter();
}

const CHUNK = 180;
const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

/** Writes raw bytes in MTU-sized chunks. */
export async function sendRaw(bytes: Uint8Array): Promise<void> {
  await ensureConnected();
  if (!characteristic) throw new Error("Impressora não conectada.");
  const writeFn = characteristic.properties?.write
    ? characteristic.writeValue.bind(characteristic)
    : characteristic.writeValueWithoutResponse.bind(characteristic);

  for (let i = 0; i < bytes.length; i += CHUNK) {
    await writeFn(bytes.slice(i, i + CHUNK));
    await wait(20);
  }
}

/**
 * Sends already-built printer payloads. Returns false when Bluetooth printing
 * is disabled or unsupported, so the caller can use the HTML fallback.
 */
export async function sendToPrinter(payloads: Uint8Array[]): Promise<boolean> {
  const prefs = loadPrinterPrefs();
  if (!prefs.enabled || !isBluetoothSupported()) return false;
  for (const payload of payloads) {
    await sendRaw(payload);
    await wait(120);
  }
  return true;
}
