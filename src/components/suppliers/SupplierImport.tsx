import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Upload, FileSpreadsheet } from "lucide-react";
import { Supplier } from "@/lib/suppliers";
import * as XLSX from "xlsx";

interface SupplierImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (rows: Omit<Supplier, "id" | "createdAt">[]) => void;
}

const FIELDS = [
  { key: "name", label: "Nome" },
  { key: "document", label: "CNPJ/CPF" },
  { key: "email", label: "E-mail" },
  { key: "branch", label: "Filial" },
  { key: "buyer", label: "Comprador" },
  { key: "margin", label: "Margem (%)" },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];

export default function SupplierImport({ open, onOpenChange, onImport }: SupplierImportProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<FieldKey, string>>({
    name: "", document: "", email: "", branch: "", buyer: "", margin: "",
  });

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

      // Auto-map by header name similarity
      const h = data[0].map((c) => String(c).toLowerCase().trim());
      const autoMap: Record<FieldKey, string> = { name: "", document: "", email: "", branch: "", buyer: "", margin: "" };
      const patterns: Record<FieldKey, string[]> = {
        name: ["nome", "name", "razão", "razao"],
        document: ["cnpj", "cpf", "documento", "document"],
        email: ["email", "e-mail", "mail"],
        branch: ["filial", "branch", "unidade"],
        buyer: ["comprador", "buyer"],
        margin: ["margem", "margin", "%"],
      };
      for (const field of FIELDS) {
        const idx = h.findIndex((col) => patterns[field.key].some((p) => col.includes(p)));
        if (idx >= 0) autoMap[field.key] = data[0][idx];
      }
      setMapping(autoMap);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirm = () => {
    const result: Omit<Supplier, "id" | "createdAt">[] = rows.map((row) => {
      const colIdx = (key: FieldKey) => headers.indexOf(mapping[key]);
      return {
        name: String(row[colIdx("name")] ?? "").trim(),
        document: String(row[colIdx("document")] ?? "").trim(),
        email: String(row[colIdx("email")] ?? "").trim(),
        branch: String(row[colIdx("branch")] ?? "").trim(),
        buyer: String(row[colIdx("buyer")] ?? "").trim(),
        margin: parseFloat(String(row[colIdx("margin")] ?? "15")) || 15,
      };
    }).filter((r) => r.name);
    onImport(result);
    onOpenChange(false);
    setHeaders([]);
    setRows([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />Importar Fornecedores (Excel)
          </DialogTitle>
        </DialogHeader>

        {headers.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <Upload className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Selecione um arquivo .xlsx para importar</p>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
            <Button onClick={() => fileRef.current?.click()}>Escolher Arquivo</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {FIELDS.map((f) => (
                <div key={f.key} className="space-y-1">
                  <Label className="text-xs">{f.label}</Label>
                  <Select value={mapping[f.key]} onValueChange={(v) => setMapping((m) => ({ ...m, [f.key]: v }))}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecionar coluna" /></SelectTrigger>
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
            <Button onClick={handleConfirm} disabled={!mapping.name}>Importar {rows.length} registros</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
