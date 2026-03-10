import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';

// Keep the native splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

interface SplashScreenProps {
  onFinish: () => void;
}

export default function AppSplashScreen({ onFinish }: SplashScreenProps) {
  const [isReady, setIsReady] = useState(false);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    // Start animations
    opacity.value = withSequence(
      withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) }),
      withDelay(1500, withTiming(1, { duration: 0 })),
      withTiming(0, { duration: 500, easing: Easing.in(Easing.ease) })
    );

    scale.value = withSequence(
      withTiming(1, { duration: 600, easing: Easing.out(Easing.back(1.2)) }),
      withDelay(1500, withTiming(1, { duration: 0 })),
      withTiming(1.1, { duration: 500, easing: Easing.in(Easing.ease) })
    );

    // Hide native splash screen and finish after animation
    const timer = setTimeout(async () => {
      await SplashScreen.hideAsync();
      setIsReady(true);
      setTimeout(() => {
        onFinish();
      }, 100);
    }, 2600); // Total animation duration

    return () => clearTimeout(timer);
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ scale: scale.value }],
    };
  });

  if (isReady) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoContainer, animatedStyle]}>
        <Image
          source={require('@/assets/images/icon.png')}
          style={styles.logo}
          contentFit="contain"
        />
        <ThemedText type="title" style={[styles.appTitle, { color: '#000000' }]}>
          MinuteLingo
        </ThemedText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFA500', // Orange color
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

