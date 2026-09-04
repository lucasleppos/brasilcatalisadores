import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Eye, Pencil, Trash2, KeyRound, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { PermissionProfile } from "@/lib/permissions";

export interface UserRow {
  id: string;
  buyer_names?: string[];
  full_name: string;
  branch: string;
  job_title: string;
  role: string | null;
  email: string;
  last_sign_in_at?: string | null;
}

interface UserActionsProps {
  user: UserRow;
  currentUserId: string | undefined;
  onSuccess: () => void;
  roleProfiles?: PermissionProfile[];
}

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  const bytes = new Uint32Array(10);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 10; i++) out += chars[bytes[i] % chars.length];
  return out + "!2";
}

export function UserActions({ user, currentUserId, onSuccess, roleProfiles = [] }: UserActionsProps) {
  const { toast } = useToast();
  const { role: currentRole } = useAuth();
  const isSuperAdmin = currentRole === "super_admin";

  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: user.full_name,
    branch: user.branch,
    job_title: user.job_title,
    role: user.role || "",
  });
  const [buyerNames, setBuyerNames] = useState<string[]>(user.buyer_names || []);
  const [buyerOptions, setBuyerOptions] = useState<string[]>([]);
  const [buyerSearch, setBuyerSearch] = useState("");

  const loadBuyerOptions = async () => {
    const [pRes, sRes] = await Promise.all([
      supabase.from("purchases").select("buyer"),
      supabase.from("suppliers").select("buyer"),
    ]);
    const names = new Set<string>();
    [...(pRes.data || []), ...(sRes.data || [])].forEach((r: any) => {
      const n = (r.buyer || "").trim();
      if (n) names.add(n);
    });
    setBuyerOptions([...names].sort((a, b) => a.localeCompare(b, "pt-BR")));
  };

  const toggleBuyerName = (name: string) =>
    setBuyerNames((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));

  const isSelf = currentUserId === user.id;

  const getRoleLabel = (roleName: string | null): string => {
    if (!roleName) return "Sem perfil";
    const profile = roleProfiles.find(p => p.role_name === roleName);
    return profile?.label || roleName;
  };

  const handleEdit = async () => {
    setEditLoading(true);
    const res = await supabase.functions.invoke("manage-user", {
      body: {
        action: "update",
        user_id: user.id,
        full_name: editForm.full_name,
        branch: editForm.branch,
        job_title: editForm.job_title,
        role: editForm.role,
        buyer_names: buyerNames,
      },
    });
    setEditLoading(false);

    if (res.error || res.data?.error) {
      toast({ title: "Erro ao editar", description: res.data?.error || res.error?.message, variant: "destructive" });
    } else {
      toast({ title: "Usuário atualizado" });
      setEditOpen(false);
      onSuccess();
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 8) {
      toast({ title: "A senha deve ter no mínimo 8 caracteres", variant: "destructive" });
      return;
    }
    setPwdLoading(true);
    const res = await supabase.functions.invoke("manage-user", {
      body: { action: "reset_password", user_id: user.id, password: newPassword },
    });
    setPwdLoading(false);

    if (res.error || res.data?.error) {
      toast({ title: "Erro ao redefinir senha", description: res.data?.error || res.error?.message, variant: "destructive" });
    } else {
      toast({ title: "Senha redefinida", description: `Nova senha: ${newPassword}` });
      setPwdOpen(false);
      setNewPassword("");
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    const res = await supabase.functions.invoke("manage-user", {
      body: { action: "delete", user_id: user.id },
    });
    setDeleteLoading(false);

    if (res.error || res.data?.error) {
      toast({ title: "Erro ao excluir", description: res.data?.error || res.error?.message, variant: "destructive" });
    } else {
      toast({ title: "Usuário excluído" });
      setDeleteOpen(false);
      onSuccess();
    }
  };

  return (
    <>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={() => setViewOpen(true)} title="Visualizar">
          <Eye className="h-4 w-4" />
        </Button>
        {isSuperAdmin && (
          <Button variant="ghost" size="icon" onClick={() => {
            setEditForm({ full_name: user.full_name, branch: user.branch, job_title: user.job_title, role: user.role || "" });
            setBuyerNames(user.buyer_names || []);
            setBuyerSearch("");
            loadBuyerOptions();
            setEditOpen(true);
          }} title="Editar">
            <Pencil className="h-4 w-4" />
          </Button>
        )}
        {isSuperAdmin && (
          <Button variant="ghost" size="icon" onClick={() => { setNewPassword(generatePassword()); setPwdOpen(true); }} title="Redefinir senha">
            <KeyRound className="h-4 w-4" />
          </Button>
        )}
        {isSuperAdmin && (
          <Button variant="ghost" size="icon" onClick={() => setDeleteOpen(true)} disabled={isSelf} title={isSelf ? "Você não pode excluir a si mesmo" : "Excluir"}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-muted-foreground">Nome</Label><p className="font-medium">{user.full_name || "—"}</p></div>
            <div><Label className="text-muted-foreground">E-mail</Label><p className="font-medium">{user.email || "—"}</p></div>
            <div><Label className="text-muted-foreground">Filial</Label><p className="font-medium">{user.branch || "—"}</p></div>
            <div><Label className="text-muted-foreground">Cargo</Label><p className="font-medium">{user.job_title || "—"}</p></div>
            <div><Label className="text-muted-foreground">Perfil</Label><p>{user.role ? <Badge variant="secondary">{getRoleLabel(user.role)}</Badge> : <span className="text-muted-foreground text-xs">Sem perfil</span>}</p></div>
            {(user.buyer_names || []).length > 0 && (
              <div>
                <Label className="text-muted-foreground">Nomes de comprador vinculados</Label>
                <div className="flex flex-wrap gap-1 pt-1">
                  {(user.buyer_names || []).map((n) => <Badge key={n} variant="outline">{n}</Badge>)}
                </div>
              </div>
            )}
            <div><Label className="text-muted-foreground">Status</Label><p className="font-medium">{user.last_sign_in_at ? "Ativo" : "Nunca acessou"}</p></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome completo</Label>
              <Input value={editForm.full_name} onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Perfil de acesso</Label>
              <Select value={editForm.role} onValueChange={(v) => setEditForm((f) => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {roleProfiles.map((r) => (
                    <SelectItem key={r.role_name} value={r.role_name}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Filial</Label>
                <Input value={editForm.branch} onChange={(e) => setEditForm((f) => ({ ...f, branch: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Cargo</Label>
                <Input value={editForm.job_title} onChange={(e) => setEditForm((f) => ({ ...f, job_title: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nomes de comprador vinculados</Label>
              <p className="text-xs text-muted-foreground">
                Selecione os nomes que aparecem nas compras e fornecedores deste usuário. Usado para limitar o que um comprador vê.
              </p>
              {buyerNames.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {buyerNames.map((n) => (
                    <Badge key={n} variant="secondary" className="cursor-pointer" onClick={() => toggleBuyerName(n)}>
                      {n} x
                    </Badge>
                  ))}
                </div>
              )}
              <Input placeholder="Buscar nome..." value={buyerSearch} onChange={(e) => setBuyerSearch(e.target.value)} />
              <div className="max-h-40 overflow-y-auto rounded-md border divide-y">
                {buyerOptions
                  .filter((n) => n.toLowerCase().includes(buyerSearch.toLowerCase()))
                  .slice(0, 100)
                  .map((n) => (
                    <button
                      type="button"
                      key={n}
                      onClick={() => toggleBuyerName(n)}
                      className={`flex w-full items-center justify-between px-2 py-1.5 text-left text-sm hover:bg-muted ${buyerNames.includes(n) ? "bg-muted font-medium" : ""}`}
                    >
                      <span className="truncate">{n}</span>
                      {buyerNames.includes(n) && <span className="text-xs text-primary">selecionado</span>}
                    </button>
                  ))}
                {buyerOptions.length === 0 && (
                  <p className="px-2 py-2 text-xs text-muted-foreground">Nenhum nome de comprador encontrado.</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleEdit} disabled={editLoading}>{editLoading ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={pwdOpen} onOpenChange={setPwdOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redefinir Senha</DialogTitle>
            <DialogDescription>
              Defina uma nova senha para <strong>{user.full_name || user.email}</strong> e repasse ao colaborador.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Nova senha (mínimo 8 caracteres)</Label>
            <div className="flex gap-2">
              <Input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              <Button type="button" variant="outline" size="icon" title="Gerar senha" onClick={() => setNewPassword(generatePassword())}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwdOpen(false)}>Cancelar</Button>
            <Button onClick={handleResetPassword} disabled={pwdLoading}>{pwdLoading ? "Salvando..." : "Redefinir"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{user.full_name || user.email || "este usuário"}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteLoading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteLoading ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
