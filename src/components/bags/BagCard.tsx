import { Bag, getWeightPercentage, getMaterialTypeLabel, getStatusColor } from "@/lib/bags";
import { fmtNum } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface BagCardProps {
  bag: Bag;
  onClick: (bag: Bag) => void;
}

export function BagCard({ bag, onClick }: BagCardProps) {
  const pct = getWeightPercentage(bag);
  const progressColor = pct > 105 ? "bg-destructive" : pct > 95 ? "bg-yellow-500" : "bg-primary";

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onClick(bag)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">{bag.bagNumber}</CardTitle>
          <Badge className={getStatusColor(bag.status)} variant="secondary">
            {bag.status}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{bag.bagLabel}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline">{getMaterialTypeLabel(bag.materialType)}</Badge>
          {bag.buyer && <span>{bag.buyer}</span>}
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span>Peso</span>
            <span>{fmtNum(bag.totalWeight, 4)} / {bag.maxWeight} kg</span>
          </div>
          <Progress value={Math.min(pct, 110)} className="h-2" />
        </div>

        <div className="text-sm font-medium">
          R$ {fmtNum(bag.totalPaidBrl, 2)}
        </div>
      </CardContent>
    </Card>
  );
}
