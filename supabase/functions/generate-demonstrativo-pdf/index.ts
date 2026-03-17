import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import { jsPDF } from "https://esm.sh/jspdf@2.5.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function fmtBrl(n: number) {
  return `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmt(n: number, d = 2) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { purchaseId, demonstrativoId } = await req.json();
    if (!purchaseId || !demonstrativoId) {
      return new Response(JSON.stringify({ error: "purchaseId and demonstrativoId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    // Fetch all data in parallel
    const [purchaseRes, demoRes, itemsRes, labRes, settingsRes] = await Promise.all([
      sb.from("purchases").select("*").eq("id", purchaseId).single(),
      sb.from("demonstrativos").select("*").eq("id", demonstrativoId).single(),
      sb.from("purchase_items").select("*").eq("purchase_id", purchaseId),
      sb.from("lab_results").select("*").eq("purchase_id", purchaseId).order("versao", { ascending: false }).limit(1),
      sb.from("settings").select("*").limit(1).single(),
    ]);

    if (purchaseRes.error || !purchaseRes.data) {
      return new Response(JSON.stringify({ error: "Purchase not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (demoRes.error || !demoRes.data) {
      return new Response(JSON.stringify({ error: "Demonstrativo not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const purchase = purchaseRes.data;
    const demo = demoRes.data;
    const items = itemsRes.data || [];
    const latestLab = labRes.data?.[0] || null;
    const settings = settingsRes.data;

    const isCeramico = purchase.material_flow === "ceramico";

    // ===== Build PDF =====
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    // --- Header ---
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("DEMONSTRATIVO DE VALORES", pageWidth / 2, y, { align: "center" });
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Versão ${demo.versao}`, pageWidth / 2, y, { align: "center" });
    y += 10;

    // --- Divider ---
    doc.setDrawColor(200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    // --- Purchase Info ---
    doc.setFontSize(10);
    const infoLeft = [
      { label: "Nº Pedido:", value: purchase.purchase_number },
      { label: "Fornecedor:", value: purchase.supplier_name },
      { label: "Comprador:", value: purchase.buyer || "—" },
    ];
    const infoRight = [
      { label: "Data:", value: new Date(purchase.date).toLocaleDateString("pt-BR") },
      { label: "Fluxo:", value: isCeramico ? "Cerâmico" : "Peças" },
      { label: "Boleto Syge:", value: purchase.erp_number || "—" },
    ];

    for (let i = 0; i < infoLeft.length; i++) {
      doc.setFont("helvetica", "bold");
      doc.text(infoLeft[i].label, margin, y);
      doc.setFont("helvetica", "normal");
      doc.text(infoLeft[i].value, margin + 28, y);

      doc.setFont("helvetica", "bold");
      doc.text(infoRight[i].label, pageWidth / 2 + 5, y);
      doc.setFont("helvetica", "normal");
      doc.text(infoRight[i].value, pageWidth / 2 + 28, y);
      y += 6;
    }
    y += 4;

    // --- Items Table ---
    doc.setDrawColor(150);
    doc.setFillColor(240, 240, 240);

    const colWidths = [10, 40, 30, 30, contentWidth - 110];
    const colX = [margin];
    for (let i = 1; i < colWidths.length; i++) colX.push(colX[i - 1] + colWidths[i - 1]);

    const headers = ["#", "Tipo", "Qtd/Peso", "Valor Unit.", "Valor Total"];

    // Header row
    doc.rect(margin, y, contentWidth, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    for (let i = 0; i < headers.length; i++) {
      doc.text(headers[i], colX[i] + 2, y + 5);
    }
    y += 7;

    const typeLabels: Record<string, string> = {
      peca: "Peça",
      peca_sacola: "Peça em Sacola",
      ceramico: "Cerâmico",
    };

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const calcResult = item.calc_result as any;
      const calcInput = item.calc_input as any;

      let qtyWeight = "—";
      if (item.item_type === "peca") {
        qtyWeight = `${item.quantity || 0} pç`;
      } else if (item.item_type === "peca_sacola" && !calcInput) {
        qtyWeight = `${item.quantity || 0} pç`;
        if (item.weight) qtyWeight += ` / ${fmt(Number(item.weight))} kg`;
      } else if (calcInput) {
        const net = (calcInput.grossWeight || 0) - (calcInput.tare || 0);
        qtyWeight = `${fmt(net)} kg`;
      } else if (item.weight) {
        qtyWeight = `${fmt(Number(item.weight))} kg`;
      }

      let unitVal = "—";
      let totalVal = "—";
      if (item.item_type === "peca" || (item.item_type === "peca_sacola" && !calcResult)) {
        const tv = Number(item.total_value) || 0;
        const qty = item.quantity || 1;
        unitVal = tv > 0 ? fmtBrl(tv / qty) : "—";
        totalVal = tv > 0 ? fmtBrl(tv) : "Pendente";
      } else if (calcResult) {
        totalVal = calcResult.finalValueBrl ? fmtBrl(calcResult.finalValueBrl) : "Pendente";
        unitVal = "—";
      }

      // Alternating bg
      if (i % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, y, contentWidth, 6, "F");
      }

      doc.text(`${i + 1}`, colX[0] + 2, y + 4);
      doc.text(typeLabels[item.item_type] || item.item_type, colX[1] + 2, y + 4);
      doc.text(qtyWeight, colX[2] + 2, y + 4);
      doc.text(unitVal, colX[3] + 2, y + 4);
      doc.text(totalVal, colX[4] + 2, y + 4);
      y += 6;
    }

    y += 4;
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    // --- Lab Results (cerâmico) ---
    if (isCeramico && latestLab) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Análise Laboratorial", margin, y);
      y += 7;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");

      const labInfo = [
        { label: "Platina (Pt):", value: `${fmt(Number(latestLab.pt_ppm))} ppm` },
        { label: "Paládio (Pd):", value: `${fmt(Number(latestLab.pd_ppm))} ppm` },
        { label: "Ródio (Rh):", value: `${fmt(Number(latestLab.rh_ppm))} ppm` },
        { label: "Versão análise:", value: `v${latestLab.versao}` },
      ];

      for (const info of labInfo) {
        doc.setFont("helvetica", "bold");
        doc.text(info.label, margin, y);
        doc.setFont("helvetica", "normal");
        doc.text(info.value, margin + 35, y);
        y += 5;
      }
      y += 4;

      // Settings/pricing info
      if (settings) {
        doc.setFont("helvetica", "bold");
        doc.text("Cotações utilizadas:", margin, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);

        const pricingInfo = [
          `Pt: USD ${fmt(Number(settings.pt_price))} | Pd: USD ${fmt(Number(settings.pd_price))} | Rh: USD ${fmt(Number(settings.rh_price))}`,
          `Câmbio: ${fmtBrl(Number(settings.usd_to_brl))}`,
        ];

        for (const line of pricingInfo) {
          doc.text(line, margin, y);
          y += 4;
        }
        y += 4;
      }

      doc.line(margin, y, pageWidth - margin, y);
      y += 6;
    }

    // --- Weight info ---
    if (purchase.weight_declared || purchase.weight_real) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Conferência de Peso", margin, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      if (purchase.weight_declared) {
        doc.text(`Peso Declarado: ${fmt(Number(purchase.weight_declared))} kg`, margin, y);
        y += 5;
      }
      if (purchase.weight_real) {
        doc.text(`Peso Real: ${fmt(Number(purchase.weight_real))} kg`, margin, y);
        y += 5;
      }
      if (purchase.weight_loss != null && Math.abs(Number(purchase.weight_loss)) > 0) {
        const loss = Number(purchase.weight_loss);
        doc.text(`Diferença: ${fmt(Math.abs(loss))} kg ${loss > 0 ? "(perda)" : "(ganho)"}`, margin, y);
        y += 5;
      }
      y += 4;
      doc.line(margin, y, pageWidth - margin, y);
      y += 6;
    }

    // --- Total ---
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("VALOR TOTAL:", margin, y);
    doc.text(fmtBrl(Number(demo.valor_total)), pageWidth - margin, y, { align: "right" });
    y += 10;

    // --- Footer ---
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(130);
    doc.text(`Demonstrativo gerado em ${new Date().toLocaleString("pt-BR")}`, margin, y);
    y += 4;
    doc.text(`Envio em: ${new Date(demo.enviado_em).toLocaleString("pt-BR")}`, margin, y);

    if (purchase.notes) {
      y += 8;
      doc.setTextColor(80);
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.text(`Obs: ${purchase.notes}`, margin, y, { maxWidth: contentWidth });
    }

    // Generate output
    const pdfOutput = doc.output("arraybuffer");
    const safeNum = (purchase.purchase_number || "").replace(/[^a-zA-Z0-9-]/g, "_");
    const filename = `demonstrativo-${safeNum}-v${demo.versao}.pdf`;

    return new Response(pdfOutput, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("PDF generation error:", err);
    return new Response(JSON.stringify({ error: "Internal error generating PDF" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
