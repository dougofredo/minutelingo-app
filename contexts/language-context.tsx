import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

const STORAGE_KEY = '@minutelingo/selected_language';

/** Avoid using AsyncStorage when `window` is undefined (e.g. Node/SSR during export). */
const isStorageAvailable = typeof window !== 'undefined';

export type LanguageCode = 'fr' | null;

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (code: LanguageCode) => Promise<void>;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isStorageAvailable) {
      setIsLoading(false);
      return;
    }
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'fr') {
        setLanguageState('fr');
      }
      setIsLoading(false);
    });
  }, []);

  const setLanguage = useCallback(async (code: LanguageCode) => {
    setLanguageState(code);
    if (!isStorageAvailable) return;
    if (code) {
      await AsyncStorage.setItem(STORAGE_KEY, code);
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
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
