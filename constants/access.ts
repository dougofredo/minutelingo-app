/**
 * Free summary access: aligned with web app.
 * These book_ids get full (summary) access for free; all others require premium for summary.
 */
export const FREE_SUMMARY_BOOK_IDS = [1, 2, 4, 5, 9, 20, 21, 22, 23, 38] as const;

const FREE_SET = new Set(FREE_SUMMARY_BOOK_IDS);

export function canAccessSummary(bookId: number, hasPremium: boolean): boolean {
  if (hasPremium) return true;
  return FREE_SET.has(bookId as (typeof FREE_SUMMARY_BOOK_IDS)[number]);
}

/** True when this story requires premium for full (summary) access. */
export function isLockedStory(bookId: number, hasPremium: boolean): boolean {
  return !canAccessSummary(bookId, hasPremium);
}
