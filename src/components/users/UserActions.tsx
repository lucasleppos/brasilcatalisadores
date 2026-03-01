import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppRole } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
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
import { Eye, Pencil, Trash2 } from "lucide-react";

export interface UserRow {
  id: string;
  full_name: string;
  branch: string;
  job_title: string;
  role: AppRole | null;
  email: string;
}

export const roleLabels: Record<AppRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  comprador: "Comprador",
  operacional: "Operacional",
  laboratorio: "Laboratório",
  visualizador: "Visualizador",
};

export const allRoles: AppRole[] = [
  "super_admin", "admin", "comprador", "operacional", "laboratorio", "visualizador",
];

interface UserActionsProps {
  user: UserRow;
  currentUserId: string | undefined;
  onSuccess: () => void;
}

export function UserActions({ user, currentUserId, onSuccess }: UserActionsProps) {
  const { toast } = useToast();
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: user.full_name,
    branch: user.branch,
    job_title: user.job_title,
    role: user.role || ("visualizador" as AppRole),
  });

  const isSelf = currentUserId === user.id;

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
        <Button variant="ghost" size="icon" onClick={() => {
          setEditForm({ full_name: user.full_name, branch: user.branch, job_title: user.job_title, role: user.role || "visualizador" });
          setEditOpen(true);
        }} title="Editar">
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setDeleteOpen(true)} disabled={isSelf} title={isSelf ? "Você não pode excluir a si mesmo" : "Excluir"}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-muted-foreground">Nome</Label><p className="font-medium">{user.full_name || "—"}</p></div>
            <div><Label className="text-muted-foreground">Filial</Label><p className="font-medium">{user.branch || "—"}</p></div>
            <div><Label className="text-muted-foreground">Cargo</Label><p className="font-medium">{user.job_title || "—"}</p></div>
            <div><Label className="text-muted-foreground">Perfil</Label><p>{user.role ? <Badge variant="secondary">{roleLabels[user.role]}</Badge> : <span className="text-muted-foreground text-xs">Sem perfil</span>}</p></div>
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
              <Select value={editForm.role} onValueChange={(v) => setEditForm((f) => ({ ...f, role: v as AppRole }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {allRoles.map((r) => (
                    <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleEdit} disabled={editLoading}>{editLoading ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{user.full_name || "este usuário"}</strong>? Esta ação não pode ser desfeita.
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
