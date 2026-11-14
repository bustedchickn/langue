import type { Language } from '../types'

// The column order is shared by the compact vocabulary tables for each game.
export type AdditionalTranslations = readonly [string, string, string, string, string, string, string]

export function vocabularyEntry(English: string, French: string, Spanish: string,
  [German, Italian, Portuguese, Japanese, Korean, Chinese, Russian]: AdditionalTranslations,
): Record<Language, string> {
  return { English, French, Spanish, German, Italian, Portuguese, Japanese, Korean, Chinese, Russian }
}
