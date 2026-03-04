// GreenCrowd V2 — i18n configuration (i18next)
// Client-side: react-i18next with fetch backend
// Language preference stored in cookie "NEXT_LOCALE"

export const SUPPORTED_LANGUAGES = ["en", "es"] as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]
export const DEFAULT_LANGUAGE: SupportedLanguage = "en"
export const LOCALE_COOKIE = "NEXT_LOCALE"

export function isSupported(lang: string): lang is SupportedLanguage {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(lang)
}
