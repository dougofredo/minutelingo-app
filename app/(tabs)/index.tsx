import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { getLessonsForLanguage, type Lesson } from '@/data/lessons-fr';
import { useLanguage } from '@/contexts/language-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const R2_PUBLIC_URL = process.env.EXPO_PUBLIC_R2_PUBLIC_URL || '';

function buildImageUrl(path: string | null): string | null {
  if (!path || !R2_PUBLIC_URL) return null;
  const base = R2_PUBLIC_URL.endsWith('/') ? R2_PUBLIC_URL.slice(0, -1) : R2_PUBLIC_URL;
  return `${base}/${path}`;
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();

  const lessons = useMemo(() => {
    if (!language) return [];
    return getLessonsForLanguage(language);
  }, [language]);

  const handleLessonPress = (lesson: Lesson) => {
    router.push({
      pathname: '/lesson-player',
      params: { lesson: JSON.stringify(lesson) },
    });
  };

  const renderLessonItem = ({ item }: { item: Lesson }) => {
    const imageUrl = buildImageUrl(item.image);
    const subtitle =
      item.dialog != null && item.block != null
        ? `Dialog ${item.dialog} · Part ${item.block}`
        : null;

    return (
      <TouchableOpacity
        onPress={() => handleLessonPress(item)}
        activeOpacity={0.7}
        style={styles.lessonCardContainer}
      >
        <ThemedView style={[styles.lessonCard, { borderColor: colors.icon }]}>
          {imageUrl ? (
            <ThemedView style={styles.coverImageContainer}>
              <Image
                source={{ uri: imageUrl }}
                style={styles.coverImage}
                contentFit="cover"
                placeholderContentFit="cover"
                transition={200}
              />
            </ThemedView>
          ) : (
            <ThemedView style={[styles.coverImageContainer, styles.coverPlaceholder]}>
              <ThemedText style={styles.coverPlaceholderText}>Lesson {item.lesson}</ThemedText>
            </ThemedView>
          )}
          <ThemedView style={styles.lessonInfo}>
            <ThemedText type="defaultSemiBold" style={styles.lessonTitle} numberOfLines={2}>
              Lesson {item.lesson}
            </ThemedText>
            {subtitle && (
              <ThemedText style={styles.lessonSubtitle} numberOfLines={1}>
                {subtitle}
              </ThemedText>
            )}
          </ThemedView>
        </ThemedView>
      </TouchableOpacity>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Image
          source={require('@/assets/images/logo-small.png')}
          style={styles.headerLogo}
          contentFit="contain"
        />
        <ThemedText type="title" style={styles.headerTitle}>
          Lessons
        </ThemedText>
      </ThemedView>
      <FlatList
        data={lessons}
        renderItem={renderLessonItem}
        keyExtractor={(item) => `lesson-${item.lesson}`}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.row}
        ListEmptyComponent={
          <ThemedView style={styles.emptyContainer}>
            <ThemedText style={styles.emptyText}>No lessons yet. Pick a language to get started.</ThemedText>
          </ThemedView>
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    gap: 12,
  },
  headerLogo: {
    width: 32,
    height: 32,
  },
  headerTitle: {
    marginBottom: 0,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  row: {
    justifyContent: 'space-between',
  },
  lessonCardContainer: {
    width: '48%',
    marginBottom: 16,
  },
  lessonCard: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  coverImageContainer: {
    width: '100%',
    aspectRatio: 1,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverPlaceholderText: {
    opacity: 0.5,
    fontSize: 12,
  },
  lessonInfo: {
    padding: 12,
  },
  lessonTitle: {
    fontSize: 14,
    marginBottom: 4,
  },
  lessonSubtitle: {
    fontSize: 12,
    opacity: 0.7,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.5,
  },
});
