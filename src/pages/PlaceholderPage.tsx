import { Construction } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full text-center">
        <CardContent className="pt-10 pb-10 space-y-4">
          <Construction className="mx-auto h-12 w-12 text-primary opacity-60" />
          <h2 className="text-2xl font-display">{title}</h2>
          <p className="text-muted-foreground">
            Este módulo estará disponível em breve.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
