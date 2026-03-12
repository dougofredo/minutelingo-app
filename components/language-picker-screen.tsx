import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ALL_LANGUAGES, ONBOARDING_LANGUAGES } from '@/constants/languages';
import { Colors } from '@/constants/theme';
import { useLanguage } from '@/contexts/language-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function LanguagePickerScreen() {
  const { language, setLanguage } = useLanguage();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

  const handleSelect = async (code: (typeof ALL_LANGUAGES)[number]['code']) => {
    await setLanguage(code);
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
      <ThemedText type="title" style={styles.title}>
        Choose The Language
      </ThemedText>
      <ThemedText style={styles.subtitle}>
        Select the language you want to learn. You can always change this later.
      </ThemedText>
      <ThemedView style={styles.options}>
        {ONBOARDING_LANGUAGES.map(({ code, label }) => {
          const isSelected = language === code;
          return (
          <TouchableOpacity
            key={code}
            style={[
              styles.option,
              {
                borderColor: isSelected ? colors.tint : colors.icon,
                backgroundColor: isSelected ? colors.tint : colors.background,
              },
            ]}
            onPress={() => handleSelect(code)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Select ${label}`}
          >
            <ThemedText type="defaultSemiBold" style={styles.optionLabel}>
              {label}
            </ThemedText>
            <ThemedText style={styles.optionHint}>
              Tap to continue
            </ThemedText>
          </TouchableOpacity>
          );
        })}
      </ThemedView>
    </ThemedView>
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
    marginBottom: 32,
  },
  options: {
    gap: 16,
  },
  option: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 20,
  },
  optionLabel: {
    fontSize: 18,
    marginBottom: 4,
  },
  optionHint: {
    fontSize: 14,
    opacity: 0.6,
  },
});
