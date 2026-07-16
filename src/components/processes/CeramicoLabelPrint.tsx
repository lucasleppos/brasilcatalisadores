import { useEffect, useState } from "react";
import { buildLabelUrl, generateQRCodeDataUrl } from "@/lib/labels";
import { fmtNum } from "@/lib/utils";

export interface LabelData {
  /** Unique internal code (used as QR target + React key) */
  code: string;
  /** Code displayed on the label header (without seq suffix) */
  displayCode?: string;
  buyer: string;
  supplierName: string;
  group: string;
  weightNet: number;
}

interface Props {
  labels: LabelData[];
}

/**
 * Thermal label sheet — 100 x 50 mm, 1 label per page.
 * Uses @page rules and @media print to strip browser chrome for direct thermal printing.
 * Render in a hidden container and call window.print() from the caller.
 */
export default function CeramicoLabelPrint({ labels }: Props) {
  const [qrs, setQrs] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const entries = await Promise.all(
        labels.map(async (l) => [l.code, await generateQRCodeDataUrl(buildLabelUrl(l.code), 260)] as const),
      );
      setQrs(Object.fromEntries(entries));
    })();
  }, [labels]);

  return (
    <div className="ceramico-label-print">
      <style>{`
        @media print {
          @page { size: 100mm 50mm; margin: 0; }
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
          body * { visibility: hidden !important; }
          .ceramico-label-print, .ceramico-label-print * { visibility: visible !important; }
          .ceramico-label-print { position: absolute; left: 0; top: 0; width: 100mm; }
          .ceramico-label { page-break-after: always; break-after: page; }
          .ceramico-label:last-child { page-break-after: auto; break-after: auto; }
        }
        .ceramico-label {
          width: 100mm;
          height: 50mm;
          box-sizing: border-box;
          padding: 2.5mm 3mm;
          color: #000;
          background: #fff;
          font-family: Arial, Helvetica, sans-serif;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 30mm;
          gap: 2.5mm;
          align-items: stretch;
        }
        .ceramico-label .info { display: flex; flex-direction: column; justify-content: space-between; min-width: 0; overflow: hidden; }
        .ceramico-label .lote {
          font-size: 13pt; font-weight: 900; letter-spacing: 0.1px;
          line-height: 1.05; border-bottom: 0.4mm solid #000; padding-bottom: 1mm; margin-bottom: 1mm;
          white-space: nowrap; overflow: hidden; text-overflow: clip;
        }
        .ceramico-label .row { font-size: 11pt; font-weight: 700; line-height: 1.3; margin: 0.4mm 0; }
        .ceramico-label .row .lbl { font-weight: 700; }
        .ceramico-label .row .val { font-weight: 800; }
        .ceramico-label .weights { font-size: 15pt; font-weight: 900; margin-top: 1mm; }
        .ceramico-label .qr { display: flex; align-items: center; justify-content: center; }
        .ceramico-label .qr img { width: 30mm; height: 30mm; }
      `}</style>

      {labels.map((l, idx) => (
        <div key={`${l.code}-${idx}`} className="ceramico-label">
          <div className="info">
            <div className="lote">{l.displayCode || l.code}</div>
            <div className="row"><span className="lbl">Comprador: </span><span className="val">{l.buyer || "—"}</span></div>
            <div className="row"><span className="lbl">Fornecedor: </span><span className="val">{l.supplierName}</span></div>
            <div className="row"><span className="lbl">Grupo: </span><span className="val">{l.group}</span></div>
            <div className="weights">Peso Líq.: {fmtNum(l.weightNet, 3)} kg</div>
          </div>
          <div className="qr">
            {qrs[l.code] ? <img src={qrs[l.code]} alt={l.code} /> : <div style={{ width: "30mm", height: "30mm" }} />}
          </div>
        </div>
      ))}
    </div>
  );
}
