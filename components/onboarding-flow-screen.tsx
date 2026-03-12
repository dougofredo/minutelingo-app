import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import LanguagePickerScreen from '@/components/language-picker-screen';
import { Colors } from '@/constants/theme';
import { useLanguage } from '@/contexts/language-context';
import { useProfile } from '@/contexts/profile-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useState, useEffect } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Step = 'language' | 'username';

export default function OnboardingFlowScreen() {
  const { language } = useLanguage();
  const { username, setUsername } = useProfile();
  const [step, setStep] = useState<Step>('language');
  const [nameInput, setNameInput] = useState(username ?? '');
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (language && !username) {
      setStep('username');
    } else {
      setStep('language');
    }
  }, [language, username]);

  const handleContinue = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    await setUsername(trimmed);
  };

  if (step === 'language') {
    return <LanguagePickerScreen />;
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ThemedView
        style={[
          styles.container,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 },
        ]}
      >
        <ThemedText type="title" style={styles.title}>
          What should we call you?
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Choose a username for your learning journey.
        </ThemedText>
        <TextInput
          value={nameInput}
          onChangeText={setNameInput}
          placeholder="Enter a username"
          placeholderTextColor="rgba(0,0,0,0.3)"
          style={[
            styles.input,
            {
              borderColor: colors.icon,
              backgroundColor: colors.background,
              color: colors.text,
            },
          ]}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={handleContinue}
        />
        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: nameInput.trim()
                ? colors.tint
                : 'rgba(0,0,0,0.1)',
            },
          ]}
          activeOpacity={0.7}
          onPress={handleContinue}
          disabled={!nameInput.trim()}
        >
          <ThemedText style={styles.buttonText}>Continue</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.8,
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  button: {
    marginTop: 24,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

