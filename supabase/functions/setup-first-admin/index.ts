import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email: string): string | null {
  if (!email || typeof email !== "string") return "Email is required";
  if (email.length > 255) return "Email must be less than 255 characters";
  if (!EMAIL_REGEX.test(email.trim())) return "Invalid email format";
  return null;
}

function validatePassword(password: string): string | null {
  if (!password || typeof password !== "string") return "Password is required";
  if (password.length < 8) return "Password must be at least 8 characters";
  if (password.length > 128) return "Password must be less than 128 characters";
  return null;
}

function sanitizeText(value: unknown, maxLength = 200): string {
  if (!value || typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if ANY user_roles exist — if so, setup is not allowed
    const { count } = await adminClient
      .from("user_roles")
      .select("id", { count: "exact", head: true });

    const body = await req.json().catch(() => ({}));

    // Dry-run check used by login page to know whether initial setup is required
    if (body.dry_run === true) {
      return new Response(
        JSON.stringify({ setup_completed: (count ?? 0) > 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (count && count > 0) {
      return new Response(
        JSON.stringify({ error: "Setup already completed. Users already exist." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, password, full_name } = body;

    // Validate email
    const emailError = validateEmail(email);
    if (emailError) {
      return new Response(
        JSON.stringify({ error: emailError }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate password
    const passwordError = validatePassword(password);
    if (passwordError) {
      return new Response(
        JSON.stringify({ error: passwordError }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sanitizedName = sanitizeText(full_name, 100);
    const sanitizedEmail = email.trim().toLowerCase();

    // Create user with admin API (auto-confirms email)
    const { data: userData, error: createError } =
      await adminClient.auth.admin.createUser({
        email: sanitizedEmail,
        password,
        email_confirm: true,
        user_metadata: { full_name: sanitizedName },
      });

    if (createError) {
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userData.user.id;

    // Update profile
    await adminClient
      .from("profiles")
      .update({ full_name: sanitizedName })
      .eq("id", userId);

    // Assign super_admin role
    await adminClient.from("user_roles").insert({
      user_id: userId,
      role: "super_admin",
    });

    return new Response(
      JSON.stringify({ success: true, user_id: userId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
