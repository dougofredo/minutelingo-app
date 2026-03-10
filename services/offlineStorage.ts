import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DOWNLOADS_DIR = `${FileSystem.documentDirectory}downloads/`;
const DOWNLOADS_KEY = '@downloaded_books';

export interface DownloadedBook {
  book_id: number;
  book_title: string | null;
  book_author: string | null;
  folder: string;
  coverPath: string;
  audioFiles: {
    [key: string]: string; // key: "basic_taster" | "basic_summary" | "standard_taster" | "standard_summary"
  };
  downloadedAt: string;
}

export interface DownloadProgress {
  bookId: number;
  progress: number; // 0-100
  status: 'downloading' | 'completed' | 'error';
  error?: string;
}

class OfflineStorageService {
  private downloadProgress: Map<number, DownloadProgress> = new Map();

  async initialize() {
    // Ensure downloads directory exists
    const dirInfo = await FileSystem.getInfoAsync(DOWNLOADS_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(DOWNLOADS_DIR, { intermediates: true });
    }
  }

  async getDownloadedBooks(): Promise<DownloadedBook[]> {
    try {
      const data = await AsyncStorage.getItem(DOWNLOADS_KEY);
      if (!data) return [];
      return JSON.parse(data);
    } catch (error) {
      console.error('Error getting downloaded books:', error);
      return [];
    }
  }

  async isBookDownloaded(bookFolder: string): Promise<boolean> {
    const downloaded = await this.getDownloadedBooks();
    return downloaded.some(book => book.folder === bookFolder);
  }

  async getDownloadedBook(bookFolder: string): Promise<DownloadedBook | null> {
    const downloaded = await this.getDownloadedBooks();
    return downloaded.find(book => book.folder === bookFolder) || null;
  }

