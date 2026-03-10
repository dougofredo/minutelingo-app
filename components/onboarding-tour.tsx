import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { isFree } from '@/constants/config';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useOnboardingTour } from '@/hooks/use-onboarding-tour';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Dimensions, Modal, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  targetScreen?: string;
}

const TOUR_STEPS_BASE: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to MinuteLingo!',
    description: 'Learn languages in bite-sized lessons. Let\'s take a quick tour of the app.',
    icon: 'book.fill',
  },
  {
    id: 'home',
    title: 'Browse Your Library',
    description: 'The Home tab shows all available lessons. Tap any item to start learning.',
    icon: 'house.fill',
    targetScreen: '(tabs)/index',
  },
  {
    id: 'player',
    title: 'Customize Your Experience',
    description: 'In the player, you can work through lessons and track your progress.',
    icon: 'play.circle.fill',
  },
  {
    id: 'account',
    title: 'Manage Your Account',
    description: 'Visit the Account tab to sign in, purchase premium, and access all features.',
    icon: 'person.fill',
    targetScreen: '(tabs)/user',
  },
  {
    id: 'subscription',
    title: 'Unlock Premium',
    description: 'Purchase premium to get lifetime access to all content with a one-time purchase.',
    icon: 'star.fill',
  },
];

function getTourSteps(): TourStep[] {
  if (isFree) {
    return TOUR_STEPS_BASE.filter((s) => s.id !== 'subscription').map((step) =>
      step.id === 'account'
        ? { ...step, description: 'Visit the Account tab to sign in and access your profile.' }
        : step
    );
  }
  return TOUR_STEPS_BASE;
}

export default function OnboardingTour() {
  const { showTour, completeTour } = useOnboardingTour();
  const [currentStep, setCurrentStep] = useState(0);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  if (!showTour) return null;

  const tourSteps = getTourSteps();
  const currentStepData = tourSteps[currentStep];
  const isLastStep = currentStep === tourSteps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = async () => {
    await completeTour();
  };

  const handleNavigateToScreen = () => {
    if (currentStepData.targetScreen) {
      router.push(`/${currentStepData.targetScreen}` as any);
    }
  };

  return (
    <Modal
      visible={showTour}
      transparent
      animationType="fade"
      onRequestClose={handleSkip}
    >
      <View style={styles.container}>
        {/* Overlay */}
        <Pressable style={styles.overlay} onPress={handleSkip} />

        {/* Content Card */}
        <ThemedView style={[styles.card, { backgroundColor: colors.background }]}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Icon */}
            <ThemedView style={[styles.iconContainer, { backgroundColor: hexToRgba(colors.tint, 0.1) }]}>
              <IconSymbol
                name={currentStepData.icon as any}
                size={64}
                color={colors.tint}
              />
            </ThemedView>

            {/* Title */}
            <ThemedText type="title" style={styles.title}>
              {currentStepData.title}
            </ThemedText>

            {/* Description */}
            <ThemedText style={styles.description}>
              {currentStepData.description}
            </ThemedText>

            {/* Step Indicator */}
            <View style={styles.stepIndicator}>
              {tourSteps.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.stepDot,
                    {
                      backgroundColor: index === currentStep ? colors.tint : colors.icon,
                      opacity: index === currentStep ? 1 : 0.3,
                    },
                  ]}
                />
              ))}
            </View>
          </ScrollView>

          {/* Navigation Buttons */}
          <View style={styles.buttonContainer}>
            {!isFirstStep && (
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={handlePrevious}
              >
                <ThemedText style={[styles.buttonText, { color: colors.text }]}>
                  Previous
                </ThemedText>
              </TouchableOpacity>
            )}

            <View style={styles.buttonSpacer} />

            <TouchableOpacity
              style={[styles.button, styles.skipButton]}
              onPress={handleSkip}
            >
              <ThemedText style={[styles.buttonText, { color: colors.text, opacity: 0.6 }]}>
                Skip
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.primaryButton, { backgroundColor: colors.tint }]}
              onPress={handleNext}
            >
              <ThemedText style={[styles.buttonText, styles.primaryButtonText]}>
                {isLastStep ? 'Get Started' : 'Next'}
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* Optional: Navigate to screen button for relevant steps */}
          {currentStepData.targetScreen && (
            <TouchableOpacity
              style={[styles.navigateButton, { borderColor: colors.tint }]}
              onPress={handleNavigateToScreen}
            >
              <IconSymbol name="arrow.right.circle.fill" size={20} color={colors.tint} />
              <ThemedText style={[styles.navigateButtonText, { color: colors.tint }]}>
                Go to {currentStepData.id === 'home' ? 'Home' : 'Account'}
              </ThemedText>
            </TouchableOpacity>
          )}
        </ThemedView>
      </View>
    </Modal>
  );
}

// Helper function to convert hex to rgba
const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  card: {
    width: SCREEN_WIDTH * 0.9,
    maxWidth: 400,
    borderRadius: 24,
    padding: 24,
    maxHeight: SCREEN_HEIGHT * 0.8,
    boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
    elevation: 8,
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 16,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    textAlign: 'center',
    marginBottom: 12,
    fontSize: 24,
  },
  description: {
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.8,
    marginBottom: 24,
  },
  stepIndicator: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  skipButton: {
    backgroundColor: 'transparent',
  },
  primaryButton: {
    minWidth: 100,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
  buttonSpacer: {
    width: 8,
  },
  navigateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  navigateButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});






