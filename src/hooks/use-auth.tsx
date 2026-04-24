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
  is_premium: boolean;
  remote_ready: boolean;
  has_laptop: boolean;
  internet_stable: boolean;
  has_wise: boolean;
  has_payoneer: boolean;
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
  const fetchingProfileRef = useRef(false);

  const fetchProfile = async (userId: string) => {
    if (fetchingProfileRef.current) return;
    fetchingProfileRef.current = true;
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (!mountedRef.current) return;
      if (data) setProfile(data as Profile);
    } finally {
      fetchingProfileRef.current = false;
    }
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
          console.log("Token refreshed");
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
    await supabase.auth.signOut();
    clearRole();
    setProfile(null);
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
