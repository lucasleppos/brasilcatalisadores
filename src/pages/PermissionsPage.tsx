import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Shield, Plus, Pencil, Trash2, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  PermissionProfile, PermissionConfig, ModulePermission,
  MODULE_DEFINITIONS, loadPermissionProfiles, savePermissionProfile, deletePermissionProfile,
} from "@/lib/permissions";

function emptyPermissions(): PermissionConfig {
  const modules: Record<string, ModulePermission> = {};
  for (const key of Object.keys(MODULE_DEFINITIONS)) {
    const def = MODULE_DEFINITIONS[key];
    const actions: Record<string, boolean> = {};
    def.actions.forEach((a) => { actions[a.key] = false; });
    modules[key] = { access: false, actions, hidden_fields: [] };
  }
  return { modules };
}

export default function PermissionsPage() {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<PermissionProfile[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [current, setCurrent] = useState<PermissionProfile | null>(null);
  const [form, setForm] = useState<{
    role_name: string;
    label: string;
    permissions: PermissionConfig;
  }>({ role_name: "", label: "", permissions: emptyPermissions() });
  const [saving, setSaving] = useState(false);

  const load = async () => setProfiles(await loadPermissionProfiles());
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setCurrent(null);
    setForm({ role_name: "", label: "", permissions: emptyPermissions() });
    setEditOpen(true);
  };

  const openEdit = (p: PermissionProfile) => {
    setCurrent(p);
    // Merge existing permissions with full module list to ensure all modules appear
    const merged = emptyPermissions();
    for (const key of Object.keys(merged.modules)) {
      if (p.permissions?.modules?.[key]) {
        merged.modules[key] = {
          ...merged.modules[key],
          ...p.permissions.modules[key],
          actions: { ...merged.modules[key].actions, ...p.permissions.modules[key].actions },
          hidden_fields: p.permissions.modules[key].hidden_fields || [],
        };
      }
    }
    setForm({ role_name: p.role_name, label: p.label, permissions: merged });
    setEditOpen(true);
  };

  const toggleAccess = (module: string) => {
    setForm((f) => ({
      ...f,
      permissions: {
        ...f.permissions,
        modules: {
          ...f.permissions.modules,
          [module]: {
            ...f.permissions.modules[module],
            access: !f.permissions.modules[module].access,
          },
        },
      },
    }));
  };

  const toggleAction = (module: string, action: string) => {
    setForm((f) => ({
      ...f,
      permissions: {
        ...f.permissions,
        modules: {
          ...f.permissions.modules,
          [module]: {
            ...f.permissions.modules[module],
            actions: {
              ...f.permissions.modules[module].actions,
              [action]: !f.permissions.modules[module].actions?.[action],
            },
          },
        },
      },
    }));
  };

  const toggleHiddenField = (module: string, field: string) => {
    setForm((f) => {
      const current = f.permissions.modules[module].hidden_fields || [];
      const updated = current.includes(field)
        ? current.filter((f) => f !== field)
        : [...current, field];
      return {
        ...f,
        permissions: {
          ...f.permissions,
          modules: {
            ...f.permissions.modules,
            [module]: { ...f.permissions.modules[module], hidden_fields: updated },
          },
        },
      };
    });
  };

  const handleSave = async () => {
    if (!form.role_name || !form.label) {
      toast({ title: "Preencha o nome e o label do perfil", variant: "destructive" });
      return;
    }
    setSaving(true);
    const ok = await savePermissionProfile({
      id: current?.id,
      role_name: form.role_name,
      label: form.label,
      permissions: form.permissions,
    });
    setSaving(false);
    if (ok) {
      toast({ title: current ? "Perfil atualizado" : "Perfil criado" });
      setEditOpen(false);
      load();
    } else {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!current) return;
    const ok = await deletePermissionProfile(current.id);
    if (ok) {
      toast({ title: "Perfil excluído" });
      setDeleteOpen(false);
      load();
    } else {
      toast({ title: "Erro ao excluir. Verifique se há usuários usando este perfil.", variant: "destructive" });
    }
  };

  const countAccess = (p: PermissionProfile) => {
    return Object.values(p.permissions?.modules || {}).filter((m: any) => m.access).length;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-display">Permissões</h1>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus className="mr-1 h-3 w-3" /> Novo Perfil
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {profiles.map((p) => (
          <Card key={p.id} className="relative">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{p.label}</CardTitle>
                {p.is_default && (
                  <Badge variant="secondary" className="text-[10px]">
                    <Lock className="h-2.5 w-2.5 mr-0.5" /> Padrão
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground font-mono">{p.role_name}</p>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground mb-3">
                {countAccess(p)} módulo{countAccess(p) !== 1 ? "s" : ""} acessível(eis)
              </p>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
                  <Pencil className="h-3 w-3 mr-1" /> Editar
                </Button>
                {!p.is_default && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    onClick={() => { setCurrent(p); setDeleteOpen(true); }}
                  >
                    <Trash2 className="h-3 w-3 mr-1" /> Excluir
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{current ? `Editar: ${current.label}` : "Novo Perfil"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Identificador (slug)</Label>
                <Input
                  value={form.role_name}
                  onChange={(e) => setForm((f) => ({ ...f, role_name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") }))}
                  disabled={!!current}
                  placeholder="ex: comprador_jr"
                />
              </div>
              <div className="space-y-2">
                <Label>Nome do Perfil</Label>
                <Input
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  placeholder="ex: Comprador Júnior"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Módulos e Permissões</h3>
              {Object.entries(MODULE_DEFINITIONS).map(([key, def]) => {
                const mod = form.permissions.modules[key];
                return (
                  <Card key={key} className={mod?.access ? "border-primary/30" : ""}>
                    <CardContent className="py-3 px-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{def.label}</span>
                        <Switch
                          checked={mod?.access ?? false}
                          onCheckedChange={() => toggleAccess(key)}
                        />
                      </div>

                      {mod?.access && def.actions.length > 0 && (
                        <div className="flex flex-wrap gap-3 pt-1">
                          {def.actions.map((a) => (
                            <label key={a.key} className="flex items-center gap-1.5 text-xs">
                              <Checkbox
                                checked={mod.actions?.[a.key] ?? false}
                                onCheckedChange={() => toggleAction(key, a.key)}
                              />
                              {a.label}
                            </label>
                          ))}
                        </div>
                      )}

                      {mod?.access && def.fields.length > 0 && (
                        <div className="pt-1">
                          <p className="text-xs text-muted-foreground mb-1">Campos ocultos:</p>
                          <div className="flex flex-wrap gap-3">
                            {def.fields.map((f) => (
                              <label key={f.key} className="flex items-center gap-1.5 text-xs">
                                <Checkbox
                                  checked={mod.hidden_fields?.includes(f.key) ?? false}
                                  onCheckedChange={() => toggleHiddenField(key, f.key)}
                                />
                                {f.label}
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir perfil?</AlertDialogTitle>
            <AlertDialogDescription>
              O perfil <strong>{current?.label}</strong> será excluído permanentemente.
              Certifique-se de que nenhum usuário esteja usando este perfil.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
