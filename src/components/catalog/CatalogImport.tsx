import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Upload, FileSpreadsheet } from "lucide-react";
import { CatalogGroup, CatalogPart, loadGroups, bulkImportParts } from "@/lib/catalog";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface CatalogImportProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onImported: () => void;
}

const FIELDS = [
  { key: "brand", label: "Marca" },
  { key: "vehicle", label: "Carro" },
  { key: "code", label: "Código" },
  { key: "reference", label: "Referência" },
  { key: "weight", label: "Peso (kg)" },
  { key: "pt_ppm", label: "Pt (ppm)" },
  { key: "pd_ppm", label: "Pd (ppm)" },
  { key: "rh_ppm", label: "Rh (ppm)" },
  { key: "group", label: "Grupo" },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];

export default function CatalogImport({ open, onOpenChange, onImported }: CatalogImportProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<FieldKey, string>>({
    brand: "", vehicle: "", code: "", reference: "", weight: "", pt_ppm: "", pd_ppm: "", rh_ppm: "", group: "",
  });
  const [groups, setGroups] = useState<CatalogGroup[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) loadGroups().then(setGroups);
  }, [open]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target?.result, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
      if (data.length < 2) return;
      setHeaders(data[0].map(String));
      setRows(data.slice(1).filter((r) => r.some((c) => c != null && c !== "")));

      // Auto-map
      const h = data[0].map((c) => String(c).toLowerCase().trim());
      const autoMap: Record<FieldKey, string> = { brand: "", vehicle: "", code: "", reference: "", weight: "", pt_ppm: "", pd_ppm: "", rh_ppm: "", group: "" };
      const patterns: Record<FieldKey, string[]> = {
        brand: ["marca", "brand"],
        vehicle: ["carro", "vehicle", "veiculo", "veículo"],
        code: ["codigo", "código", "code"],
        reference: ["referencia", "referência", "ref"],
        weight: ["peso", "weight", "kg"],
        pt_ppm: ["pt", "platina"],
        pd_ppm: ["pd", "paladio", "paládio"],
        rh_ppm: ["rh", "rodio", "ródio"],
        group: ["grupo", "group"],
      };
      for (const field of FIELDS) {
        const idx = h.findIndex((col) => patterns[field.key].some((p) => col.includes(p)));
        if (idx >= 0) autoMap[field.key] = data[0][idx];
      }
      setMapping(autoMap);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const colIdx = (key: FieldKey) => headers.indexOf(mapping[key]);

      // Build group name → id map
      const groupMap: Record<string, string> = {};
      groups.forEach(g => { groupMap[g.name.toLowerCase().trim()] = g.id; });

      const parts: Omit<CatalogPart, "id" | "createdAt" | "groupName" | "groupMargin">[] = rows.map((row) => {
        const groupName = String(row[colIdx("group")] ?? "").trim();
        const groupId = groupMap[groupName.toLowerCase()] || null;
        return {
          brand: String(row[colIdx("brand")] ?? "").trim(),
          vehicle: String(row[colIdx("vehicle")] ?? "").trim(),
          code: String(row[colIdx("code")] ?? "").trim(),
          reference: String(row[colIdx("reference")] ?? "").trim(),
          weight: parseFloat(String(row[colIdx("weight")] ?? "0").replace(",", ".")) || 0,
          ptPpm: parseFloat(String(row[colIdx("pt_ppm")] ?? "0").replace(",", ".")) || 0,
          pdPpm: parseFloat(String(row[colIdx("pd_ppm")] ?? "0").replace(",", ".")) || 0,
          rhPpm: parseFloat(String(row[colIdx("rh_ppm")] ?? "0").replace(",", ".")) || 0,
          groupId,
        };
      }).filter((p) => p.code || p.reference || p.brand);

      const count = await bulkImportParts(parts);
      toast.success(`${count} peças importadas com sucesso`);
      onImported();
      onOpenChange(false);
      setHeaders([]);
      setRows([]);
    } catch {
      toast.error("Erro na importação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />Importar Peças (Excel)
          </DialogTitle>
        </DialogHeader>

        {headers.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <Upload className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Selecione um arquivo .xlsx com as colunas: marca, carro, código, referência, peso, pt, pd, rh, grupo</p>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
            <Button onClick={() => fileRef.current?.click()}>Escolher Arquivo</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {FIELDS.map((f) => (
                <div key={f.key} className="space-y-1">
                  <Label className="text-xs">{f.label}</Label>
                  <Select value={mapping[f.key]} onValueChange={(v) => setMapping((m) => ({ ...m, [f.key]: v }))}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Coluna" /></SelectTrigger>
                    <SelectContent>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <div className="text-xs text-muted-foreground">Preview ({rows.length} linhas)</div>
            <div className="max-h-48 overflow-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    {headers.map((h) => (
                      <TableHead key={h} className="text-xs whitespace-nowrap">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 5).map((row, i) => (
                    <TableRow key={i}>
                      {headers.map((_, j) => (
                        <TableCell key={j} className="text-xs py-1">{String(row[j] ?? "")}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {headers.length > 0 && (
          <DialogFooter>
            <Button variant="outline" onClick={() => { setHeaders([]); setRows([]); }}>Voltar</Button>
            <Button onClick={handleConfirm} disabled={loading || !mapping.code}>
              {loading ? "Importando..." : `Importar ${rows.length} peças`}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
