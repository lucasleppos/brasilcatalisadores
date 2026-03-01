import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Save, User } from "lucide-react";

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  comprador: "Comprador",
  operacional: "Operacional",
  laboratorio: "Laboratório",
  visualizador: "Visualizador",
};

export default function ProfilePage() {
  const { user, profile, role } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
      setAvatarUrl(profile.avatar_url || "");
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, phone, avatar_url: avatarUrl })
      .eq("id", user.id);
    setSaving(false);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Perfil atualizado" });
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-display flex items-center gap-2">
        <User className="h-6 w-6" /> Meu Perfil
      </h1>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Informações pessoais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email || ""} disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label>Nome completo</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>URL do Avatar</Label>
            <Input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div className="flex items-center justify-between pt-2">
            <div>
              <span className="text-xs text-muted-foreground mr-2">Filial:</span>
              <span className="text-sm">{profile?.branch || "—"}</span>
              <span className="text-xs text-muted-foreground ml-4 mr-2">Perfil:</span>
              {role ? <Badge variant="secondary">{roleLabels[role] || role}</Badge> : <span className="text-sm">—</span>}
            </div>
            <Button onClick={handleSave} disabled={saving} size="sm">
              <Save className="mr-1 h-3 w-3" />
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
