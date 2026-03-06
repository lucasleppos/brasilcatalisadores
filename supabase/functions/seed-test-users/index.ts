import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TEST_USERS = [
  { email: "teste.operacional@teste.com", role: "operacional", full_name: "Teste Operacional" },
  { email: "teste.laboratorio@teste.com", role: "laboratorio", full_name: "Teste Laboratório" },
  { email: "teste.admin@teste.com", role: "admin", full_name: "Teste Admin" },
  { email: "teste.comprador@teste.com", role: "comprador", full_name: "Teste Comprador" },
  { email: "teste.visualizador@teste.com", role: "visualizador", full_name: "Teste Visualizador" },
];

const PASSWORD = "Teste123!";

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

    // Verify caller is super_admin
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await callerClient.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: roleCheck } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "super_admin")
      .maybeSingle();

    if (!roleCheck) {
      return new Response(
        JSON.stringify({ error: "Only super_admin can seed test users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: { email: string; role: string; status: string }[] = [];

    for (const testUser of TEST_USERS) {
      // Check if user already exists
      const { data: existingUsers } = await adminClient.auth.admin.listUsers();
      const existing = existingUsers?.users?.find((u: any) => u.email === testUser.email);

      if (existing) {
        results.push({ email: testUser.email, role: testUser.role, status: "already_exists" });
        continue;
      }

      // Create user with confirmed email
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: testUser.email,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: testUser.full_name },
      });

      if (createError) {
        results.push({ email: testUser.email, role: testUser.role, status: `error: ${createError.message}` });
        continue;
      }

      if (newUser.user) {
        // Profile is created by trigger, but update with full_name
        await adminClient
          .from("profiles")
          .upsert({ id: newUser.user.id, full_name: testUser.full_name });

        // Create role
        await adminClient
          .from("user_roles")
          .insert({ user_id: newUser.user.id, role: testUser.role });

        results.push({ email: testUser.email, role: testUser.role, status: "created" });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
