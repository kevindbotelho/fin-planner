import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  subscription_tier: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: Profile | null;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (firstName: string, lastName: string) => Promise<{ error: any }>;
  upgradeToPremium: () => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      return data;
    } catch (err) {
      console.error('Unexpected error fetching profile:', err);
      return null;
    }
  };

  const fetchAndSetProfile = async (userId: string) => {
    try {
      const data = await fetchProfile(userId);
      if (data) {
        setProfile(data);
      } else {
        // Fallback robusto se o profile ainda não foi criado pelo trigger
        const { data: inserted, error: insertError } = await supabase
          .from('profiles')
          .insert({ id: userId, first_name: '', last_name: '', subscription_tier: 'Prime' })
          .select()
          .single();
        if (!insertError && inserted) {
          setProfile(inserted);
        }
      }
    } catch (err) {
      console.error('Error in fetchAndSetProfile:', err);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        setLoading(false); // Libera o loading do app imediatamente

        if (currentUser) {
          fetchAndSetProfile(currentUser.id);
        } else {
          setProfile(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setLoading(false); // Libera o loading do app imediatamente

      if (currentUser) {
        fetchAndSetProfile(currentUser.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const updateProfile = async (firstName: string, lastName: string) => {
    if (!user) return { error: new Error('User not logged in') };
    
    const { data, error } = await supabase
      .from('profiles')
      .update({ first_name: firstName, last_name: lastName })
      .eq('id', user.id)
      .select()
      .single();
      
    if (!error && data) {
      setProfile(data);
    }
    return { error };
  };

  const upgradeToPremium = async () => {
    if (!user) return { error: new Error('User not logged in') };
    
    const { data, error } = await supabase
      .from('profiles')
      .update({ subscription_tier: 'Premium' })
      .eq('id', user.id)
      .select()
      .single();
      
    if (!error && data) {
      setProfile(data);
    }
    return { error };
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      profile,
      signUp,
      signIn,
      signOut,
      updateProfile,
      upgradeToPremium,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
