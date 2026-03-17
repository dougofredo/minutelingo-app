import { useEffect, useState } from 'react';
import {
  DIALOG_NUMBERS,
  fetchDialogIntro,
  type DialogIntro,
} from '@/lib/dialog-intro';

export type DialogIntrosMap = Partial<Record<number, DialogIntro | null>>;

/**
 * Fetches intro.json for all dialogs (1–8) for the given language.
 * Use on the home screen to show title_en on lesson cards.
 */
export function useDialogIntros(lang: string | null): {
  intros: DialogIntrosMap;
  loading: boolean;
} {
  const [intros, setIntros] = useState<DialogIntrosMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!lang) {
      setIntros({});
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all(
      DIALOG_NUMBERS.map(async (d) => {
        const intro = await fetchDialogIntro(lang, d);
        return { dialog: d, intro } as const;
      })
    ).then((results) => {
      if (cancelled) return;
      const map: DialogIntrosMap = {};
      for (const { dialog, intro } of results) {
        map[dialog] = intro;
      }
      setIntros(map);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [lang]);

  return { intros, loading };
}

/**
 * Fetches intro.json for a single dialog. Use in lesson player.
 */
export function useDialogIntro(
  lang: string | null,
  dialog: number | null
): { intro: DialogIntro | null; loading: boolean } {
  const [intro, setIntro] = useState<DialogIntro | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!lang || dialog == null) {
      setIntro(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchDialogIntro(lang, dialog).then((data) => {
      if (!cancelled) {
        setIntro(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [lang, dialog]);

  return { intro, loading };
}
