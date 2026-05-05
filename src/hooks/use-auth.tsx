import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { clearRole } from "@/hooks/use-role";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string, role: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

interface Profile {
  id: string;
  display_name: string;
  email: string | null;
  avatar_url: string | null;
  headline: string;
  bio: string;
  location: string;
  phone: string;
  website: string;
  primary_role: string;
  skills: string[];
  languages: string[];
  experience: string;
  visibility: string;
  remote_ready: boolean;
  has_laptop: boolean;
  internet_stable: boolean;
  has_wise: boolean;
  has_upwork: boolean;
  referral_code: string | null;
  preferred_work_types: string[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const initializedRef = useRef(false);
  const mountedRef = useRef(true);
  const fetchingProfileRef = useRef<Promise<void> | null>(null);

  const fetchProfile = async (userId: string) => {
    if (fetchingProfileRef.current) return fetchingProfileRef.current;
    const request = (async () => {
      // email/phone are restricted at the column level for non-owners.
      // Fetch the row (without those columns) and merge owner-only contact
      // info from the SECURITY DEFINER RPC.
      const [{ data }, { data: contact }] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id, display_name, avatar_url, headline, bio, location, website, primary_role, skills, languages, experience, visibility, remote_ready, created_at, updated_at, role_title, preferred_work_types, has_payoneer, has_wise, has_upwork, has_laptop, internet_stable, referral_code, referred_by, last_seen_at, deletion_scheduled_at, deletion_requested_at"
          )
          .eq("id", userId)
          .single(),
        supabase.rpc("get_my_contact_info"),
      ]);
      if (!mountedRef.current) return;
      if (data) {
        const contactRow = Array.isArray(contact) ? contact[0] : contact;
        setProfile({
          ...(data as unknown as Profile),
          email: contactRow?.email ?? null,
          phone: contactRow?.phone ?? "",
        });
      }
    })().finally(() => {
      if (fetchingProfileRef.current === request) fetchingProfileRef.current = null;
    });
    fetchingProfileRef.current = request;
    return request;
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    mountedRef.current = true;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "TOKEN_REFRESHED") {
          return;
        }
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          // Use setTimeout to avoid potential deadlock with Supabase auth
          setTimeout(() => fetchProfile(session.user.id), 0);
        } else {
          setProfile(null);
        }
        // Only set loading false here if we've already initialized via getSession
        // or if this is a subsequent event (sign in/out)
        if (initializedRef.current) {
          setLoading(false);
        }
      }
    );

    // Then get initial session - this is the primary initialization path
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mountedRef.current) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      initializedRef.current = true;
      setLoading(false);
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, displayName: string, role: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName, primary_role: role },
        emailRedirectTo: window.location.origin,
      },
    });
    if (!error) {
      // Update the profile role after signup trigger creates it
      const { data: { user: newUser } } = await supabase.auth.getUser();
      if (newUser) {
        await supabase.from("profiles").update({ primary_role: role, display_name: displayName }).eq("id", newUser.id);
      }
    }
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    // Clear React state immediately so route guards redirect to /login even
    // if the network call below is slow or fails.
    setProfile(null);
    setUser(null);
    setSession(null);
    clearRole();

    // Best-effort global revoke (invalidates refresh tokens server-side).
    try {
      await supabase.auth.signOut({ scope: "global" });
    } catch {
      // ignore — we still clear local storage below
    }
    // Always force a local sign-out so the refresh token cannot silently
    // restore the session on the next page load / in another tab.
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // ignore
    }

    // Defensive cleanup: remove any leftover Supabase auth keys from
    // localStorage AND sessionStorage (covers cases where signOut bailed
    // before clearing them, or other tabs/storages).
    try {
      const isAuthKey = (k: string | null) =>
        !!k && (k.startsWith("sb-") || k.includes("supabase.auth") || k.startsWith("thwesat_"));
      for (const storage of [localStorage, sessionStorage]) {
        const keys: string[] = [];
        for (let i = 0; i < storage.length; i++) {
          const k = storage.key(i);
          if (isAuthKey(k)) keys.push(k as string);
        }
        keys.forEach((k) => storage.removeItem(k));
      }
    } catch {
      // ignore storage access errors
    }

    // Clear any auth-related cookies on the current domain (Supabase usually
    // uses localStorage, but third-party / custom-domain setups may write
    // cookies — wipe anything that looks auth-related).
    try {
      const cookies = document.cookie ? document.cookie.split(";") : [];
      for (const c of cookies) {
        const name = c.split("=")[0]?.trim();
        if (!name) continue;
        if (name.startsWith("sb-") || name.includes("supabase") || name.startsWith("thwesat_")) {
          const host = window.location.hostname;
          const paths = ["/", window.location.pathname];
          const domains = ["", host, `.${host}`, `.${host.split(".").slice(-2).join(".")}`];
          for (const path of paths) {
            for (const domain of domains) {
              document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}${domain ? `; domain=${domain}` : ""}`;
            }
          }
        }
      }
    } catch {
      // ignore
    }

    // Drop any cached query data so a different account can't see stale rows.
    try {
      const { QueryClient } = await import("@tanstack/react-query");
      // Access the singleton via window if available — otherwise no-op.
      const qc = (window as any).__APP_QUERY_CLIENT__ as InstanceType<typeof QueryClient> | undefined;
      qc?.clear();
    } catch {
      // ignore
    }

    // Force a hard reload to /login so every in-memory store, hook, and
    // service worker cache is reset.
    try {
      window.location.replace("/login");
    } catch {
      // ignore
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signUp, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
