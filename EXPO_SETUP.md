# Expo / EAS setup for MinuteLingo (new app)

Use this checklist when treating the project as a new app.

---

## 1. Expo account and project

- **Expo account**: Sign up at [expo.dev](https://expo.dev) and log in.
- **Link this project** (if you want a new EAS project for MinuteLingo):
  ```bash
  npx eas login
  npx eas init
  ```
  This will create/link an EAS project and can update `app.json` with a new `extra.eas.projectId` and optionally `owner`. If you prefer to keep the existing project ID and owner in `app.json`, skip `eas init` and just use `eas login`.

---

## 2. Environment variables and secrets

Builds on EAS do **not** use your local `.env`. Set secrets in the Expo dashboard or via CLI.

**Required for the app:**

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `EXPO_PUBLIC_R2_PUBLIC_URL` | Base URL for lesson media (e.g. R2 public bucket) |

**Optional:**

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_ISFREE` | Set to `true` for free build (hides IAP, unlocks all content) |
| `SUPABASE_SERVICE_ROLE_KEY` | Only if a server/Edge Function needs it (don’t use in client if not needed) |

**Set secrets:**

```bash
npx eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://your-project.supabase.co" --type string
npx eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your-anon-key" --type string
npx eas secret:create --name EXPO_PUBLIC_R2_PUBLIC_URL --value "https://your-r2-bucket.r2.dev" --type string
# Optional free build:
npx eas secret:create --name EXPO_PUBLIC_ISFREE --value "true" --type string
```

Or in [expo.dev](https://expo.dev) → your project → **Secrets**.

---

## 3. App identity (already in `app.json`)

- **iOS**: `bundleIdentifier`: `com.minutelingo.app`
- **Android**: `package`: `com.minutelingo.app`
- **Name / slug**: MinuteLingo / minutelingo

Change these in `app.json` if you want a different bundle ID or app name.

---

## 4. EAS Build (first time)

**Credentials:** On the first build, EAS will prompt to create or use credentials (iOS: distribution cert + provisioning profile; Android: keystore). You can let EAS manage them.

**Build commands:**

```bash
# Development build (for dev client on device)
npx eas build --profile development --platform android
npx eas build --profile development --platform ios

# Preview (internal testing, e.g. APK for Android)
npx eas build --profile preview --platform android

# Production (store builds)
npx eas build --profile production --platform android
npx eas build --profile production --platform ios
```

---

## 5. Store listing (when publishing)

- **Google Play**: Create an app in [Google Play Console](https://play.google.com/console), set package `com.minutelingo.app`, fill store listing and upload the AAB from `eas build --profile production --platform android`.
- **App Store**: Create an app in [App Store Connect](https://appstoreconnect.apple.com) with bundle ID `com.minutelingo.app`, then submit the IPA (e.g. via `eas submit` or EAS Submit tab after a production iOS build).

---

## 6. In-app purchases (if not using free build)

- **Android**: In Google Play Console, create an in-app product (e.g. `minutelingo_premium`) and activate it.
- **iOS**: In App Store Connect, create a non-consumable product (e.g. `com.minutelingo.app.premium`).

Product IDs are already set in `hooks/use-subscription.ts`. Keep them in sync with the stores.

---

## Quick reference

| Task | Command or location |
|------|----------------------|
| Log in | `npx eas login` |
| New EAS project | `npx eas init` |
| Set secret | `npx eas secret:create --name NAME --value VALUE --type string` |
| Build Android | `npx eas build --profile production --platform android` |
| Build iOS | `npx eas build --profile production --platform ios` |
| Submit to store | `npx eas submit` (after build) |
| Project config | `app.json`, `eas.json` |
| Env for builds | EAS Secrets (dashboard or CLI) |
