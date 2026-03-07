import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const VALID_ACTIONS = ["update", "delete"];
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sanitizeText(value: unknown, maxLength = 200): string {
  if (!value || typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await callerClient.auth.getUser();
    if (claimsError || !claimsData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check caller has usuarios.edit or usuarios.delete permission
    const { data: callerRole } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", claimsData.user.id)
      .maybeSingle();

    if (!callerRole) {
      return new Response(
        JSON.stringify({ error: "No role assigned" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check permissions via the permissions table
    const { data: permData } = await adminClient
      .from("permissions")
      .select("permissions")
      .eq("role_name", callerRole.role)
      .maybeSingle();

    const perms = permData?.permissions as any;
    const canEdit = perms?.modules?.usuarios?.access && perms?.modules?.usuarios?.actions?.edit;
    const canDelete = perms?.modules?.usuarios?.access && perms?.modules?.usuarios?.actions?.delete;

    const { action, user_id, full_name, branch, job_title, role } = await req.json();

    // Validate action
    if (!action || !VALID_ACTIONS.includes(action)) {
      return new Response(
        JSON.stringify({ error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate user_id as UUID
    if (!user_id || typeof user_id !== "string" || !UUID_REGEX.test(user_id)) {
      return new Response(
        JSON.stringify({ error: "A valid user_id (UUID) is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "update") {
      if (!canEdit) {
        return new Response(
          JSON.stringify({ error: "You don't have permission to edit users" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const sanitizedName = sanitizeText(full_name, 100);
      const sanitizedBranch = sanitizeText(branch, 100);
      const sanitizedJobTitle = sanitizeText(job_title, 100);

      // Update profile
      await adminClient
        .from("profiles")
        .update({ full_name: sanitizedName, branch: sanitizedBranch, job_title: sanitizedJobTitle })
        .eq("id", user_id);

      // Upsert role (validate against permissions table)
      if (role) {
        const { data: roleExists } = await adminClient
          .from("permissions")
          .select("role_name")
          .eq("role_name", role)
          .maybeSingle();

        if (!roleExists) {
          return new Response(
            JSON.stringify({ error: `Invalid role: ${role}. Role does not exist in permissions table.` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

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

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "delete") {
      if (!canDelete) {
        return new Response(
          JSON.stringify({ error: "You don't have permission to delete users" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Prevent self-deletion
      if (user_id === claimsData.user.id) {
        return new Response(
          JSON.stringify({ error: "You cannot delete yourself" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: deleteError } = await adminClient.auth.admin.deleteUser(user_id);
      if (deleteError) {
        return new Response(
          JSON.stringify({ error: deleteError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
