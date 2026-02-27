import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { updateTransferStatus } from "@/lib/bags";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Truck, CheckCircle } from "lucide-react";

interface BranchPurchase {
  id: string;
  purchaseNumber: string;
  supplierName: string;
  totalBrl: number;
  transferStatus: string | null;
  date: string;
}

export function BranchStockList() {
  const { toast } = useToast();
  const [purchases, setPurchases] = useState<BranchPurchase[]>([]);

  const load = async () => {
    const { data } = await supabase
      .from("purchases")
      .select("id, purchase_number, supplier_name, total_brl, transfer_status, date")
      .eq("location", "filial")
      .order("date", { ascending: false });

    setPurchases(
      (data || []).map((r: any) => ({
        id: r.id,
        purchaseNumber: r.purchase_number,
        supplierName: r.supplier_name,
        totalBrl: Number(r.total_brl) || 0,
        transferStatus: r.transfer_status,
        date: r.date,
      }))
    );
  };

  useEffect(() => { load(); }, []);

  const handleTransit = async (id: string) => {
    await updateTransferStatus(id, "em_transito");
    toast({ title: "Marcado como Em Trânsito" });
    load();
  };

  const handleReceived = async (id: string) => {
    await updateTransferStatus(id, "recebido");
    toast({ title: "Recebido na Matriz" });
    load();
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "pendente": return <Badge variant="outline">Pendente</Badge>;
      case "em_transito": return <Badge className="bg-yellow-100 text-yellow-800">Em Trânsito</Badge>;
      case "recebido": return <Badge className="bg-green-100 text-green-800">Recebido</Badge>;
      default: return <Badge variant="outline">Pendente</Badge>;
    }
  };

  const pending = purchases.filter(p => p.transferStatus !== "recebido");
  const received = purchases.filter(p => p.transferStatus === "recebido");

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pendente de Transferência ({pending.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma compra de filial pendente.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Compra</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.purchaseNumber}</TableCell>
                    <TableCell>{p.supplierName}</TableCell>
                    <TableCell>R$ {p.totalBrl.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell>{getStatusBadge(p.transferStatus)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {(!p.transferStatus || p.transferStatus === "pendente") && (
                          <Button size="sm" variant="outline" onClick={() => handleTransit(p.id)}>
                            <Truck className="h-3 w-3 mr-1" /> Em Trânsito
                          </Button>
                        )}
                        {p.transferStatus === "em_transito" && (
                          <Button size="sm" onClick={() => handleReceived(p.id)}>
                            <CheckCircle className="h-3 w-3 mr-1" /> Recebido
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {received.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recebidos na Matriz ({received.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Compra</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {received.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.purchaseNumber}</TableCell>
                    <TableCell>{p.supplierName}</TableCell>
                    <TableCell>R$ {p.totalBrl.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell>{getStatusBadge(p.transferStatus)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