  async downloadBook(
    book: {
      book_id: number;
      book_title: string | null;
      book_author: string | null;
      folder: string | null;
    },
    audioMode: 'taster' | 'summary',
    vocabLevel: 'basic' | 'standard',
    r2PublicUrl: string,
    onProgress?: (progress: number) => void
  ): Promise<DownloadedBook> {
    if (!book.folder) {
      throw new Error('Book folder is required');
    }

    const bookDir = `${DOWNLOADS_DIR}${book.folder}/`;
    const coverDir = `${bookDir}cover/`;
    const audioDir = `${bookDir}audio/`;

    // Create directories
    await FileSystem.makeDirectoryAsync(bookDir, { intermediates: true });
    await FileSystem.makeDirectoryAsync(coverDir, { intermediates: true });
    await FileSystem.makeDirectoryAsync(audioDir, { intermediates: true });

    const audioFiles: { [key: string]: string } = {};
    const DEFAULT_VOICE = 'en-US-Chirp3-HD-Charon';

    try {
      // Get existing download if it exists
      const existing = await this.getDownloadedBook(book.folder);
      if (existing) {
        // Merge existing audio files
        Object.assign(audioFiles, existing.audioFiles);
      }

      this.downloadProgress.set(book.book_id, {
        bookId: book.book_id,
        progress: 0,
        status: 'downloading',
      });

      let currentProgress = 0;
      const totalSteps = 3; // cover + taster + summary
      const progressPerStep = 100 / totalSteps;

      // Step 1: Download cover image (if not already downloaded)
      const coverPath = `${coverDir}cover.jpg`;
      const coverExists = await FileSystem.getInfoAsync(coverPath).then(info => info.exists);
      
      if (!coverExists) {
        const coverUrl = `${r2PublicUrl}/books/${book.folder}/cover.jpg`;
        const coverDownload = FileSystem.createDownloadResumable(coverUrl, coverPath);
        await coverDownload.downloadAsync();
      }
      currentProgress += progressPerStep;
      onProgress?.(currentProgress);
      this.downloadProgress.set(book.book_id, {
        bookId: book.book_id,
        progress: Math.round(currentProgress),
        status: 'downloading',
      });

      // Step 2: Download taster audio (always download both)
      const tasterKey = `${vocabLevel}_taster`;
      const tasterPath = `${audioDir}${tasterKey}.mp3`;
      const tasterExists = await FileSystem.getInfoAsync(tasterPath).then(info => info.exists);
      
      if (!tasterExists) {
        const tasterUrl = `${r2PublicUrl}/books/${book.folder}/${vocabLevel}/taster_${DEFAULT_VOICE}.mp3`;
        const tasterDownload = FileSystem.createDownloadResumable(
          tasterUrl,
          tasterPath,
          {},
          (downloadProgress) => {
            const stepProgress = currentProgress + (downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * (progressPerStep / 2);
            this.downloadProgress.set(book.book_id, {
              bookId: book.book_id,
              progress: Math.round(stepProgress),
              status: 'downloading',
            });
            onProgress?.(stepProgress);
          }
        );
        await tasterDownload.downloadAsync();
      }
      audioFiles[tasterKey] = tasterPath;
      currentProgress += progressPerStep / 2;
      onProgress?.(currentProgress);

      // Step 3: Download summary audio (always download both)
      const summaryKey = `${vocabLevel}_summary`;
      const summaryPath = `${audioDir}${summaryKey}.mp3`;
      const summaryExists = await FileSystem.getInfoAsync(summaryPath).then(info => info.exists);
      
      if (!summaryExists) {
        const summaryUrl = `${r2PublicUrl}/books/${book.folder}/${vocabLevel}/summary_${DEFAULT_VOICE}.mp3`;
        const summaryDownload = FileSystem.createDownloadResumable(
          summaryUrl,
          summaryPath,
          {},
          (downloadProgress) => {
            const stepProgress = currentProgress + (downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * (progressPerStep / 2);
            this.downloadProgress.set(book.book_id, {
              bookId: book.book_id,
              progress: Math.round(stepProgress),
              status: 'downloading',
            });
            onProgress?.(stepProgress);
          }
        );
        await summaryDownload.downloadAsync();
      }
      audioFiles[summaryKey] = summaryPath;
      currentProgress = 100;
      onProgress?.(currentProgress);

      const downloadedBook: DownloadedBook = {
        book_id: book.book_id,
        book_title: book.book_title,
        book_author: book.book_author,
        folder: book.folder,
        coverPath,
        audioFiles,
        downloadedAt: new Date().toISOString(),
      };

      // Save to AsyncStorage
      const downloaded = await this.getDownloadedBooks();
      const existingIndex = downloaded.findIndex(b => b.folder === book.folder);
      
      if (existingIndex >= 0) {
        // Merge with existing downloads, preserving all audio files
        downloaded[existingIndex] = {
          ...downloaded[existingIndex],
          ...downloadedBook,
          audioFiles: {
            ...downloaded[existingIndex].audioFiles,
            ...audioFiles,
          },
        };
      } else {
        downloaded.push(downloadedBook);
      }

      await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(downloaded));

      this.downloadProgress.set(book.book_id, {
        bookId: book.book_id,
        progress: 100,
        status: 'completed',
      });

      return downloadedBook;
    } catch (error: any) {
      this.downloadProgress.set(book.book_id, {
        bookId: book.book_id,
        progress: 0,
        status: 'error',
        error: error.message,
      });
      throw error;
    }
  }

  async deleteDownloadedBook(bookFolder: string): Promise<void> {
    try {
      const downloaded = await this.getDownloadedBooks();
      const filtered = downloaded.filter(book => book.folder !== bookFolder);
      await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(filtered));

      // Delete files
      const bookDir = `${DOWNLOADS_DIR}${bookFolder}/`;
      const dirInfo = await FileSystem.getInfoAsync(bookDir);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(bookDir, { idempotent: true });
      }
    } catch (error) {
      console.error('Error deleting downloaded book:', error);
      throw error;
    }
  }

  getDownloadProgress(bookId: number): DownloadProgress | null {
    return this.downloadProgress.get(bookId) || null;
  }

  async getLocalAudioPath(
    bookFolder: string,
    audioMode: 'taster' | 'summary',
    vocabLevel: 'basic' | 'standard'
  ): Promise<string | null> {
    const downloaded = await this.getDownloadedBook(bookFolder);
    if (!downloaded) return null;

    const audioKey = `${vocabLevel}_${audioMode}`;
    const audioPath = downloaded.audioFiles[audioKey];
    if (!audioPath) return null;
    
    // Check if file exists
    const fileInfo = await FileSystem.getInfoAsync(audioPath);
    if (fileInfo.exists) {
      // Ensure the path has file:// prefix for Android/iOS compatibility
      if (audioPath.startsWith('file://')) {
        return audioPath;
      }
      return `file://${audioPath}`;
    }
    
    console.warn('Local audio file not found:', audioPath);
    return null;
  }

  async getLocalCoverPath(bookFolder: string): Promise<string | null> {
    const downloaded = await this.getDownloadedBook(bookFolder);
    if (!downloaded?.coverPath) return null;
    
    // Check if file exists
    const fileInfo = await FileSystem.getInfoAsync(downloaded.coverPath);
    if (fileInfo.exists) {
      // For expo-image, we need to use file:// prefix on some platforms
      return downloaded.coverPath.startsWith('file://') 
        ? downloaded.coverPath 
        : `file://${downloaded.coverPath}`;
    }
    return null;
  }

  async getDownloadedBooksSize(): Promise<number> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(DOWNLOADS_DIR);
      if (!dirInfo.exists) return 0;
      
      // Note: FileSystem doesn't have a direct way to get directory size
      // This is a simplified version - you might want to implement a recursive size calculation
      return 0;
    } catch (error) {
      console.error('Error getting downloads size:', error);
      return 0;
    }
  }
}

export const offlineStorage = new OfflineStorageService();

