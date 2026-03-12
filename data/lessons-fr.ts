/**
 * French lessons: audio and image paths are relative to EXPO_PUBLIC_R2_PUBLIC_URL.
 * Build full URL as: `${R2_PUBLIC_URL}/${audio}` or `${R2_PUBLIC_URL}/${image}`.
 */
import type { LanguageCode } from '@/constants/languages';

export interface Lesson {
  lesson: number;
  dialog: number | null;
  block: number | null;
  language: LanguageCode;
  /**
   * Path relative to R2 base (e.g. fr/dialog1/lesson1.mp3), or null if no audio.
   * Built from the generic mapping table below.
   */
  audio: string | null;
  /**
   * Path relative to R2 base (e.g. fr/dialog1/image.jpeg).
   * Built from the generic mapping table below.
   */
  image: string | null;
}

type LessonFolderRow = {
  lesson: number;
  folder: string;
};

/**
 * Generic mapping of lesson → folder.
 *
 * Audio: `{lang}/{folder}/lesson{lesson}.mp3`
 * Image: `{lang}/{folder}/image.jpeg`
 */
const LESSON_FOLDER_TABLE: LessonFolderRow[] = [
  { lesson: 1, folder: 'dialog1' },
  { lesson: 2, folder: 'dialog2' },
  { lesson: 3, folder: 'dialog3' },
  { lesson: 4, folder: 'dialog4' },
  { lesson: 5, folder: 'lesson5' },
  { lesson: 6, folder: 'dialog1' },
  { lesson: 7, folder: 'dialog2' },
  { lesson: 8, folder: 'dialog3' },
  { lesson: 9, folder: 'dialog4' },
  { lesson: 10, folder: 'lesson10' },
  { lesson: 11, folder: 'dialog1' },
  { lesson: 12, folder: 'dialog2' },
  { lesson: 13, folder: 'dialog3' },
  { lesson: 14, folder: 'dialog4' },
  { lesson: 15, folder: 'lesson15' },
  { lesson: 16, folder: 'dialog1' },
  { lesson: 17, folder: 'dialog2' },
  { lesson: 18, folder: 'dialog3' },
  { lesson: 19, folder: 'dialog4' },
  { lesson: 20, folder: 'lesson20' },
  { lesson: 21, folder: 'dialog5' },
  { lesson: 22, folder: 'dialog6' },
  { lesson: 23, folder: 'dialog7' },
  { lesson: 24, folder: 'dialog8' },
  { lesson: 25, folder: 'lesson25' },
  { lesson: 26, folder: 'dialog5' },
  { lesson: 27, folder: 'dialog6' },
  { lesson: 28, folder: 'dialog7' },
  { lesson: 29, folder: 'dialog8' },
  { lesson: 30, folder: 'lesson30' },
  { lesson: 31, folder: 'dialog5' },
  { lesson: 32, folder: 'dialog6' },
  { lesson: 33, folder: 'dialog7' },
  { lesson: 34, folder: 'dialog8' },
  { lesson: 35, folder: 'lesson35' },
  { lesson: 36, folder: 'dialog5' },
  { lesson: 37, folder: 'dialog6' },
  { lesson: 38, folder: 'dialog7' },
  { lesson: 39, folder: 'dialog8' },
  { lesson: 40, folder: 'lesson40' },
];

function buildLessonsFromTable(language: LanguageCode): Lesson[] {
  const dialogOccurrences: Record<number, number> = {};

  return LESSON_FOLDER_TABLE.map(({ lesson, folder }) => {
    let dialog: number | null = null;
    let block: number | null = null;

    if (folder.startsWith('dialog')) {
      const dialogNumber = Number(folder.replace('dialog', ''));
      if (!Number.isNaN(dialogNumber)) {
        dialog = dialogNumber;
        const prev = dialogOccurrences[dialogNumber] ?? 0;
        const current = prev + 1;
        dialogOccurrences[dialogNumber] = current;
        block = current;
      }
    }

    const audio = `${language}/${folder}/lesson${lesson}.mp3`;
    const image = `${language}/${folder}/image.jpeg`;

    return {
      lesson,
      dialog,
      block,
      language,
      audio,
      image,
    };
  });
}

export const LESSONS_FR: Lesson[] = buildLessonsFromTable('fr');

/** Returns lessons for the given language, using shared mapping logic. */
export function getLessonsForLanguage(lang: LanguageCode | null): Lesson[] {
  if (!lang) return [];
  return buildLessonsFromTable(lang);
}
