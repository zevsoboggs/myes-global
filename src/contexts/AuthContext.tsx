import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role?: 'buyer' | 'realtor',
    phone?: string,
    agencyName?: string,
    licenseNumber?: string,
  ) => Promise<{ data: any; error: any }>;
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signOut: () => Promise<{ error: any }>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ data: any; error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Защита от бесконечной загрузки - максимум 5 секунд
    const failsafeTimer = setTimeout(() => {
      if (mounted && loading) {
        console.warn('Auth initialization timeout - forcing initialization complete');
        setLoading(false);
        setInitialized(true);
      }
    }, 5000);

    // Получить текущего пользователя при инициализации
    const initializeAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();

        if (mounted) {
          if (user && !error) {
            setUser(user);
            // Добавляем таймаут для fetchProfile в инициализации
            Promise.race([
              fetchProfile(user.id),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Initial profile fetch timeout')), 3000)
              )
            ]).catch((error) => {
              console.error('Initial profile fetch failed or timed out:', error);
              setLoading(false);
            }).finally(() => {
              setInitialized(true);
            });
          } else {
            setLoading(false);
            setInitialized(true);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    initializeAuth();

    // Подписка на изменения аутентификации
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.email, {
        initialized,
        hasProfile: !!profile,
        profileId: profile?.id,
        sessionUserId: session?.user?.id,
        loading
      });

      if (mounted) {
        const sessionUser = session?.user ?? null;
        setUser(sessionUser);

        if (sessionUser) {
          // Только загружаем профиль если еще не инициализировались или это новый пользователь
          if (!initialized || !profile || profile.id !== sessionUser.id) {
            console.log('Fetching profile for user:', sessionUser.id);
            // Добавляем таймаут для fetchProfile
            Promise.race([
              fetchProfile(sessionUser.id),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Profile fetch timeout')), 3000)
              )
            ]).catch((error) => {
              console.error('Profile fetch failed or timed out:', error);
              setLoading(false);
            });
          } else if (initialized && profile && profile.id === sessionUser.id) {
            // Если уже инициализированы и тот же пользователь - просто сбрасываем loading
            console.log('User already initialized, setting loading to false');
            setLoading(false);
          }
        } else {
          console.log('No session user, clearing profile');
          setProfile(null);
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(failsafeTimer);
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    console.log('fetchProfile called for userId:', userId);
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      console.log('Profile fetch result:', { data, error });

      if (error) {
        console.error('Profile fetch error:', error);
        // Если профиль не найден, создать базовый профиль
        if (error.code === 'PGRST116') {
          console.log('Profile not found, creating initial profile');
          await createInitialProfile(userId);
          return;
        }
        throw error;
      }

      console.log('Setting profile data:', data);
      setProfile(data);
    } catch (error) {
      console.error('Ошибка загрузки профиля:', error);
    } finally {
      console.log('fetchProfile finally: setting loading to false');
      setLoading(false);
    }
  };

  const createInitialProfile = async (userId: string) => {
    console.log('createInitialProfile called for userId:', userId);
    try {
      const { data: user } = await supabase.auth.getUser();
      console.log('User data for profile creation:', user);

      if (!user.user) {
        console.log('No user found, cannot create profile');
        return;
      }

      const profileData = {
        id: userId,
        email: user.user.email,
        full_name: user.user.user_metadata?.full_name || '',
        role: user.user.user_metadata?.role || 'buyer',
        phone: user.user.user_metadata?.phone || null,
        agency_name: user.user.user_metadata?.agency_name || null,
        license_number: user.user.user_metadata?.license_number || null,
        is_verified: false,
      };

      console.log('Creating profile with data:', profileData);

      const { data, error } = await supabase
        .from('profiles')
        .insert(profileData)
        .select()
        .single();

      console.log('Profile creation result:', { data, error });

      if (error) throw error;
      console.log('Setting created profile:', data);
      setProfile(data);
    } catch (error) {
      console.error('Ошибка создания профиля:', error);
    } finally {
      console.log('createInitialProfile finally: setting loading to false');
      setLoading(false);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role: 'buyer' | 'realtor' = 'buyer',
    phone?: string,
    agencyName?: string,
    licenseNumber?: string,
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
          phone: phone || null,
          agency_name: agencyName || null,
          license_number: licenseNumber || null,
        },
      },
    });
    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUser(null);
      setProfile(null);
    }
    return { error };
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('Пользователь не авторизован') };

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (!error && data) {
      setProfile(data);
    }

    return { data, error };
  };

  // Не рендерим детей до полной инициализации
  if (!initialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  const value: AuthContextType = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}