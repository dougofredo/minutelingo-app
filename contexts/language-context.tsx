import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { ALL_LANGUAGES, type LanguageCode } from '@/constants/languages';
import { updateProfileOnSignIn } from '@/lib/touch-profile-for-webhook';
import { supabase } from '@/supabaseClient';

const STORAGE_KEY = '@minutelingo/selected_language';

/** Avoid using AsyncStorage when `window` is undefined (e.g. Node/SSR during export). */
const isStorageAvailable = typeof window !== 'undefined';

interface LanguageContextType {
  language: LanguageCode | null;
  setLanguage: (code: LanguageCode | null) => Promise<void>;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isStorageAvailable) {
      setIsLoading(false);
      return;
    }
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      const validCodes = new Set(ALL_LANGUAGES.map((l) => l.code));
      if (stored && validCodes.has(stored as LanguageCode)) {
        setLanguageState(stored as LanguageCode);
      } else {
        setLanguageState(null);
      }
      setIsLoading(false);
    });
  }, []);

  const setLanguage = useCallback(async (code: LanguageCode | null) => {
    setLanguageState(code);

    if (isStorageAvailable) {
      if (code) {
        await AsyncStorage.setItem(STORAGE_KEY, code);
      } else {
        await AsyncStorage.removeItem(STORAGE_KEY);
      }
    }

    try {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (userId) {
        await updateProfileOnSignIn({
          userId,
          language: code ?? null,
        });
      }
    } catch (err) {
      // Non-fatal: just log for debugging
      if (__DEV__) {
        console.warn('Failed to sync language to profile', err);
      }
    }
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, isLoading }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (ctx === undefined) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return ctx;
}
