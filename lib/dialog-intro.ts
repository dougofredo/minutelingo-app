/**
 * Dialog intro.json from R2: {lang}/dialog{N}/intro.json
 * Path uses language code: fr → fr/, de → de/.
 * Keys: title_en, title_fr, title_de (optional), description_en, description_fr, description_de (optional).
 */

const R2_PUBLIC_URL = process.env.EXPO_PUBLIC_R2_PUBLIC_URL || '';

export interface DialogIntro {
  title_en: string;
  title_fr: string;
  title_de?: string;
  description_en: string;
  description_fr: string;
  description_de?: string;
}

/** Language code used in R2 paths and intro keys: fr, de, etc. */
export function getIntroTitleForLang(intro: DialogIntro | null | undefined, lang: string | null): string | undefined {
  if (!intro) return undefined;
  if (lang === 'fr' && intro.title_fr != null) return intro.title_fr;
  if (lang === 'de' && intro.title_de != null) return intro.title_de;
  return intro.title_en;
}

export function getIntroUrl(lang: string, dialog: number): string {
  const base = R2_PUBLIC_URL.endsWith('/') ? R2_PUBLIC_URL.slice(0, -1) : R2_PUBLIC_URL;
  return `${base}/${lang}/dialog${dialog}/intro.json`;
}

export async function fetchDialogIntro(
  lang: string,
  dialog: number
): Promise<DialogIntro | null> {
  if (!R2_PUBLIC_URL) return null;
  const url = getIntroUrl(lang, dialog);
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as DialogIntro;
    return data?.title_en != null || data?.title_fr != null || data?.title_de != null ? data : null;
  } catch {
    return null;
  }
}

/** Dialog numbers that have intro.json in the lesson table (dialog1–dialog8). */
export const DIALOG_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
