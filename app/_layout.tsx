import {
    DarkTheme,
    DefaultTheme,
    ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";

// import OnboardingTour from '@/components/onboarding-tour';
import AppSplashScreen from "@/components/splash-screen";
import LanguagePickerScreen from "@/components/language-picker-screen";
import { LanguageProvider, useLanguage } from "@/contexts/language-context";
import { ToastProvider } from "@/contexts/toast-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { offlineStorage } from "@/services/offlineStorage";

export const unstable_settings = {
  anchor: "(tabs)",
};

function RootContent() {
  const colorScheme = useColorScheme();
  const [isSplashReady, setIsSplashReady] = useState(false);
  const { language, isLoading } = useLanguage();

  // Initialize offline storage on app startup
  useEffect(() => {
    offlineStorage.initialize().catch((error) => {
      console.error("Failed to initialize offline storage:", error);
    });
  }, []);

  return (
    <ThemeProvider
      value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
    >
      {!isSplashReady && (
        <AppSplashScreen onFinish={() => setIsSplashReady(true)} />
      )}
      {isSplashReady && !isLoading && !language && (
        <LanguagePickerScreen />
      )}
      {isSplashReady && !isLoading && language && (
        <>
          <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen
                  name="auth"
                  options={{ headerShown: false, presentation: "modal" }}
                />
                <Stack.Screen
                  name="lesson-player"
                  options={{ headerShown: false, presentation: "card" }}
                />
                <Stack.Screen
                  name="subscription"
                  options={{ headerShown: false, presentation: "modal" }}
                />
                <Stack.Screen
                  name="modal"
                  options={{ presentation: "modal", title: "Modal" }}
                />
              </Stack>
          <StatusBar style="auto" />
          {/* <OnboardingTour /> */}
        </>
      )}
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ToastProvider>
        <LanguageProvider>
          <RootContent />
        </LanguageProvider>
      </ToastProvider>
    </SafeAreaProvider>
  );
}
