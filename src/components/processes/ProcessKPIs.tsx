import { Card, CardContent } from "@/components/ui/card";
import { Package, Clock, TrendingUp, BarChart3 } from "lucide-react";

const fmtBrl = (n: number) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface ProcessKPIsProps {
  totalCount: number;
  activeCount: number;
  completedCount: number;
  totalValue: number;
}

export default function ProcessKPIs({ totalCount, activeCount, completedCount, totalValue }: ProcessKPIsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <Package className="h-8 w-8 text-primary/60" />
            <div>
              <p className="text-xs text-muted-foreground">Total Compras</p>
              <p className="text-2xl font-bold">{totalCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <Clock className="h-8 w-8 text-amber-500/60" />
            <div>
              <p className="text-xs text-muted-foreground">Em Produção</p>
              <p className="text-2xl font-bold">{activeCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-green-500/60" />
            <div>
              <p className="text-xs text-muted-foreground">Finalizadas</p>
              <p className="text-2xl font-bold">{completedCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary/60" />
            <div>
              <p className="text-xs text-muted-foreground">Valor Total</p>
              <p className="text-lg font-bold">{fmtBrl(totalValue)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
