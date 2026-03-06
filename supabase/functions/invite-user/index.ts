import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_ROLES = ["super_admin", "admin", "comprador", "operacional", "laboratorio", "visualizador"];

function sanitizeText(value: unknown, maxLength = 200): string {
  if (!value || typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify the caller is a super_admin
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

    // Verify caller role using their JWT
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

    // Check if caller is super_admin using service role
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleCheck } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", claimsData.user.id)
      .eq("role", "super_admin")
      .maybeSingle();

    if (!roleCheck) {
      return new Response(
        JSON.stringify({ error: "Only super_admin can invite users" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { email, full_name, role, branch, job_title } = await req.json();

    // Validate email
    if (!email || typeof email !== "string" || email.length > 255 || !EMAIL_REGEX.test(email.trim())) {
      return new Response(
        JSON.stringify({ error: "A valid email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate role against enum
    if (!role || !VALID_ROLES.includes(role)) {
      return new Response(
        JSON.stringify({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedName = sanitizeText(full_name, 100);
    const sanitizedBranch = sanitizeText(branch, 100);
    const sanitizedJobTitle = sanitizeText(job_title, 100);

    // Invite user via admin API
    const { data: inviteData, error: inviteError } =
      await adminClient.auth.admin.inviteUserByEmail(sanitizedEmail, {
        data: { full_name: sanitizedName, branch: sanitizedBranch, job_title: sanitizedJobTitle },
      });

    if (inviteError) {
      return new Response(JSON.stringify({ error: inviteError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = inviteData.user.id;

    // Update profile with extra data (trigger already created the row)
    await adminClient
      .from("profiles")
      .update({
        full_name: sanitizedName,
        branch: sanitizedBranch,
        job_title: sanitizedJobTitle,
      })
      .eq("id", userId);

    // Insert role
    await adminClient.from("user_roles").insert({
      user_id: userId,
      role: role,
    });

    return new Response(
      JSON.stringify({ success: true, user_id: userId }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
