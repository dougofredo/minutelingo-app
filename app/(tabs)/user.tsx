import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { isFree } from '@/constants/config';
import { Colors } from '@/constants/theme';
import { useToast } from '@/contexts/toast-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSubscription } from '@/hooks/use-subscription';
import { supabase } from '@/supabaseClient';
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DELETE_ACCOUNT_URL = 'https://www.minutelingo.com/delete-account';

export default function UserScreen() {
  const { showError, showSuccess } = useToast();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const { subscriptionStatus, restorePurchases } = useSubscription();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        setUserEmail(session.user.email);
      }
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email) {
        setUserEmail(session.user.email);
      } else {
        setUserEmail(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUserEmail(null);
      showSuccess('Signed out successfully');
    } catch (error: any) {
      showError(error.message || 'Failed to sign out');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = () => {
    router.push('/auth');
  };

  const handleDeleteAccount = async () => {
    try {
      await openBrowserAsync(DELETE_ACCOUNT_URL, {
        presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
      });
    } catch (error: any) {
      showError(error.message || 'Could not open delete account page');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <ThemedText type="title" style={styles.headerTitle}>
          Account
        </ThemedText>
      </ThemedView>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {userEmail ? (
          <ThemedView style={styles.userInfo}>
            <ThemedView style={styles.userIconContainer}>
              <IconSymbol name="person.fill" size={48} color={colors.tint} />
            </ThemedView>
            <ThemedText type="subtitle" style={styles.userEmail}>
              {userEmail}
            </ThemedText>
          </ThemedView>
        ) : (
          <ThemedView style={styles.userInfo}>
            <ThemedView style={styles.userIconContainer}>
              <IconSymbol name="person.fill" size={48} color={colors.icon} />
            </ThemedView>
            <ThemedText type="subtitle" style={styles.notSignedInText}>
              Not signed in
            </ThemedText>
            <TouchableOpacity style={styles.button} onPress={handleSignIn}>
              <ThemedText style={styles.buttonText}>Sign In</ThemedText>
            </TouchableOpacity>
            {!isFree && (
              <ThemedText style={styles.optionalSignInHint}>
                Sign in to access your premium on all your devices.
              </ThemedText>
            )}
          </ThemedView>
        )}

        {!isFree && (
        <ThemedView style={styles.subscriptionCard}>
          <ThemedView style={styles.subscriptionHeader}>
            <IconSymbol
              name={subscriptionStatus.isSubscribed && subscriptionStatus.isActive ? 'checkmark.circle.fill' : 'star.fill'}
              size={24}
              color={subscriptionStatus.isSubscribed && subscriptionStatus.isActive ? '#4CAF50' : colors.tint}
            />
            <ThemedText type="subtitle" style={styles.subscriptionTitle}>
              {subscriptionStatus.isSubscribed && subscriptionStatus.isActive ? 'Premium Active' : 'Premium'}
            </ThemedText>
          </ThemedView>
          <ThemedText style={styles.subscriptionText}>
            {subscriptionStatus.isSubscribed && subscriptionStatus.isActive
              ? 'Premium active — enjoy unlimited access to all content!'
              : 'Unlock all 100+ stories with a one-time purchase. No account required.'}
          </ThemedText>
          <TouchableOpacity
            style={[styles.subscriptionButton, { backgroundColor: colors.tint }]}
            onPress={() => router.push('/subscription')}
            accessible={true}
            accessibilityLabel={subscriptionStatus.isSubscribed && subscriptionStatus.isActive ? 'View Premium' : 'Purchase Premium'}
            accessibilityRole="button"
          >
            <ThemedText style={styles.subscriptionButtonText}>
              {subscriptionStatus.isSubscribed && subscriptionStatus.isActive ? 'View Premium' : 'Purchase Premium'}
            </ThemedText>
          </TouchableOpacity>
          {subscriptionStatus.isSubscribed && subscriptionStatus.isActive && (
            <TouchableOpacity
              style={styles.restoreButton}
              onPress={async () => {
                setLoading(true);
                try {
                  await restorePurchases();
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
            >
              <ThemedText style={styles.restoreButtonText}>
                {loading ? 'Restoring...' : 'Restore Purchases'}
              </ThemedText>
            </TouchableOpacity>
          )}
        </ThemedView>
        )}

        {userEmail && (
          <>
            <TouchableOpacity
              style={styles.button}
              onPress={handleSignOut}
              disabled={loading}
            >
              <ThemedText style={styles.buttonText}>
                {loading ? 'Signing out...' : 'Sign Out'}
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteAccountLink}
              onPress={handleDeleteAccount}
              disabled={loading}
            >
              <ThemedText style={styles.deleteAccountLinkText}>
                Delete my account
              </ThemedText>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    marginBottom: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    alignItems: 'center',
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 20,
  },
  userIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  userEmail: {
    textAlign: 'center',
  },
  notSignedInText: {
    textAlign: 'center',
    opacity: 0.7,
  },
  optionalSignInHint: {
    textAlign: 'center',
    fontSize: 13,
    opacity: 0.6,
    marginTop: 12,
    paddingHorizontal: 24,
  },
  button: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
    minHeight: 50,
    backgroundColor: '#FFF9E6', // Yellow color matching splash screen
  },
  buttonText: {
    color: '#000000', // Black text
    fontSize: 16,
    fontWeight: '600',
  },
  subscriptionCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    width: '100%',
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  subscriptionTitle: {
    marginLeft: 8,
  },
  subscriptionText: {
    marginBottom: 16,
    opacity: 0.7,
    fontSize: 14,
  },
  subscriptionButton: {
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  subscriptionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  restoreButton: {
    marginTop: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 8,
  },
  restoreButtonText: {
    fontSize: 14,
    opacity: 0.7,
  },
  deleteAccountLink: {
    marginTop: 24,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  deleteAccountLinkText: {
    fontSize: 14,
    opacity: 0.7,
    textDecorationLine: 'underline',
  },
});

