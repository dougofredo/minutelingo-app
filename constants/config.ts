/**
 * App config flags. Set via environment variables (e.g. in .env or EAS secrets).
 *
 * EXPO_PUBLIC_ISFREE=true  — Free build: all content accessible, in-app purchases hidden.
 */
const raw = process.env.EXPO_PUBLIC_ISFREE;
export const isFree =
  raw === 'true' || raw === '1' || raw === 'yes';
