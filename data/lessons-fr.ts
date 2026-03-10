/**
 * French lessons: audio and image paths are relative to EXPO_PUBLIC_R2_PUBLIC_URL.
 * Build full URL as: `${R2_PUBLIC_URL}/${audio}` or `${R2_PUBLIC_URL}/${image}`.
 */
export interface Lesson {
  lesson: number;
  dialog: number | null;
  block: number | null;
  language: 'fr';
  /** Path relative to R2 base (e.g. fr/dialog1/lesson_d1_b1_fr.mp3), or null if no audio. */
  audio: string | null;
  /** Path relative to R2 base (e.g. fr/dialog1/image.jpeg, or fr/lessons/lessonX/image.jpeg for multiples of 5). */
  image: string | null;
}

export const LESSONS_FR: Lesson[] = [
  { lesson: 1, dialog: 1, block: 1, language: 'fr', audio: 'fr/dialog1/lesson_d1_b1_fr.mp3', image: 'fr/dialog1/image.jpeg' },
  { lesson: 2, dialog: 2, block: 1, language: 'fr', audio: 'fr/dialog2/lesson_d2_b1_fr.mp3', image: 'fr/dialog2/image.jpeg' },
  { lesson: 3, dialog: 3, block: 1, language: 'fr', audio: 'fr/dialog3/lesson_d3_b1_fr.mp3', image: 'fr/dialog3/image.jpeg' },
  { lesson: 4, dialog: 4, block: 1, language: 'fr', audio: 'fr/dialog4/lesson_d4_b1_fr.mp3', image: 'fr/dialog4/image.jpeg' },
  { lesson: 5, dialog: null, block: null, language: 'fr', audio: null, image: 'fr/lessons/lesson5/image.jpeg' },
  { lesson: 6, dialog: 1, block: 2, language: 'fr', audio: 'fr/dialog1/lesson_d1_b2_fr.mp3', image: 'fr/dialog1/image.jpeg' },
  { lesson: 7, dialog: 2, block: 2, language: 'fr', audio: 'fr/dialog2/lesson_d2_b2_fr.mp3', image: 'fr/dialog2/image.jpeg' },
  { lesson: 8, dialog: 3, block: 2, language: 'fr', audio: 'fr/dialog3/lesson_d3_b2_fr.mp3', image: 'fr/dialog3/image.jpeg' },
  { lesson: 9, dialog: 4, block: 2, language: 'fr', audio: 'fr/dialog4/lesson_d4_b2_fr.mp3', image: 'fr/dialog4/image.jpeg' },
  { lesson: 10, dialog: null, block: null, language: 'fr', audio: null, image: 'fr/lessons/lesson10/image.jpeg' },
  { lesson: 11, dialog: 1, block: 3, language: 'fr', audio: 'fr/dialog1/lesson_d1_b3_fr.mp3', image: 'fr/dialog1/image.jpeg' },
  { lesson: 12, dialog: 2, block: 3, language: 'fr', audio: 'fr/dialog2/lesson_d2_b3_fr.mp3', image: 'fr/dialog2/image.jpeg' },
  { lesson: 13, dialog: 3, block: 3, language: 'fr', audio: 'fr/dialog3/lesson_d3_b3_fr.mp3', image: 'fr/dialog3/image.jpeg' },
  { lesson: 14, dialog: 4, block: 3, language: 'fr', audio: 'fr/dialog4/lesson_d4_b3_fr.mp3', image: 'fr/dialog4/image.jpeg' },
  { lesson: 15, dialog: null, block: null, language: 'fr', audio: null, image: 'fr/lessons/lesson15/image.jpeg' },
  { lesson: 16, dialog: 5, block: 1, language: 'fr', audio: 'fr/dialog5/lesson_d5_b1_fr.mp3', image: 'fr/dialog5/image.jpeg' },
  { lesson: 17, dialog: 6, block: 1, language: 'fr', audio: 'fr/dialog6/lesson_d6_b1_fr.mp3', image: 'fr/dialog6/image.jpeg' },
  { lesson: 18, dialog: 7, block: 1, language: 'fr', audio: 'fr/dialog7/lesson_d7_b1_fr.mp3', image: 'fr/dialog7/image.jpeg' },
  { lesson: 19, dialog: 8, block: 1, language: 'fr', audio: 'fr/dialog8/lesson_d8_b1_fr.mp3', image: 'fr/dialog8/image.jpeg' },
  { lesson: 20, dialog: null, block: null, language: 'fr', audio: null, image: 'fr/lessons/lesson20/image.jpeg' },
];

export type LanguageCode = 'fr';

/** Returns lessons for the given language. Only French is supported for now. */
export function getLessonsForLanguage(lang: LanguageCode | null): Lesson[] {
  if (lang === 'fr') return LESSONS_FR;
  return [];
}
