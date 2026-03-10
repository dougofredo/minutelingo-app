import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

/** Avoid using AsyncStorage when `window` is undefined (e.g. Node/SSR during export). */
const isStorageAvailable = typeof window !== 'undefined'

const storage = isStorageAvailable
  ? AsyncStorage
  : {
      getItem: async () => null,
      setItem: async () => {},
      removeItem: async () => {},
    }

// Debug logging (remove in production if needed)
if (__DEV__ && isStorageAvailable) {
  console.log('Environment variables check:')
  console.log('EXPO_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing')
  console.log('EXPO_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Set' : '❌ Missing')
}

if (!supabaseUrl || !supabaseAnonKey) {
  const missing = []
  if (!supabaseUrl) missing.push('EXPO_PUBLIC_SUPABASE_URL')
  if (!supabaseAnonKey) missing.push('EXPO_PUBLIC_SUPABASE_ANON_KEY')
  throw new Error(
    `Missing required environment variables: ${missing.join(', ')}\n` +
    'Please ensure these are set in your EAS secrets or eas.json configuration.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
