import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Users, Search, Copy, RefreshCw } from "lucide-react";
import { UserActions, UserRow } from "@/components/users/UserActions";
import { useSortable } from "@/hooks/use-sortable";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { loadPermissionProfiles, PermissionProfile } from "@/lib/permissions";

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  const bytes = new Uint32Array(10);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 10; i++) out += chars[bytes[i] % chars.length];
  return out + "!2";
}

export default function UsersPage() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const isSuperAdmin = role === "super_admin";

  const [users, setUsers] = useState<UserRow[]>([]);
  const [roleProfiles, setRoleProfiles] = useState<PermissionProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createdInfo, setCreatedInfo] = useState<{ email: string; password: string } | null>(null);
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "",
    branch: "",
    job_title: "",
  });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const res = await supabase.functions.invoke("manage-user", {
      body: { action: "list" },
    });
    if (res.data?.users) {
      setUsers(res.data.users as UserRow[]);
    } else if (res.error || res.data?.error) {
      toast({
        title: "Erro ao carregar usuários",
        description: res.data?.error || res.error?.message,
        variant: "destructive",
      });
    }
    setLoading(false);
  }, [toast]);

  const fetchRoleProfiles = useCallback(async () => {
    const data = await loadPermissionProfiles();
    setRoleProfiles(data);
    setForm((f) => (f.role ? f : { ...f, role: data[0]?.role_name || "" }));
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchUsers();
    fetchRoleProfiles();
  }, [user, fetchUsers, fetchRoleProfiles]);

  const getRoleLabel = (roleName: string | null): string => {
    if (!roleName) return "";
    const profile = roleProfiles.find((p) => p.role_name === roleName);
    return profile?.label || roleName;
  };

  const filtered = users.filter((u) =>
    [u.full_name, u.email, u.branch, u.job_title, u.role ? getRoleLabel(u.role) : ""]
      .some((f) => (f || "").toLowerCase().includes(search.toLowerCase()))
  );

  const { sorted, sort, toggleSort } = useSortable(filtered);

  const handleCreate = async () => {
    if (createLoading) return;
    if (!form.email || !form.password || !form.role) {
      toast({ title: "Preencha e-mail, senha e perfil", variant: "destructive" });
      return;
    }
    setCreateLoading(true);
    const res = await supabase.functions.invoke("manage-user", {
      body: {
        action: "create",
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        role: form.role,
        branch: form.branch,
        job_title: form.job_title,
      },
    });
    setCreateLoading(false);

    if (res.error || res.data?.error) {
      let description = res.data?.error || res.error?.message || "Erro desconhecido";
      const ctx = (res.error as any)?.context;
      if (ctx && typeof ctx.json === "function") {
        try {
          const body = await ctx.json();
          if (body?.error) description = body.error;
        } catch {
          // ignore
        }
      }
      toast({ title: "Erro ao cadastrar usuário", description, variant: "destructive" });
      return;
    }

    setCreatedInfo({ email: form.email, password: form.password });
    setCreateOpen(false);
    setForm({ email: "", password: "", full_name: "", role: roleProfiles[0]?.role_name || "", branch: "", job_title: "" });
    fetchUsers();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display flex items-center gap-2">
          <Users className="h-6 w-6" /> Usuários
        </h1>
        {isSuperAdmin && (
          <Button onClick={() => { setForm((f) => ({ ...f, password: generatePassword() })); setCreateOpen(true); }} size="sm">
            <UserPlus className="mr-1 h-4 w-4" /> Novo Usuário
          </Button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input placeholder="Buscar usuário..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 pl-8 text-sm" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead column="full_name" currentColumn={sort.column} direction={sort.direction} onToggle={toggleSort}>Nome</SortableTableHead>
                <SortableTableHead column="email" currentColumn={sort.column} direction={sort.direction} onToggle={toggleSort}>E-mail</SortableTableHead>
                <SortableTableHead column="branch" currentColumn={sort.column} direction={sort.direction} onToggle={toggleSort}>Filial</SortableTableHead>
                <SortableTableHead column="job_title" currentColumn={sort.column} direction={sort.direction} onToggle={toggleSort}>Cargo</SortableTableHead>
                <SortableTableHead column="role" currentColumn={sort.column} direction={sort.direction} onToggle={toggleSort}>Perfil</SortableTableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[120px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum usuário encontrado
                  </TableCell>
                </TableRow>
              ) : (
                sorted.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                    <TableCell className="text-sm">{u.email || "—"}</TableCell>
                    <TableCell>{u.branch || "—"}</TableCell>
                    <TableCell>{u.job_title || "—"}</TableCell>
                    <TableCell>
                      {u.role ? (
                        <Badge variant="secondary">{getRoleLabel(u.role)}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">Sem perfil</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {u.last_sign_in_at ? (
                        <Badge variant="outline">Ativo</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">Nunca acessou</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <UserActions user={u} currentUserId={user?.id} onSuccess={fetchUsers} roleProfiles={roleProfiles} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Usuário</DialogTitle>
            <DialogDescription>
              O acesso é criado imediatamente. Informe a senha ao colaborador.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>E-mail *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="usuario@email.com" />
            </div>
            <div className="space-y-2">
              <Label>Senha * (mínimo 8 caracteres)</Label>
              <div className="flex gap-2">
                <Input value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
                <Button type="button" variant="outline" size="icon" title="Gerar senha" onClick={() => setForm((f) => ({ ...f, password: generatePassword() }))}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nome completo</Label>
              <Input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Perfil de acesso *</Label>
              <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}>
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
                <Input value={form.branch} onChange={(e) => setForm((f) => ({ ...f, branch: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Cargo</Label>
                <Input value={form.job_title} onChange={(e) => setForm((f) => ({ ...f, job_title: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createLoading}>{createLoading ? "Cadastrando..." : "Cadastrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Created credentials */}
      <Dialog open={!!createdInfo} onOpenChange={(o) => !o && setCreatedInfo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Usuário cadastrado</DialogTitle>
            <DialogDescription>
              Guarde e repasse estas credenciais. A senha não será exibida novamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <div><span className="text-muted-foreground">E-mail: </span><strong>{createdInfo?.email}</strong></div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Senha: </span><strong>{createdInfo?.password}</strong>
              <Button variant="ghost" size="icon" title="Copiar" onClick={() => {
                navigator.clipboard?.writeText(`${createdInfo?.email} / ${createdInfo?.password}`);
                toast({ title: "Credenciais copiadas" });
              }}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setCreatedInfo(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
