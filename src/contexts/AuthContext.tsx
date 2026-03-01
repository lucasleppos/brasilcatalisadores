import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole =
  | "super_admin"
  | "admin"
  | "comprador"
  | "operacional"
  | "laboratorio"
  | "visualizador";

export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string;
  phone: string;
  branch: string;
  job_title: string;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  profile: null,
  role: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfileAndRole = async (userId: string) => {
    const [profileRes, roleRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
    ]);

    if (profileRes.data) {
      setProfile(profileRes.data as Profile);
    }
    if (roleRes.data) {
      setRole(roleRes.data.role as AppRole);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const checkRememberMe = async (userId: string) => {
      const { data } = await supabase
        .from("profiles")
        .select("remember_me")
        .eq("id", userId)
        .maybeSingle();

      const rememberMe = (data as any)?.remember_me ?? true;

      if (!rememberMe && !sessionStorage.getItem("session_active")) {
        // Browser was reopened and user chose not to be remembered
        await supabase.auth.signOut();
        if (isMounted) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setRole(null);
          setLoading(false);
        }
        return true; // signaled sign-out
      }

      // Mark session as active for this browser session
      if (!rememberMe) {
        sessionStorage.setItem("session_active", "true");
      }
      return false;
    };

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!isMounted) return;
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(() => {
            if (isMounted) fetchProfileAndRole(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
        }
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;

      if (session?.user) {
        const signedOut = await checkRememberMe(session.user.id);
        if (signedOut) return;
      }

      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfileAndRole(session.user.id);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
