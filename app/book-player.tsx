import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { canAccessSummary, isLockedStory } from '@/constants/access';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useSubscription } from '@/hooks/use-subscription';
import { useToast } from '@/contexts/toast-context';
import { offlineStorage } from '@/services/offlineStorage';
import { supabase } from '@/supabaseClient';
import { Audio } from 'expo-av';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const R2_PUBLIC_URL = process.env.EXPO_PUBLIC_R2_PUBLIC_URL || '';
const DEFAULT_VOICE = 'en-US-Chirp3-HD-Charon';

export default function BookPlayerScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const { showError, showSuccess, showInfo } = useToast();

  // Parse book data from params
  const book = params.book ? JSON.parse(params.book as string) : null;

  const { subscriptionStatus } = useSubscription();
  const hasPremium = subscriptionStatus.isSubscribed && subscriptionStatus.isActive;
  const hasAccess = book ? canAccessSummary(book.book_id ?? 0, hasPremium) : false;
  const showUpgradeHint = book && isLockedStory(book.book_id ?? 0, hasPremium);
  
  // State declarations; vocab is always standard
  const vocab = 'lightning'; // lightning = standard
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [localCoverPath, setLocalCoverPath] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [progressBarWidth, setProgressBarWidth] = useState(0);
  const networkStatus = useNetworkStatus();

  useEffect(() => {
    if (!book) {
      console.log('No book data found in params:', params);
    } else {
      console.log('Book loaded:', book.book_title, book.folder);
    }
  }, [book, params]);

  // Initialize offline storage and check if book is downloaded
  useEffect(() => {
    const checkDownloadStatus = async () => {
      if (!book?.folder) return;
      
      await offlineStorage.initialize();
      const downloaded = await offlineStorage.isBookDownloaded(book.folder);
      setIsDownloaded(downloaded);
      
      if (downloaded) {
        const coverPath = await offlineStorage.getLocalCoverPath(book.folder);
        setLocalCoverPath(coverPath);
      }
    };
    
    checkDownloadStatus();
  }, [book?.folder]);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);


  const getCoverImageUrl = async (folder: string | null) => {
    if (!folder) return null;
    
    // Try local first
    if (isDownloaded) {
      const localPath = await offlineStorage.getLocalCoverPath(folder);
      if (localPath) {
        return localPath;
      }
    }
    
    // Fallback to remote
    if (!R2_PUBLIC_URL) return null;
    return `${R2_PUBLIC_URL}/books/${folder}/cover.jpg`;
  };

  const getAudioUrl = async (folder: string | null) => {
    if (!folder) return null;
    const vocabLevel = 'standard';
    const audioMode = 'summary'; // Only summary MP3s exist

    const localPath = await offlineStorage.getLocalAudioPath(folder, audioMode, vocabLevel);
    if (localPath) {
      console.log('✅ Using local audio:', localPath);
      return localPath;
    }
    if (!R2_PUBLIC_URL) return null;
    const url = `${R2_PUBLIC_URL}/books/${folder}/${vocabLevel}/${audioMode}_${DEFAULT_VOICE}.mp3`;
    console.log('🌐 Using remote audio:', url);
    return url;
  };

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  // Load duration when book changes (only when user has access to summary)
  useEffect(() => {
    const loadDuration = async () => {
      if (!book?.folder || !hasAccess) {
        if (!hasAccess) setDuration(0);
        return;
      }

      const audioUrl = await getAudioUrl(book.folder);
      if (!audioUrl) return;

      try {
        // Load the audio to get metadata without playing
        const { sound: metadataSound } = await Audio.Sound.createAsync(
          { uri: audioUrl },
          { shouldPlay: false }
        );

        // Wait for the audio to be fully loaded by polling status
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait
        
        const checkStatus = async (): Promise<number | null> => {
          const status = await metadataSound.getStatusAsync();
          if (status.isLoaded && status.durationMillis) {
            return status.durationMillis;
          }
          return null;
        };

        // Try immediately
        let durationMillis = await checkStatus();
        
        // If not loaded yet, poll with small delays
        while (!durationMillis && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 100));
          durationMillis = await checkStatus();
          attempts++;
        }

        if (durationMillis) {
          setDuration(durationMillis);
          console.log('Duration loaded:', durationMillis, 'ms');
        } else {
          console.warn('Duration not available after loading');
          setDuration(0);
        }

        // Unload immediately after getting duration
        await metadataSound.unloadAsync();
      } catch (error: any) {
        console.error('Error loading duration:', error);
        setDuration(0);
      }
    };

    loadDuration();
  }, [book?.folder, isDownloaded, hasAccess]);

  useEffect(() => {
    // Update position while playing
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
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const loadAndPlay = async () => {
    if (!book?.folder) {
      showError('Book folder not found');
      return;
    }
    if (showUpgradeHint) {
      showInfo('Get Premium to listen to this story');
      router.push('/subscription');
      return;
    }

    const audioUrl = await getAudioUrl(book.folder);
    if (!audioUrl) {
      showError('Audio URL could not be generated');
      return;
    }

    try {
      setIsLoading(true);

      // Stop and unload previous sound if exists
      if (sound) {
        await sound.unloadAsync();
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      // Load and play the sound
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true }
      );

      setSound(newSound);
      setIsPlaying(true);
      setIsLoading(false);

      // Set up status update listener
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
    } catch (error: any) {
      console.error('Error loading audio:', error);
      showError(error.message || 'Failed to load audio');
      setIsLoading(false);
    }
  };

  const togglePlayPause = async () => {
    if (!sound) {
      await loadAndPlay();
      return;
    }

    try {
      if (isPlaying) {
        await sound.pauseAsync();
      } else {
        await sound.playAsync();
      }
    } catch (error: any) {
      console.error('Error toggling playback:', error);
      showError('Failed to toggle playback');
    }
  };

  const stop = async () => {
    if (sound) {
      try {
        await sound.stopAsync();
        await sound.setPositionAsync(0);
        await sound.unloadAsync();
        setSound(null);
        setIsPlaying(false);
        setPosition(0);
      } catch (error: any) {
        console.error('Error stopping audio:', error);
      }
    }
  };

  const seekBackward = async () => {
    if (!sound) return;
    
    try {
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        const newPosition = Math.max(0, (status.positionMillis || 0) - 10000);
        await sound.setPositionAsync(newPosition);
        setPosition(newPosition);
      }
    } catch (error: any) {
      console.error('Error seeking backward:', error);
    }
  };

  const seekForward = async () => {
    if (!sound) return;
    
    try {
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        const currentPosition = status.positionMillis || 0;
        const maxPosition = status.durationMillis || 0;
        const newPosition = Math.min(maxPosition, currentPosition + 10000);
        await sound.setPositionAsync(newPosition);
        setPosition(newPosition);
      }
    } catch (error: any) {
      console.error('Error seeking forward:', error);
    }
  };

  const handleProgressBarPress = async (event: any) => {
    if (!sound || !progressBarWidth || duration === 0) return;

    try {
      const { locationX } = event.nativeEvent;
      const percentage = Math.max(0, Math.min(1, locationX / progressBarWidth));
      const newPosition = percentage * duration;
      
      await sound.setPositionAsync(newPosition);
      setPosition(newPosition);
    } catch (error: any) {
      console.error('Error seeking to position:', error);
    }
  };

  const handleDownload = async () => {
    if (!book?.folder || !R2_PUBLIC_URL) {
      showError('Cannot download book');
      return;
    }

    if (!networkStatus.isConnected) {
      showError('Please connect to the internet to download books');
      return;
    }

    try {
      setIsDownloading(true);
      setDownloadProgress(0);

      const vocabLevel = 'standard';
      const audioMode = 'summary'; // Only summary MP3s

      await offlineStorage.downloadBook(
        book,
        audioMode,
        vocabLevel,
        R2_PUBLIC_URL,
        (progress) => {
          setDownloadProgress(progress);
        }
      );

      setIsDownloaded(true);
      const coverPath = await offlineStorage.getLocalCoverPath(book.folder);
      setLocalCoverPath(coverPath);
      
      showSuccess('Book downloaded successfully!');
    } catch (error: any) {
      console.error('Error downloading book:', error);
      showError(error.message || 'Failed to download book');
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  const handleDeleteDownload = async () => {
    if (!book?.folder) return;

    try {
      await offlineStorage.deleteDownloadedBook(book.folder!);
      setIsDownloaded(false);
      setLocalCoverPath(null);
      showSuccess('Download deleted');
    } catch (error: any) {
      console.error('Error deleting download:', error);
      showError('Failed to delete download');
    }
  };

  if (!book) {
    return (
      <ThemedView style={styles.container}>
        <ThemedView style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={colors.text} />
          </TouchableOpacity>
          <ThemedText type="subtitle" style={styles.headerTitle}>
            Book Player
          </ThemedText>
        </ThemedView>
        <ThemedView style={styles.centerContainer}>
          <ThemedText>Book not found</ThemedText>
        </ThemedView>
      </ThemedView>
    );
  }

  const progress = duration > 0 ? position / duration : 0;

  // Load cover image
  useEffect(() => {
    const loadCover = async () => {
      if (!book?.folder) return;
      const url = await getCoverImageUrl(book.folder);
      setCoverUrl(url);
    };
    loadCover();
  }, [book?.folder, isDownloaded, localCoverPath]);

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color={colors.text} />
        </TouchableOpacity>
        <ThemedText type="subtitle" style={styles.headerTitle}>
          {book.book_title || 'Untitled'}
        </ThemedText>
      </ThemedView>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ThemedView style={styles.coverContainer}>
          {coverUrl ? (
            <Image
              source={{ uri: coverUrl }}
              style={styles.coverImage}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <ThemedView style={[styles.coverImage, styles.coverPlaceholder]}>
              <ThemedText style={styles.coverPlaceholderText}>No Cover</ThemedText>
            </ThemedView>
          )}
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
                  name={isPlaying ? 'pause.fill' : 'play.fill'}
                  size={48}
                  color="#fff"
                />
              )}
            </ThemedView>
          </TouchableOpacity>
        </ThemedView>

        <ThemedView style={styles.togglesContainer}>
          <ThemedView style={styles.toggleWrapper}>
            {!isDownloaded && !isDownloading ? (
              <TouchableOpacity
                onPress={handleDownload}
                disabled={!networkStatus.isConnected || showUpgradeHint}
                style={[styles.toggleIconButton, showUpgradeHint && { opacity: 0.5 }]}
                activeOpacity={0.7}
              >
                <IconSymbol
                  name="arrow.down.circle.fill"
                  size={24}
                  color={colors.text}
                />
              </TouchableOpacity>
            ) : isDownloaded ? (
              <TouchableOpacity
                onPress={handleDeleteDownload}
                style={styles.toggleIconButton}
                activeOpacity={0.7}
              >
                <IconSymbol
                  name="checkmark.circle.fill"
                  size={24}
                  color={colors.tint}
                />
              </TouchableOpacity>
            ) : (
              <View style={styles.toggleIconButton}>
                <ActivityIndicator size="small" color={colors.text} />
              </View>
            )}
            <ThemedText style={styles.toggleLabel}>Download</ThemedText>
          </ThemedView>
        </ThemedView>

        <ThemedView style={styles.bookInfo}>
          <ThemedText type="title" style={styles.bookTitle}>
            {book.book_title || 'Untitled'}
          </ThemedText>
          {book.book_author && (
            <ThemedText style={styles.bookAuthor}>By {book.book_author}</ThemedText>
          )}
          {showUpgradeHint && (
            <TouchableOpacity
              onPress={() => router.push('/subscription')}
              style={[styles.upgradeHint, { backgroundColor: colors.tint }]}
              activeOpacity={0.8}
            >
              <IconSymbol name="star.fill" size={16} color="#fff" />
              <ThemedText style={styles.upgradeHintText}>Get Premium to listen to this story</ThemedText>
            </TouchableOpacity>
          )}
        </ThemedView>

        <ThemedView style={styles.playerControls}>
          <ThemedView style={styles.progressContainer}>
            <ThemedText style={styles.timeText}>{formatTime(position)}</ThemedText>
            <TouchableOpacity
              onPress={handleProgressBarPress}
              onLayout={(event) => {
                const { width } = event.nativeEvent.layout;
                setProgressBarWidth(width);
              }}
              activeOpacity={1}
              disabled={!sound || duration === 0}
              style={styles.progressBarTouchable}
            >
              <ThemedView style={[styles.progressBarContainer, { backgroundColor: colors.icon }]}>
                <View
                  style={[
                    styles.progressBar,
                    { width: `${progress * 100}%`, backgroundColor: colors.tint },
                  ]}
                />
              </ThemedView>
            </TouchableOpacity>
            <ThemedText style={styles.timeText}>{formatTime(duration)}</ThemedText>
          </ThemedView>

          <ThemedView style={styles.seekButtonsContainer}>
            <TouchableOpacity
              onPress={seekBackward}
              disabled={!sound}
              style={[styles.seekButton, { opacity: sound ? 1 : 0.4 }]}
              activeOpacity={0.7}
            >
              <IconSymbol
                name="chevron.left"
                size={20}
                color={colors.tint}
              />
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
          </ThemedView>

        </ThemedView>
      </ScrollView>
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
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
  },
  downloadIconButton: {
    padding: 4,
    marginLeft: 8,
  },
  downloadButtonContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
    padding: 24,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  togglesContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    justifyContent: 'center',
    alignItems: 'flex-start',
    width: '100%',
    paddingHorizontal: 24,
    gap: 24,
  },
  toggleWrapper: {
    alignItems: 'center',
  },
  toggleIconButton: {
    width: 56,
    height: 56,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 12,
    marginTop: 6,
    opacity: 0.7,
  },
  coverImage: {
    width: 280,
    height: 280,
    borderRadius: 16,
  },
  coverPlaceholder: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverPlaceholderText: {
    opacity: 0.5,
  },
  coverPlayButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonOverlay: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  bookInfo: {
    alignItems: 'center',
    marginBottom: 32,
  },
  bookTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  bookAuthor: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
  },
  upgradeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
  },
  upgradeHintText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  playerControls: {
    width: '100%',
    gap: 24,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeText: {
    fontSize: 12,
    minWidth: 40,
    textAlign: 'center',
  },
  progressBarTouchable: {
    flex: 1,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  progressBarContainer: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    opacity: 0.3,
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  seekButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 32,
    marginTop: 16,
  },
  seekButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 80,
  },
  seekButtonLabel: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.7,
  },
});

