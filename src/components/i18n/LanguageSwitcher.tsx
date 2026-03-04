"use client"

// Selector de idioma — cambia el idioma y guarda en cookie.

import { useTranslation } from "react-i18next"
import { changeLanguage } from "@/lib/i18n/client"
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/lib/i18n/config"

const LANG_LABELS: Record<SupportedLanguage, string> = {
  en: "EN",
  es: "ES",
}

const LANG_NAMES: Record<SupportedLanguage, string> = {
  en: "English",
  es: "Español",
}

export function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const current = i18n.language?.slice(0, 2) as SupportedLanguage

  return (
    <div className="flex items-center gap-1 px-3 py-2">
      {SUPPORTED_LANGUAGES.map((lang) => (
        <button
          key={lang}
          onClick={() => changeLanguage(lang)}
          title={LANG_NAMES[lang]}
          className={`rounded px-2 py-0.5 text-xs font-semibold transition-colors ${
            current === lang
              ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
              : "text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          }`}
        >
          {LANG_LABELS[lang]}
        </button>
      ))}
    </div>
  )
}
