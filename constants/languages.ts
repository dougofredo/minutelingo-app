export type LanguageCode = 'fr' | 'es' | 'it' | 'de';

interface LanguageOption {
  code: LanguageCode;
  label: string;
}

export const ALL_LANGUAGES: LanguageOption[] = [
  { code: 'fr', label: 'French' },
  { code: 'es', label: 'Spanish' },
  { code: 'it', label: 'Italian' },
  { code: 'de', label: 'German' },
];

/** Languages offered on first app open. */
export const ONBOARDING_LANGUAGES: LanguageOption[] = ALL_LANGUAGES;

/** Languages that can be switched from the Account page today. */
export const ACCOUNT_LANGUAGES: LanguageOption[] = ALL_LANGUAGES.filter((lang) =>
  ['fr', 'es'].includes(lang.code),
);

