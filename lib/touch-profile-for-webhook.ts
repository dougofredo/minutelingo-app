import { supabase } from '@/supabaseClient';

/**
 * Resolve device timezone in a way that works in RN and browser.
 * Returns IANA timezone string or undefined if not available.
 */
function resolveTimezone(): string | undefined {
  try {
    if (typeof Intl !== 'undefined' && typeof Intl.DateTimeFormat === 'function') {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
  } catch {
    // ignore
  }
  return undefined;
}

export type ProfileUpdatePayload = {
  userId: string;
  email?: string | null;
  name?: string | null;
  language?: string | null;
};

/**
 * Update the Supabase profiles row (e.g. on sign-in) with name, language, email, timezone.
 * Triggers the backend "profile updated" webhook. Does not throw.
 */
export async function updateProfileOnSignIn(payload: ProfileUpdatePayload): Promise<void> {
  try {
    const timezone = resolveTimezone();
    const { error } = await supabase
      .from('profiles')
      .upsert(
        {
          id: payload.userId,
          updated_at: new Date().toISOString(),
          ...(payload.email != null && { email: payload.email }),
          ...(payload.name != null && payload.name !== '' && { name: payload.name }),
          ...(payload.language != null && payload.language !== '' && { language: payload.language }),
          ...(timezone && { timezone }),
        },
        { onConflict: 'id' }
      );

    if (error) {
      console.warn('Profile update on sign-in failed', error);
    }
  } catch (err) {
    console.warn('Profile update on sign-in failed', err);
  }
}

/**
 * Touch the Supabase profiles row so the backend "profile updated" webhook runs.
 * Sets updated_at and optionally the user's timezone. Does not throw.
 */
export async function touchProfileForWebhook(userId: string): Promise<void> {
  await updateProfileOnSignIn({ userId });
}
