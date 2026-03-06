import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Users, FlaskConical, Search } from "lucide-react";
import { UserActions, UserRow, roleLabels, allRoles } from "@/components/users/UserActions";
import { useSortable } from "@/hooks/use-sortable";
import { SortableTableHead } from "@/components/ui/sortable-table-head";

export default function UsersPage() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);
  const [form, setForm] = useState({
    email: "",
    full_name: "",
    role: "visualizador" as AppRole,
    branch: "",
    job_title: "",
  });

  const fetchUsers = async () => {
    setLoading(true);
    const { data: profiles } = await supabase.from("profiles").select("*");
    const { data: roles } = await supabase.from("user_roles").select("*");

    if (profiles) {
      const mapped: UserRow[] = profiles.map((p: any) => {
        const userRole = roles?.find((r: any) => r.user_id === p.id);
        return {
          id: p.id,
          full_name: p.full_name || "",
          branch: p.branch || "",
          job_title: p.job_title || "",
          role: userRole?.role as AppRole || null,
          email: "",
        };
      });
      setUsers(mapped);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filtered = users.filter((u) =>
    [u.full_name, u.branch, u.job_title, u.role ? roleLabels[u.role] : ""]
      .some((f) => (f || "").toLowerCase().includes(search.toLowerCase()))
  );

  const { sorted, sort, toggleSort } = useSortable(filtered);

  const handleInvite = async () => {
    if (!form.email || !form.role) return;
    setInviteLoading(true);

    const res = await supabase.functions.invoke("invite-user", {
      body: {
        email: form.email,
        full_name: form.full_name,
        role: form.role,
        branch: form.branch,
        job_title: form.job_title,
      },
    });

    setInviteLoading(false);

    if (res.error || res.data?.error) {
      toast({
        title: "Erro ao convidar",
        description: res.data?.error || res.error?.message || "Erro desconhecido",
        variant: "destructive",
      });
    } else {
      toast({ title: "Convite enviado", description: `Email enviado para ${form.email}` });
      setInviteOpen(false);
      setForm({ email: "", full_name: "", role: "visualizador", branch: "", job_title: "" });
      fetchUsers();
    }
  };

  const handleSeedTestUsers = async () => {
    setSeedLoading(true);
    const res = await supabase.functions.invoke("seed-test-users");
    setSeedLoading(false);

    if (res.error || res.data?.error) {
      toast({
        title: "Erro ao criar usuários de teste",
        description: res.data?.error || res.error?.message || "Erro desconhecido",
        variant: "destructive",
      });
    } else {
      const created = res.data?.results?.filter((r: any) => r.status === "created").length || 0;
      const existing = res.data?.results?.filter((r: any) => r.status === "already_exists").length || 0;
      toast({
        title: "Usuários de teste criados",
        description: `${created} criado(s), ${existing} já existia(m). Senha: Teste123!`,
      });
      fetchUsers();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display flex items-center gap-2">
          <Users className="h-6 w-6" /> Usuários
        </h1>
        <div className="flex gap-2">
          {role === "super_admin" && (
            <Button onClick={handleSeedTestUsers} variant="outline" size="sm" disabled={seedLoading}>
              <FlaskConical className="mr-1 h-4 w-4" />
              {seedLoading ? "Criando..." : "Criar Usuários de Teste"}
            </Button>
          )}
          <Button onClick={() => setInviteOpen(true)} size="sm">
            <UserPlus className="mr-1 h-4 w-4" /> Convidar Usuário
          </Button>
        </div>
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
                <SortableTableHead column="branch" currentColumn={sort.column} direction={sort.direction} onToggle={toggleSort}>Filial</SortableTableHead>
                <SortableTableHead column="job_title" currentColumn={sort.column} direction={sort.direction} onToggle={toggleSort}>Cargo</SortableTableHead>
                <SortableTableHead column="role" currentColumn={sort.column} direction={sort.direction} onToggle={toggleSort}>Perfil</SortableTableHead>
                <TableHead className="w-[120px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhum usuário encontrado
                  </TableCell>
                </TableRow>
              ) : (
                sorted.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                    <TableCell>{u.branch || "—"}</TableCell>
                    <TableCell>{u.job_title || "—"}</TableCell>
                    <TableCell>
                      {u.role ? (
                        <Badge variant="secondary">{roleLabels[u.role]}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">Sem perfil</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <UserActions user={u} currentUserId={user?.id} onSuccess={fetchUsers} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar Novo Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="usuario@email.com" />
            </div>
            <div className="space-y-2">
              <Label>Nome completo</Label>
              <Input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Perfil de acesso *</Label>
              <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v as AppRole }))}>
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
                <Input value={form.branch} onChange={(e) => setForm((f) => ({ ...f, branch: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Cargo</Label>
                <Input value={form.job_title} onChange={(e) => setForm((f) => ({ ...f, job_title: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancelar</Button>
            <Button onClick={handleInvite} disabled={inviteLoading || !form.email}>
              {inviteLoading ? "Enviando..." : "Enviar Convite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
