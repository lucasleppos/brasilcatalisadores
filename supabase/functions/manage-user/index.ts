import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const VALID_ACTIONS = ["list", "create", "update", "delete", "reset_password"];
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sanitizeText(value: unknown, maxLength = 200): string {
  if (!value || typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await callerClient.auth.getUser();
    if (claimsError || !claimsData.user) return json({ error: "Unauthorized" }, 401);

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const callerId = claimsData.user.id;

    const { data: callerRole } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .maybeSingle();

    if (!callerRole) return json({ error: "Nenhum perfil atribuído ao seu usuário" }, 403);

    const isSuperAdmin = callerRole.role === "super_admin";

    const body = await req.json().catch(() => ({}));
    const { action, user_id, email, password, full_name, branch, job_title, role } = body ?? {};

    if (!action || !VALID_ACTIONS.includes(action)) {
      return json({ error: `Ação inválida. Use uma de: ${VALID_ACTIONS.join(", ")}` }, 400);
    }

    // ---------- LIST ----------
    if (action === "list") {
      const { data: permData } = await adminClient
        .from("permissions")
        .select("permissions")
        .eq("role_name", callerRole.role)
        .maybeSingle();
      const perms = permData?.permissions as any;
      if (!perms?.modules?.usuarios?.access) {
        return json({ error: "Você não tem acesso ao módulo de usuários" }, 403);
      }

      const [{ data: profiles }, { data: roles }, authList] = await Promise.all([
        adminClient.from("profiles").select("*"),
        adminClient.from("user_roles").select("user_id, role"),
        adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      ]);

      const authUsers = authList.data?.users ?? [];
      const users = (profiles ?? []).map((p: any) => {
        const au = authUsers.find((u: any) => u.id === p.id);
        return {
          id: p.id,
          full_name: p.full_name || "",
          branch: p.branch || "",
          job_title: p.job_title || "",
          role: roles?.find((r: any) => r.user_id === p.id)?.role || null,
          email: au?.email || "",
          last_sign_in_at: au?.last_sign_in_at || null,
        };
      });

      return json({ success: true, users });
    }

    // Everything below is Super Admin only
    if (!isSuperAdmin) {
      return json({ error: "Apenas o Super Admin pode gerenciar usuários" }, 403);
    }

    // ---------- CREATE ----------
    if (action === "create") {
      if (!email || typeof email !== "string" || email.length > 255 || !EMAIL_REGEX.test(email.trim())) {
        return json({ error: "Informe um e-mail válido" }, 400);
      }
      if (!password || typeof password !== "string" || password.length < 8 || password.length > 128) {
        return json({ error: "A senha deve ter entre 8 e 128 caracteres" }, 400);
      }
      if (!role || typeof role !== "string") {
        return json({ error: "Selecione um perfil de acesso" }, 400);
      }

      const { data: roleExists } = await adminClient
        .from("permissions")
        .select("role_name")
        .eq("role_name", role)
        .maybeSingle();
      if (!roleExists) return json({ error: `Perfil inválido: ${role}` }, 400);

      const sanitizedEmail = email.trim().toLowerCase();
      const sanitizedName = sanitizeText(full_name, 100);
      const sanitizedBranch = sanitizeText(branch, 100);
      const sanitizedJobTitle = sanitizeText(job_title, 100);

      const { data: created, error: createError } = await adminClient.auth.admin.createUser({
        email: sanitizedEmail,
        password,
        email_confirm: true,
        user_metadata: { full_name: sanitizedName, branch: sanitizedBranch, job_title: sanitizedJobTitle },
      });

      if (createError || !created?.user) {
        const alreadyExists =
          (createError as any)?.code === "email_exists" ||
          /already been registered|already registered|already exists/i.test(createError?.message ?? "");
        return json(
          {
            error: alreadyExists
              ? `Este e-mail já está cadastrado (${sanitizedEmail}). Edite o usuário existente ou exclua-o antes de cadastrar novamente.`
              : createError?.message || "Falha ao criar usuário",
          },
          alreadyExists ? 409 : 400
        );
      }

      const newUserId = created.user.id;

      const { error: profileError } = await adminClient.from("profiles").upsert(
        {
          id: newUserId,
          full_name: sanitizedName,
          branch: sanitizedBranch,
          job_title: sanitizedJobTitle,
        },
        { onConflict: "id" }
      );

      if (profileError) {
        await adminClient.auth.admin.deleteUser(newUserId);
        return json({ error: `Falha ao criar perfil: ${profileError.message}` }, 500);
      }

      const { error: roleError } = await adminClient
        .from("user_roles")
        .upsert({ user_id: newUserId, role }, { onConflict: "user_id,role" });

      if (roleError) {
        await adminClient.auth.admin.deleteUser(newUserId);
        return json({ error: `Falha ao atribuir perfil: ${roleError.message}` }, 500);
      }

      return json({ success: true, user_id: newUserId });
    }

    // Actions below require a target user
    if (!user_id || typeof user_id !== "string" || !UUID_REGEX.test(user_id)) {
      return json({ error: "user_id (UUID) válido é obrigatório" }, 400);
    }

    // ---------- RESET PASSWORD ----------
    if (action === "reset_password") {
      if (!password || typeof password !== "string" || password.length < 8 || password.length > 128) {
        return json({ error: "A senha deve ter entre 8 e 128 caracteres" }, 400);
      }
      const { error } = await adminClient.auth.admin.updateUserById(user_id, { password });
      if (error) return json({ error: error.message }, 400);
      return json({ success: true });
    }

    // ---------- UPDATE ----------
    if (action === "update") {
      const sanitizedName = sanitizeText(full_name, 100);
      const sanitizedBranch = sanitizeText(branch, 100);
      const sanitizedJobTitle = sanitizeText(job_title, 100);

      const { error: profileError } = await adminClient
        .from("profiles")
        .update({ full_name: sanitizedName, branch: sanitizedBranch, job_title: sanitizedJobTitle })
        .eq("id", user_id);
      if (profileError) return json({ error: profileError.message }, 400);

      if (role) {
        const { data: roleExists } = await adminClient
          .from("permissions")
          .select("role_name")
          .eq("role_name", role)
          .maybeSingle();
        if (!roleExists) return json({ error: `Perfil inválido: ${role}` }, 400);

        const { data: existingRole } = await adminClient
          .from("user_roles")
          .select("id")
          .eq("user_id", user_id)
          .maybeSingle();

        if (existingRole) {
          await adminClient.from("user_roles").update({ role }).eq("user_id", user_id);
        } else {
          await adminClient.from("user_roles").insert({ user_id, role });
        }
      }

      return json({ success: true });
    }

    // ---------- DELETE ----------
    if (action === "delete") {
      if (user_id === callerId) {
        return json({ error: "Você não pode excluir a si mesmo" }, 400);
      }
      const { error: deleteError } = await adminClient.auth.admin.deleteUser(user_id);
      if (deleteError) return json({ error: deleteError.message }, 400);
      return json({ success: true });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (_err) {
    return json({ error: "Erro interno do servidor" }, 500);
  }
});
