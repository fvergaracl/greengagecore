"use client"

// Cliente i18next para componentes React (browser).
// Carga las traducciones desde /public/locales/{lang}/common.json

import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, type SupportedLanguage, LOCALE_COOKIE } from "./config"

let initialized = false

function getInitialLanguage(): SupportedLanguage {
  if (typeof document === "undefined") return DEFAULT_LANGUAGE
  const cookie = document.cookie
    .split(";")
    .find((c) => c.trim().startsWith(`${LOCALE_COOKIE}=`))
  const lang = cookie?.split("=")[1]?.trim()
  if (lang && (SUPPORTED_LANGUAGES as readonly string[]).includes(lang)) {
    return lang as SupportedLanguage
  }
  const browserLang = navigator.language.slice(0, 2)
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(browserLang)
    ? (browserLang as SupportedLanguage)
    : DEFAULT_LANGUAGE
}

async function loadResources(lang: SupportedLanguage) {
  const res = await fetch(`/locales/${lang}/common.json`)
  if (!res.ok) throw new Error(`Failed to load ${lang} translations`)
  return res.json()
}

export async function initI18n(): Promise<typeof i18n> {
  if (initialized) return i18n

  const lang = getInitialLanguage()
  const resources: Record<string, { common: Record<string, unknown> }> = {}

  // Cargar idioma activo + inglés como fallback
  const langs = lang === DEFAULT_LANGUAGE ? [lang] : [lang, DEFAULT_LANGUAGE]
  await Promise.all(
    langs.map(async (l) => {
      resources[l] = { common: await loadResources(l as SupportedLanguage) }
    })
  )

  await i18n.use(initReactI18next).init({
    lng: lang,
    fallbackLng: DEFAULT_LANGUAGE,
    defaultNS: "common",
    resources,
    interpolation: { escapeValue: false },
  })

  initialized = true
  return i18n
}

export async function changeLanguage(lang: SupportedLanguage): Promise<void> {
  // Cargar traducciones si no están en memoria
  if (!i18n.hasResourceBundle(lang, "common")) {
    const translations = await loadResources(lang)
    i18n.addResourceBundle(lang, "common", translations)
  }

  await i18n.changeLanguage(lang)

  // Persistir preferencia en cookie (1 año)
  document.cookie = `${LOCALE_COOKIE}=${lang}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
}

export { i18n }
