import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useToast } from "@/contexts/toast-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { touchProfileForWebhook } from "@/lib/touch-profile-for-webhook";
import { supabase } from "@/supabaseClient";
import { makeRedirectUri } from "expo-auth-session";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Required for web only
WebBrowser.maybeCompleteAuthSession();

// Create session from URL (Supabase auth callback)
const createSessionFromUrl = async (url: string) => {
  try {
    const { params, errorCode } = QueryParams.getQueryParams(url);

    if (errorCode) {
      throw new Error(errorCode);
    }

    const { access_token, refresh_token } = params;

    if (!access_token) {
      return;
    }

    const { data, error } = await supabase.auth.setSession({
      access_token: access_token as string,
      refresh_token: refresh_token as string,
    });

    if (error) {
      throw error;
    }

    if (data.session?.user?.id) {
      touchProfileForWebhook(data.session.user.id);
    }
    return data.session;
  } catch (error: any) {
    console.error("Error creating session from URL:", error);
    throw error;
  }
};

export default function AuthScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const router = useRouter();
  const { showError, showSuccess } = useToast();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const insets = useSafeAreaInsets();

  // Get redirect URI for deep linking
  // Use the app's custom scheme to ensure it opens in the app, not browser
  const redirectTo = makeRedirectUri({
    scheme: "minutelingo",
    path: "auth",
  });

  // Log the redirect URL for debugging (so you can add it to Supabase)
  useEffect(() => {
    if (__DEV__) {
      console.log("🔗 Redirect URL:", redirectTo);
      console.log("📝 Add this URL to Supabase Redirect URLs:", redirectTo);
    }
  }, [redirectTo]);

  // Handle deep link from email (magic link)
  const url = Linking.useURL();

  // Also check for initial URL when app opens from deep link
  useEffect(() => {
    Linking.getInitialURL().then((initialUrl) => {
      if (initialUrl) {
        console.log("🔗 Initial URL:", initialUrl);
        createSessionFromUrl(initialUrl)
          .then((session) => {
            if (session?.user?.email) {
              setUserEmail(session.user.email);
              setEmailSent(false);
              setEmail("");
            }
          })
          .catch((error: any) => {
            console.error("Error processing initial URL:", error);
          });
      }
    });
  }, []);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user?.email) {
        setUserEmail(session.user.email);
        // If already logged in, navigate to home
        router.replace("/(tabs)");
      }
    };
    checkSession();
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Only touch profile on actual sign-in; skip TOKEN_REFRESHED / INITIAL_SESSION to avoid random webhook spam
      if (event === 'SIGNED_IN' && session?.user?.id) {
        touchProfileForWebhook(session.user.id);
      }
      if (session?.user?.email) {
        setUserEmail(session.user.email);
        setEmailSent(false);
        setEmail("");
        // Navigate to home page after successful login
        setTimeout(() => {
          router.replace("/(tabs)");
        }, 500);
      } else {
        setUserEmail(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (url) {
      createSessionFromUrl(url)
        .then((session) => {
          if (session?.user?.email) {
            setUserEmail(session.user.email);
            setEmailSent(false);
            setEmail("");
            // Navigate to home page after successful login
            setTimeout(() => {
              router.replace("/(tabs)");
            }, 500);
          }
        })
        .catch((error: any) => {
          showError(error.message || "Failed to process authentication link");
        });
    }
  }, [url]);

  const handleMagicLink = async () => {
    if (!email) {
      showError("Please enter your email");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    if (__DEV__) {
      console.log("🔐 Sending magic link to:", email, "redirectTo:", redirectTo);
    }
    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (error) {
        if (__DEV__) console.warn("Magic link error:", error.message, error);
        showError(error.message || "An error occurred");
        Alert.alert("Sign in failed", error.message || "Could not send magic link. Try again.");
        return;
      }

      if (__DEV__) console.log("✅ Magic link sent:", data);
      setEmailSent(true);
      showSuccess("We sent you a magic link! Check your email to sign in.");
    } catch (error: any) {
      const msg = error?.message || "An error occurred";
      if (__DEV__) console.error("Magic link exception:", error);
      showError(msg);
      Alert.alert("Sign in failed", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <ThemedView style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <IconSymbol name="xmark" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </ThemedView>
        <ThemedView style={styles.content}>
          <ThemedText type="title" style={styles.title}>
            Sign In
          </ThemedText>

          {userEmail ? (
            <ThemedView style={styles.loggedInContainer}>
              <ThemedText type="subtitle" style={styles.welcomeText}>
                Hello {userEmail}
              </ThemedText>
              <ThemedText style={styles.successText}>
                You&apos;re all set! You can now access all features.
              </ThemedText>
              <TouchableOpacity
                style={[styles.button, { marginTop: 20 }]}
                onPress={() => router.replace("/(tabs)")}
              >
                <ThemedText style={styles.buttonText}>Continue</ThemedText>
              </TouchableOpacity>
            </ThemedView>
          ) : emailSent ? (
            <ThemedView style={styles.emailSentContainer}>
              <ThemedText style={styles.emailSentText}>
                We sent a magic link to:
              </ThemedText>
              <ThemedText style={styles.emailAddress}>{email}</ThemedText>
              <ThemedText style={styles.emailSentInstructions}>
                Check your email and click the link to sign in. The link will
                open this app automatically.
              </ThemedText>
              <TouchableOpacity
                style={[styles.button, { marginTop: 20 }]}
                onPress={() => {
                  setEmailSent(false);
                  setEmail("");
                }}
              >
                <ThemedText style={styles.buttonText}>
                  Use a different email
                </ThemedText>
              </TouchableOpacity>
            </ThemedView>
          ) : (
            <>
              <ThemedView style={styles.inputContainer}>
                <ThemedText style={styles.label}>Email</ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    { color: colors.text, borderColor: colors.icon },
                  ]}
                  placeholder="Enter your email"
                  placeholderTextColor={colors.icon}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  editable={!loading}
                />
              </ThemedView>

              <ThemedText style={styles.description}>
                We&apos;ll send you a magic link to sign in. No password needed!
              </ThemedText>

              <TouchableOpacity
                style={styles.button}
                onPress={handleMagicLink}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#000000" />
                ) : (
                  <ThemedText style={styles.buttonText}>
                    Send Magic Link
                  </ThemedText>
                )}
              </TouchableOpacity>
            </>
          )}
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 20,
  },
  backButton: {
    padding: 4,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  content: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
  },
  title: {
    marginBottom: 32,
    textAlign: "center",
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "transparent",
  },
  button: {
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    minHeight: 50,
    backgroundColor: "#FFF9E6", // Yellow color matching splash screen
  },
  buttonText: {
    color: "#000000", // Black text
    fontSize: 16,
    fontWeight: "600",
  },
  description: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: "center",
    opacity: 0.7,
  },
  emailSentContainer: {
    alignItems: "center",
    padding: 20,
  },
  emailSentText: {
    fontSize: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  emailAddress: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 20,
    textAlign: "center",
  },
  emailSentInstructions: {
    fontSize: 14,
    textAlign: "center",
    opacity: 0.7,
    marginBottom: 20,
  },
  loggedInContainer: {
    alignItems: "center",
    padding: 20,
  },
  welcomeText: {
    marginBottom: 12,
    textAlign: "center",
  },
  successText: {
    fontSize: 14,
    textAlign: "center",
    opacity: 0.7,
    marginBottom: 8,
  },
});
