# Versioning (iOS & Android)

We keep **one source of truth** in `app.json` so both stores stay in sync.

| Field | Where | Purpose |
|-------|--------|--------|
| **version** | `expo.version` | User-facing version (e.g. `1.0.3`). Shown in both App Store and Play Store. |
| **iOS build** | `expo.ios.buildNumber` | Integer string. **Must increase** for every new build you upload to App Store Connect. |
| **Android build** | `expo.android.versionCode` | Integer. **Must increase** for every new build you upload to Google Play. |

## Strategy

- **Same release for both stores:** Bump `version` when you ship a new release (e.g. `1.0.3` → `1.0.4`). Bump **both** `buildNumber` and `versionCode` for that release (e.g. 3 → 4).
- **Build number rules:** Each new binary uploaded to App Store **must** have a higher `buildNumber`. Each new binary uploaded to Play Store **must** have a higher `versionCode`. So we always bump both when preparing a release, even if the user-facing `version` stays the same (e.g. re-submitting the same 1.0.3 with a fix).

## Bump for a new App Store / Play Store release

From project root:

```bash
npm run version:bump
```

This increments:

- `expo.version` (patch: 1.0.3 → 1.0.4)
- `expo.ios.buildNumber` (e.g. "3" → "4")
- `expo.android.versionCode` (e.g. 3 → 4)

Then build and submit as usual (e.g. `eas build --platform all --profile production`, then submit to each store).

## Manual edit

Edit `app.json` and change:

- `expo.version` (e.g. `"1.0.4"`)
- `expo.ios.buildNumber` (e.g. `"4"`)
- `expo.android.versionCode` (e.g. `4`)

Keep these three in sync for each release so iOS and Android match.
