import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { offlineStorage, DownloadedBook } from '@/services/offlineStorage';
import { supabase } from '@/supabaseClient';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';

const R2_PUBLIC_URL = process.env.EXPO_PUBLIC_R2_PUBLIC_URL || '';

interface Book {
  book_id: number;
  book_author: string | null;
  book_title: string | null;
  year: number | null;
  genres: string | null;
  folder: string | null;
  is_visible: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  version: number | null;
}

interface BookProgress {
  id: string;
  user_id: string;
  book_folder: string;
  audio_mode: 'taster' | 'full';
  vocabulary_level: 'basic' | 'standard';
  playback_time: number;
  updated_at: string;
  created_at: string;
}

interface BookWithProgress extends Book {
  progress: BookProgress;
}

export default function CatalogueScreen() {
  const [books, setBooks] = useState<Book[]>([]);
  const [booksWithProgress, setBooksWithProgress] = useState<BookWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [downloadedBooks, setDownloadedBooks] = useState<DownloadedBook[]>([]);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const networkStatus = useNetworkStatus();

  const fetchBooks = async () => {
    try {
      // Check if we're offline
      if (!networkStatus.isConnected) {
        setIsOfflineMode(true);
        // Load downloaded books instead
        await loadDownloadedBooks();
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setIsOfflineMode(false);
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .order('book_id', { ascending: true });

      if (error) throw error;

      setBooks(data || []);
    } catch (error: any) {
      console.error('Error fetching books:', error);
      // If network error, try to load downloaded books
      if (!networkStatus.isConnected) {
        setIsOfflineMode(true);
        await loadDownloadedBooks();
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadDownloadedBooks = async () => {
    try {
      console.log('📚 Loading downloaded books...');
      await offlineStorage.initialize();
      const downloaded = await offlineStorage.getDownloadedBooks();
      console.log('📚 Found downloaded books:', downloaded.length);
      setDownloadedBooks(downloaded);
      
      // Convert downloaded books to Book format for display
      const booksFromDownloads: Book[] = downloaded.map(db => ({
        book_id: db.book_id,
        book_title: db.book_title,
        book_author: db.book_author,
        year: null,
        genres: null,
        folder: db.folder,
        is_visible: true,
        created_at: db.downloadedAt,
        updated_at: db.downloadedAt,
        version: null,
      }));
      
      console.log('📚 Converted to Book format:', booksFromDownloads.length);
      setBooks(booksFromDownloads);
      setIsOfflineMode(true);
    } catch (error: any) {
      console.error('❌ Error loading downloaded books:', error);
      setBooks([]);
    }
  };

  // Check authentication and fetch progress
  useEffect(() => {
    const checkAuthAndFetchProgress = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const authenticated = !!session;
      setIsAuthenticated(authenticated);

      if (authenticated && session?.user?.id) {
        await fetchUserProgress(session.user.id);
      } else {
        setBooksWithProgress([]);
      }
    };

    checkAuthAndFetchProgress();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const authenticated = !!session;
      setIsAuthenticated(authenticated);

      if (authenticated && session?.user?.id) {
        await fetchUserProgress(session.user.id);
      } else {
        setBooksWithProgress([]);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Initialize offline storage
    offlineStorage.initialize();
    fetchBooks();
  }, []);

  // Reload when network status changes to show downloaded books when offline
  useEffect(() => {
    if (!networkStatus.isConnected) {
      console.log('📴 Offline mode - loading downloaded books');
      loadDownloadedBooks();
    } else {
      console.log('📶 Online mode - fetching from server');
      fetchBooks();
    }
  }, [networkStatus.isConnected]);

  // Reload when network status changes
  useEffect(() => {
    if (!networkStatus.isConnected) {
      if (books.length === 0 || !isOfflineMode) {
        loadDownloadedBooks();
      }
    } else if (networkStatus.isConnected && isOfflineMode) {
      fetchBooks();
    }
  }, [networkStatus.isConnected]);

  const fetchUserProgress = async (userId: string) => {
    try {
      setLoadingProgress(true);
      const { data: progressData, error: progressError } = await supabase
        .from('user_book_progress')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(10); // Limit to most recent 10

      if (progressError) throw progressError;

      if (!progressData || progressData.length === 0) {
        setBooksWithProgress([]);
        setLoadingProgress(false);
        return;
      }

      // Get unique book folders from progress
      const bookFolders = progressData.map(p => p.book_folder);

      // Fetch books that match the folders
      const { data: booksData, error: booksError } = await supabase
        .from('books')
        .select('*')
        .in('folder', bookFolders);

      if (booksError) throw booksError;

      // Join progress with books
      const booksWithProgressData: BookWithProgress[] = progressData
        .map(progress => {
          const book = booksData?.find(b => b.folder === progress.book_folder);
          if (book) {
            return {
              ...book,
              progress,
            };
          }
          return null;
        })
        .filter((item): item is BookWithProgress => item !== null);

      setBooksWithProgress(booksWithProgressData);
    } catch (error: any) {
      console.error('Error fetching user progress:', error);
      setBooksWithProgress([]);
    } finally {
      setLoadingProgress(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (networkStatus.isConnected) {
      await fetchBooks();
      if (isAuthenticated) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          await fetchUserProgress(session.user.id);
        }
      }
    } else {
      await loadDownloadedBooks();
    }
  };

  const getCoverImageUrl = async (folder: string | null) => {
    if (!folder) return null;
    
    // If offline, try to get local cover
    if (isOfflineMode) {
      const localPath = await offlineStorage.getLocalCoverPath(folder);
      if (localPath) return localPath;
    }
    
    // Fallback to remote
    if (!R2_PUBLIC_URL) return null;
    return `${R2_PUBLIC_URL}/books/${folder}/cover-mini.jpg`;
  };

  const handleBookPress = (book: Book) => {
    router.push({
      pathname: '/book-player',
      params: {
        book: JSON.stringify(book),
      },
    });
  };

  const handleProgressBookPress = (bookWithProgress: BookWithProgress) => {
    // Pass both book and progress data
    router.push({
      pathname: '/book-player',
      params: {
        book: JSON.stringify(bookWithProgress),
        progress: JSON.stringify(bookWithProgress.progress),
      },
    });
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const BookItem = ({ item }: { item: Book }) => {
    const [coverUrl, setCoverUrl] = useState<string | null>(null);
    const isDownloaded = downloadedBooks.some(db => db.folder === item.folder);
    
    useEffect(() => {
      const loadCover = async () => {
        const url = await getCoverImageUrl(item.folder);
        setCoverUrl(url);
      };
      loadCover();
    }, [item.folder, isOfflineMode]);
    
    return (
      <TouchableOpacity
        onPress={() => handleBookPress(item)}
        activeOpacity={0.7}
      >
        <ThemedView style={[styles.bookCard, { borderColor: colors.icon }]}>
          <ThemedView style={styles.bookContent}>
            {coverUrl && (
              <ThemedView style={styles.coverImageContainer}>
                <Image
                  source={{ uri: coverUrl }}
                  style={styles.coverImage}
                  contentFit="cover"
                  placeholderContentFit="cover"
                  transition={200}
                />
                {isDownloaded && (
                  <ThemedView style={styles.downloadedBadge}>
                    <ThemedText style={styles.downloadedBadgeText}>✓</ThemedText>
                  </ThemedView>
                )}
              </ThemedView>
            )}
            <ThemedView style={styles.bookInfo}>
              <ThemedText type="defaultSemiBold" style={styles.bookTitle}>
                {item.book_title || 'Untitled'}
              </ThemedText>
              {item.book_author && (
                <ThemedText style={styles.bookAuthor}>By {item.book_author}</ThemedText>
              )}
              <ThemedView style={styles.bookMeta}>
                {item.year && (
                  <ThemedText style={styles.metaText}>{item.year}</ThemedText>
                )}
                {item.genres && (
                  <ThemedText style={styles.metaText}>{item.genres}</ThemedText>
                )}
                {isDownloaded && (
                  <ThemedText style={[styles.metaText, { color: colors.tint }]}>
                    Offline
                  </ThemedText>
                )}
              </ThemedView>
            </ThemedView>
          </ThemedView>
        </ThemedView>
      </TouchableOpacity>
    );
  };

  const renderBookItem = ({ item }: { item: Book }) => {
    return <BookItem item={item} />;
  };

  const renderProgressItem = (item: BookWithProgress) => {
    const coverUrl = getCoverImageUrl(item.folder);
    const progressTime = formatTime(item.progress.playback_time);
    const audioModeLabel = item.progress.audio_mode === 'taster' ? 'Taster' : 'Full';
    const vocabLabel = item.progress.vocabulary_level === 'basic' ? 'Basic' : 'Standard';
    
    return (
      <TouchableOpacity
        onPress={() => handleProgressBookPress(item)}
        activeOpacity={0.7}
        style={styles.progressBookCard}
      >
        <ThemedView style={[styles.progressBookCardInner, { borderColor: colors.icon }]}>
          {coverUrl && (
            <ThemedView style={styles.progressCoverContainer}>
              <Image
                source={{ uri: coverUrl }}
                style={styles.progressCoverImage}
                contentFit="cover"
                placeholderContentFit="cover"
                transition={200}
              />
            </ThemedView>
          )}
          <ThemedView style={styles.progressBookInfo}>
            <ThemedText type="defaultSemiBold" style={styles.progressBookTitle} numberOfLines={2}>
              {item.book_title || 'Untitled'}
            </ThemedText>
            <ThemedText style={styles.progressTime}>{progressTime}</ThemedText>
            <ThemedView style={styles.progressBadges}>
              <ThemedView style={[styles.badge, { backgroundColor: colors.icon }]}>
                <ThemedText style={styles.badgeText}>{audioModeLabel}</ThemedText>
              </ThemedView>
              <ThemedView style={[styles.badge, { backgroundColor: colors.icon }]}>
                <ThemedText style={styles.badgeText}>{vocabLabel}</ThemedText>
              </ThemedView>
            </ThemedView>
          </ThemedView>
        </ThemedView>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.tint} />
        <ThemedText style={styles.loadingText}>Loading books...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title" style={styles.headerTitle}>
          Catalogue
        </ThemedText>
        <ThemedView style={styles.headerSubtitleContainer}>
          <ThemedText style={styles.headerSubtitle}>
            {books.length} {books.length === 1 ? 'book' : 'books'}
          </ThemedText>
          {isOfflineMode && (
            <ThemedView style={[styles.offlineBadge, { backgroundColor: colors.icon }]}>
              <ThemedText style={styles.offlineBadgeText}>Offline Mode</ThemedText>
            </ThemedView>
          )}
        </ThemedView>
      </ThemedView>
      
      {isAuthenticated && booksWithProgress.length > 0 && (
        <ThemedView style={styles.progressSection}>
          <ThemedView style={styles.progressSectionHeader}>
            <ThemedText type="defaultSemiBold" style={styles.progressSectionTitle}>
              Continue where you left?
            </ThemedText>
          </ThemedView>
          {loadingProgress ? (
            <ThemedView style={styles.progressLoadingContainer}>
              <ActivityIndicator size="small" color={colors.tint} />
            </ThemedView>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.progressScrollContent}
            >
              {booksWithProgress.map((item) => (
                <ThemedView key={item.progress.id}>
                  {renderProgressItem(item)}
                </ThemedView>
              ))}
            </ScrollView>
          )}
        </ThemedView>
      )}

      <FlatList
        data={books}
        renderItem={renderBookItem}
        keyExtractor={(item) => item.book_id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.tint}
          />
        }
        ListEmptyComponent={
          <ThemedView style={styles.emptyContainer}>
            <ThemedText style={styles.emptyText}>No books found</ThemedText>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    marginTop: 16,
    opacity: 0.7,
  },
  header: {
    padding: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    marginBottom: 4,
  },
  headerSubtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  headerSubtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  offlineBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  offlineBadgeText: {
    fontSize: 12,
    opacity: 0.9,
  },
  downloadedBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadedBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  bookCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  bookContent: {
    flexDirection: 'row',
    gap: 16,
  },
  coverImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  bookInfo: {
    flex: 1,
  },
  bookTitle: {
    fontSize: 18,
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 8,
  },
  bookMeta: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: 12,
    opacity: 0.6,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.5,
  },
  progressSection: {
    marginBottom: 16,
  },
  progressSectionHeader: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  progressSectionTitle: {
    fontSize: 18,
  },
  progressLoadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  progressScrollContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  progressBookCard: {
    width: 140,
    marginRight: 12,
  },
  progressBookCardInner: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  progressCoverContainer: {
    width: '100%',
    height: 180,
    overflow: 'hidden',
  },
  progressCoverImage: {
    width: '100%',
    height: '100%',
  },
  progressBookInfo: {
    padding: 12,
  },
  progressBookTitle: {
    fontSize: 14,
    marginBottom: 6,
    minHeight: 36,
  },
  progressTime: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 8,
  },
  progressBadges: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    opacity: 0.9,
  },
});

