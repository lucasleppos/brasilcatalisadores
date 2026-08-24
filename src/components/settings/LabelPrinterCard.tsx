import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Bluetooth, Printer, Unplug, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  connectPrinter,
  disconnectPrinter,
  getConnectedPrinterName,
  isBluetoothSupported,
  loadPrinterPrefs,
  savePrinterPrefs,
  sendRaw,
  type PrinterLanguage,
  type PrinterPrefs,
} from "@/lib/thermal-printer";
import { TEST_LABEL, buildEscPos, buildTspl } from "@/lib/label-tspl";

export default function LabelPrinterCard() {
  const [prefs, setPrefs] = useState<PrinterPrefs>(() => loadPrinterPrefs());
  const [connected, setConnected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const supported = isBluetoothSupported();

  useEffect(() => { setConnected(getConnectedPrinterName()); }, []);

  const update = (patch: Partial<PrinterPrefs>) => setPrefs(savePrinterPrefs(patch));

  const handleConnect = async () => {
    setBusy(true);
    try {
      const name = await connectPrinter();
      setConnected(name);
      setPrefs(loadPrinterPrefs());
      toast.success(`Impressora conectada: ${name}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao conectar";
      if (!/cancel|User cancelled/i.test(msg)) toast.error(msg);
    } finally { setBusy(false); }
  };

  const handleTest = async () => {
    setBusy(true);
    try {
      const bytes =
        prefs.language === "escpos"
          ? buildEscPos(TEST_LABEL)
          : buildTspl(TEST_LABEL, {
              direction: prefs.direction,
              marginX: prefs.marginX,
              marginY: prefs.marginY,
              copies: prefs.copies,
            });
      await sendRaw(bytes);
      setConnected(getConnectedPrinterName());
      toast.success("Etiqueta de teste enviada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao imprimir teste");
    } finally { setBusy(false); }
  };

  const handleDisconnect = () => {
    disconnectPrinter();
    setConnected(null);
    toast.info("Impressora desconectada");
  };

  return (
    <Card className="md:col-span-2">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Printer className="h-4 w-4" />
          Impressora de etiquetas (Bluetooth)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <Label className="text-xs">Imprimir direto por Bluetooth</Label>
            <p className="text-[11px] text-muted-foreground">
              Desligado, as etiquetas usam o diálogo de impressão do navegador.
            </p>
          </div>
          <Switch checked={prefs.enabled} onCheckedChange={(v) => update({ enabled: v })} />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Linguagem da impressora</Label>
          <div className="flex gap-2">
            {(["tspl", "escpos"] as PrinterLanguage[]).map((lang) => (
              <Button
                key={lang}
                size="sm"
                variant={prefs.language === lang ? "default" : "outline"}
                onClick={() => update({ language: lang })}
              >
                {lang === "tspl" ? "TSPL (padrão)" : "ESC/POS"}
              </Button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Coibeu normalmente usa TSPL. Se a etiqueta de teste sair errada, troque para ESC/POS.
          </p>
        </div>

        {prefs.language === "tspl" && (
          <div className="space-y-2">
            <Label className="text-xs">Calibração da etiqueta 100x50 mm</Label>
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Direção</Label>
                <div className="flex gap-1">
                  {([1, 0] as const).map((d) => (
                    <Button
                      key={d}
                      size="sm"
                      variant={prefs.direction === d ? "default" : "outline"}
                      onClick={() => update({ direction: d })}
                    >
                      {d}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Margem X (dots)</Label>
                <Input
                  className="h-8 w-24"
                  inputMode="numeric"
                  value={String(prefs.marginX)}
                  onChange={(e) => update({ marginX: Math.max(0, parseInt(e.target.value.replace(/\D/g, "") || "0", 10)) })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Margem Y (dots)</Label>
                <Input
                  className="h-8 w-24"
                  inputMode="numeric"
                  value={String(prefs.marginY)}
                  onChange={(e) => update({ marginY: Math.max(0, parseInt(e.target.value.replace(/\D/g, "") || "0", 10)) })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Cópias</Label>
                <Input
                  className="h-8 w-20"
                  inputMode="numeric"
                  value={String(prefs.copies)}
                  onChange={(e) => update({ copies: Math.max(1, parseInt(e.target.value.replace(/\D/g, "") || "1", 10)) })}
                />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              203 dpi: 8 dots ≈ 1 mm. Use a etiqueta de teste para ajustar antes de imprimir em produção.
            </p>
          </div>
        )}



        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            {connected ? `Conectada: ${connected}` : prefs.deviceName ? `Última: ${prefs.deviceName}` : "Nenhuma impressora"}
          </Badge>
          <Button size="sm" variant="outline" disabled={!supported || busy} onClick={handleConnect}>
            {busy ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Bluetooth className="h-3 w-3 mr-1" />}
            {connected ? "Trocar impressora" : "Parear impressora"}
          </Button>
          <Button size="sm" variant="outline" disabled={!supported || busy} onClick={handleTest}>
            <Printer className="h-3 w-3 mr-1" />Etiqueta de teste
          </Button>
          {connected && (
            <Button size="sm" variant="ghost" onClick={handleDisconnect}>
              <Unplug className="h-3 w-3 mr-1" />Desconectar
            </Button>
          )}
        </div>

        {!supported && (
          <p className="text-[11px] text-destructive">
            Este navegador não suporta Bluetooth. Use o Chrome no Android ou no computador — no iPhone as etiquetas
            saem pelo diálogo de impressão.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
