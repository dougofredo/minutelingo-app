import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

const STORAGE_KEY = '@minutelingo/username';

/** Avoid using AsyncStorage when `window` is undefined (e.g. Node/SSR during export). */
const isStorageAvailable = typeof window !== 'undefined';

interface ProfileContextType {
  username: string | null;
  setUsername: (name: string | null) => Promise<void>;
  isLoading: boolean;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [username, setUsernameState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isStorageAvailable) {
      setIsLoading(false);
      return;
    }
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored && stored.trim().length > 0) {
        setUsernameState(stored.trim());
      } else {
        setUsernameState(null);
      }
      setIsLoading(false);
    });
  }, []);

  const setUsername = useCallback(async (name: string | null) => {
    const value = name?.trim() || null;
    setUsernameState(value);
    if (!isStorageAvailable) return;
    if (value) {
      await AsyncStorage.setItem(STORAGE_KEY, value);
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  return (
    <ProfileContext.Provider value={{ username, setUsername, isLoading }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (ctx === undefined) {
    throw new Error('useProfile must be used within ProfileProvider');
  }
  return ctx;
}

