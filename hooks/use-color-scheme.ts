// Centralized color scheme hook for the app.
// Currently we force the app to always use the light theme
// so that the background stays white on all platforms.

export function useColorScheme() {
  return 'light' as const;
}
