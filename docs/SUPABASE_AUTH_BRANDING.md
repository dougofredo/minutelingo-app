# Supabase Auth branding for MinuteLingo

If magic link / sign-in flows still show **"Hear the Classics"** (or another old app name), that text is set in your **Supabase project**, not in this app.

## 1. Update redirect URLs (required for magic links)

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project.
2. Go to **Authentication** → **URL Configuration**.
3. Set **Site URL** to your app’s base URL, e.g.:
   - `minutelingo://` (for the app’s custom scheme), or
   - Your production web URL if you have one (e.g. `https://minutelingo.com`).
4. Under **Redirect URLs**, add the exact URL your app uses for the auth callback. The app uses:
   - **Custom scheme (device):** `minutelingo://auth` (or similar; check the dev log `🔗 Redirect URL:` when you tap “Send Magic Link”).
   - Add that value (e.g. `minutelingo://**` or the full path) so Supabase allows the redirect.

Without the correct redirect URL, the magic link may open the wrong app or fail.

## 2. Update email templates (so emails say MinuteLingo)

1. In the same project: **Authentication** → **Email Templates**.
2. Edit **Confirm signup** and **Magic Link** (and any other auth emails).
3. Replace any “Hear the Classics” / “Hear the Bible Stories” text with **MinuteLingo** (or your chosen product name).
4. Save.

After this, magic link emails will show MinuteLingo instead of the old app name.

## 3. Optional: separate Supabase project for MinuteLingo

If you want a clean split from the old app:

1. Create a new Supabase project for MinuteLingo.
2. Copy over any auth settings (e.g. Email auth enabled, redirect URLs).
3. Update **Site URL** and **Redirect URLs** as above.
4. Set **Email Templates** to use “MinuteLingo”.
5. In this app, set env / EAS secrets to the new project:
   - `EXPO_PUBLIC_SUPABASE_URL` = new project URL
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY` = new project anon key

The app code already uses the `minutelingo` scheme; only Supabase config and templates need to match.
