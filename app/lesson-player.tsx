import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useToast } from "@/contexts/toast-context";
import { getLessonsForLanguage, type Lesson } from "@/data/lessons-fr";
import { useLanguage } from "@/contexts/language-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Audio } from "expo-av";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const R2_PUBLIC_URL = process.env.EXPO_PUBLIC_R2_PUBLIC_URL || "";

function buildMediaUrl(path: string | null): string | null {
  if (!path || !R2_PUBLIC_URL) return null;
  const base = R2_PUBLIC_URL.endsWith("/")
    ? R2_PUBLIC_URL.slice(0, -1)
    : R2_PUBLIC_URL;
  return `${base}/${path}`;
}

export default function LessonPlayerScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const insets = useSafeAreaInsets();
  const { showError } = useToast();
   const { language } = useLanguage();

  const lesson: Lesson | null = params.lesson
    ? JSON.parse(params.lesson as string)
    : null;

  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [progressBarWidth, setProgressBarWidth] = useState(0);

  const audioUrl = lesson?.audio ? buildMediaUrl(lesson.audio) : null;
  const imageUrl = lesson?.image ? buildMediaUrl(lesson.image) : null;
  const hasAudio = !!audioUrl;

  const lessonsInLanguage = useMemo(
    () => (language ? getLessonsForLanguage(language) : []),
    [language],
  );

  const currentLessonIndex =
    lesson && lessonsInLanguage.length > 0
      ? lessonsInLanguage.findIndex((l) => l.lesson === lesson.lesson)
      : -1;

  const previousLesson =
    currentLessonIndex > 0 ? lessonsInLanguage[currentLessonIndex - 1] : null;
  const nextLesson =
    currentLessonIndex >= 0 &&
    currentLessonIndex < lessonsInLanguage.length - 1
      ? lessonsInLanguage[currentLessonIndex + 1]
      : null;

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  // Load duration when lesson/audio changes
  useEffect(() => {
    const loadDuration = async () => {
      if (!audioUrl) {
        setDuration(0);
        return;
      }
      try {
        const { sound: metadataSound } = await Audio.Sound.createAsync(
          { uri: audioUrl },
          { shouldPlay: false },
        );
        let attempts = 0;
        const checkStatus = async (): Promise<number | null> => {
          const status = await metadataSound.getStatusAsync();
          if (status.isLoaded && status.durationMillis)
            return status.durationMillis;
          return null;
        };
        let durationMillis = await checkStatus();
        while (!durationMillis && attempts < 50) {
          await new Promise((r) => setTimeout(r, 100));
          durationMillis = await checkStatus();
          attempts++;
        }
        setDuration(durationMillis ?? 0);
        await metadataSound.unloadAsync();
      } catch {
        setDuration(0);
      }
    };
    loadDuration();
  }, [audioUrl]);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (sound && isPlaying) {
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          setPosition(status.positionMillis || 0);
          setDuration(status.durationMillis || 0);
        }
      }
    }, 100);
    return () => clearInterval(interval);
  }, [sound, isPlaying]);

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const loadAndPlay = async () => {
    if (!audioUrl) return;
    try {
      setIsLoading(true);
      if (sound) await sound.unloadAsync();
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true },
      );
      setSound(newSound);
      setIsPlaying(true);
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setIsPlaying(status.isPlaying);
          setPosition(status.positionMillis || 0);
          setDuration(status.durationMillis || 0);
          if (status.didJustFinish) {
            setIsPlaying(false);
            setPosition(0);
          }
        }
      });
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : "Failed to load audio");
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlayPause = async () => {
    if (!sound) {
      await loadAndPlay();
      return;
    }
    try {
      if (isPlaying) await sound.pauseAsync();
      else await sound.playAsync();
    } catch {
      showError("Failed to toggle playback");
    }
  };

  const seekBackward = async () => {
    if (!sound) return;
    const status = await sound.getStatusAsync();
    if (status.isLoaded) {
      const newPosition = Math.max(0, (status.positionMillis || 0) - 10000);
      await sound.setPositionAsync(newPosition);
      setPosition(newPosition);
    }
  };

  const seekForward = async () => {
    if (!sound) return;
    const status = await sound.getStatusAsync();
    if (status.isLoaded) {
      const current = status.positionMillis || 0;
      const max = status.durationMillis || 0;
      const newPosition = Math.min(max, current + 10000);
      await sound.setPositionAsync(newPosition);
      setPosition(newPosition);
    }
  };

  const navigateToLesson = async (target: Lesson | null) => {
    if (!target) return;
    if (sound) {
      try {
        await sound.unloadAsync();
      } catch {
        // ignore unload errors
      }
      setSound(null);
      setIsPlaying(false);
      setPosition(0);
    }
    router.replace({
      pathname: "/lesson-player",
      params: { lesson: JSON.stringify(target) },
    });
  };

  const handleProgressBarPress = async (event: {
    nativeEvent: { locationX: number };
  }) => {
    if (!sound || !progressBarWidth || duration === 0) return;
    const percentage = Math.max(
      0,
      Math.min(1, event.nativeEvent.locationX / progressBarWidth),
    );
    const newPosition = percentage * duration;
    await sound.setPositionAsync(newPosition);
    setPosition(newPosition);
  };

  if (!lesson) {
    return (
      <ThemedView style={styles.container}>
        <ThemedView style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <IconSymbol name="chevron.left" size={24} color={colors.text} />
          </TouchableOpacity>
          <ThemedText type="subtitle" style={styles.headerTitle}>
            Lesson
          </ThemedText>
        </ThemedView>
        <ThemedView style={styles.centerContainer}>
          <ThemedText>Lesson not found</ThemedText>
        </ThemedView>
      </ThemedView>
    );
  }

  const progress = duration > 0 ? position / duration : 0;

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <IconSymbol name="chevron.left" size={24} color={colors.text} />
        </TouchableOpacity>
        <ThemedText type="subtitle" style={styles.headerTitle}>
          Lesson {lesson.lesson}
        </ThemedText>
      </ThemedView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ThemedView style={styles.coverContainer}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.coverImage}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <ThemedView style={[styles.coverImage, styles.coverPlaceholder]}>
              <ThemedText style={styles.coverPlaceholderText}>
                Lesson {lesson.lesson}
              </ThemedText>
            </ThemedView>
          )}
          {hasAudio && (
            <TouchableOpacity
              style={styles.coverPlayButton}
              onPress={togglePlayPause}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <ThemedView style={styles.playButtonOverlay}>
                {isLoading ? (
                  <ActivityIndicator size="large" color="#fff" />
                ) : (
                  <IconSymbol
                    name={isPlaying ? "pause.fill" : "play.fill"}
                    size={48}
                    color="#fff"
                  />
                )}
              </ThemedView>
            </TouchableOpacity>
          )}
        </ThemedView>

        <ThemedView style={styles.lessonInfo}>
          <ThemedText type="title" style={styles.lessonTitle}>
            Lesson {lesson.lesson}
          </ThemedText>
          {lesson.dialog != null && lesson.block != null && (
            <ThemedText style={styles.lessonSubtitle}>
              Dialog {lesson.dialog} · Part {lesson.block}
            </ThemedText>
          )}
          {!hasAudio && (
            <ThemedText style={styles.noAudioText}>
              No audio for this lesson.
            </ThemedText>
          )}
        </ThemedView>

        {hasAudio && (
          <ThemedView style={styles.playerControls}>
            <ThemedView style={styles.progressContainer}>
              <ThemedText style={styles.timeText}>
                {formatTime(position)}
              </ThemedText>
              <TouchableOpacity
                onPress={handleProgressBarPress}
                onLayout={(e) =>
                  setProgressBarWidth(e.nativeEvent.layout.width)
                }
                activeOpacity={1}
                disabled={!sound || duration === 0}
                style={styles.progressBarTouchable}
              >
                <ThemedView
                  style={[
                    styles.progressBarContainer,
                    { backgroundColor: colors.icon },
                  ]}
                >
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width: `${progress * 100}%`,
                        backgroundColor: colors.tint,
                      },
                    ]}
                  />
                </ThemedView>
              </TouchableOpacity>
              <ThemedText style={styles.timeText}>
                {formatTime(duration)}
              </ThemedText>
            </ThemedView>
            <ThemedView style={styles.seekButtonsContainer}>
              <TouchableOpacity
                onPress={() => navigateToLesson(previousLesson)}
                disabled={!previousLesson}
                style={[
                  styles.lessonNavButton,
                  { opacity: previousLesson ? 1 : 0.4 },
                ]}
                activeOpacity={0.7}
              >
                <IconSymbol
                  name="backward.end.fill"
                  size={20}
                  color={colors.tint}
                />
                <ThemedText style={styles.seekButtonLabel}>
                  Prev lesson
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={seekBackward}
                disabled={!sound}
                style={[styles.seekButton, { opacity: sound ? 1 : 0.4 }]}
                activeOpacity={0.7}
              >
                <IconSymbol name="chevron.left" size={20} color={colors.tint} />
                <ThemedText style={styles.seekButtonLabel}>-10s</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={seekForward}
                disabled={!sound}
                style={[styles.seekButton, { opacity: sound ? 1 : 0.4 }]}
                activeOpacity={0.7}
              >
                <IconSymbol
                  name="chevron.right"
                  size={20}
                  color={colors.tint}
                />
                <ThemedText style={styles.seekButtonLabel}>+10s</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigateToLesson(nextLesson)}
                disabled={!nextLesson}
                style={[
                  styles.lessonNavButton,
                  { opacity: nextLesson ? 1 : 0.4 },
                ]}
                activeOpacity={0.7}
              >
                <IconSymbol
                  name="forward.end.fill"
                  size={20}
                  color={colors.tint}
                />
                <ThemedText style={styles.seekButtonLabel}>
                  Next lesson
                </ThemedText>
              </TouchableOpacity>
            </ThemedView>
          </ThemedView>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  backButton: { padding: 4 },
  headerTitle: { flex: 1 },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: { flex: 1 },
  content: {
    alignItems: "center",
    padding: 24,
    paddingBottom: 40,
  },
  coverContainer: { position: "relative", marginBottom: 16 },
  coverImage: {
    width: 280,
    height: 280,
    borderRadius: 16,
  },
  coverPlaceholder: {
    backgroundColor: "rgba(0,0,0,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  coverPlaceholderText: { opacity: 0.5 },
  coverPlayButton: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  playButtonOverlay: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  lessonInfo: { alignItems: "center", marginBottom: 32 },
  lessonTitle: { marginBottom: 8, textAlign: "center" },
  lessonSubtitle: { fontSize: 16, opacity: 0.7, textAlign: "center" },
  noAudioText: { marginTop: 8, opacity: 0.6 },
  playerControls: { width: "100%", gap: 24 },
  progressContainer: { flexDirection: "row", alignItems: "center", gap: 12 },
  timeText: { fontSize: 12, minWidth: 40, textAlign: "center" },
  progressBarTouchable: {
    flex: 1,
    paddingVertical: 8,
    justifyContent: "center",
  },
  progressBarContainer: {
    width: "100%",
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
    opacity: 0.3,
  },
  progressBar: { height: "100%", borderRadius: 2 },
  seekButtonsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    marginTop: 16,
  },
  seekButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 80,
  },
  lessonNavButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    minWidth: 80,
  },
  seekButtonLabel: { fontSize: 12, marginTop: 4, opacity: 0.7 },
});
