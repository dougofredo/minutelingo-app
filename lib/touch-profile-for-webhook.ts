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

/**
 * Touch the Supabase profiles row so the backend "profile updated" webhook runs.
 * Sets updated_at and optionally the user's timezone. Does not throw.
 */
export async function touchProfileForWebhook(userId: string): Promise<void> {
  try {
    const timezone = resolveTimezone();
    const { error } = await supabase
      .from('profiles')
      .upsert(
        {
          id: userId,
          updated_at: new Date().toISOString(),
          ...(timezone && { timezone }),
        },
        { onConflict: 'id' }
      );

    if (error) {
      console.warn('Profile touch for webhook failed', error);
    }
  } catch (err) {
    console.warn('Profile touch for webhook failed', err);
  }
}
