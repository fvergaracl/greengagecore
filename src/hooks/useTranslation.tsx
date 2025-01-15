import en from "../locales/en/common.json"
import es from "../locales/es/common.json"
import it from "../locales/it/common.json"
import da from "../locales/da/common.json"
import nl from "../locales/nl/common.json"

const translations: { [key: string]: { [key: string]: string } } = {
  en,
  es,
  it,
  da,
  nl
}

export function useTranslation() {
  const isClient = typeof window !== "undefined"

  const locale = isClient ? localStorage.getItem("locale") : null

  const currentLocale =
    locale && Object.keys(translations).includes(locale) ? locale : "en"

  const t = (key: string) => translations[currentLocale][key] || key
  const tLocale = (key: string, locale: string) =>
    translations[locale][key] || key

  const setLocale = (locale: string) => {
    localStorage.setItem("locale", locale)
  }

  return { t, tLocale, setLocale, locale: currentLocale }
}

export class TranslationBackend {
  private locale: string

  constructor(locale: string = "en") {
    this.locale = locale
  }

  t(key: string): string {
    return translations[this.locale][key] || key
  }

  tLocale(key: string, locale: string): string {
    return translations[locale][key] || key
  }
}


/*



Function to detect if have a translation or not




export function useTranslation() {
  const isClient = typeof window !== "undefined"

  const locale = isClient ? localStorage.getItem("locale") : null

  const currentLocale =
    locale && Object.keys(translations).includes(locale) ? locale : "en"

  const t = (key: string): JSX.Element => {
    const translation = translations[currentLocale][key]
    if (translation) {
      return <span data-cy='translated'>{translation}</span>
    }
    return <span data-cy='not-translated'>{key}</span>
  }

  const tLocale = (key: string, locale: string) => {
    const translation = translations[locale][key]
    if (translation) {
      return <span data-cy='translated'>{translation}</span>
    }
    return <span data-cy='not-translated'>{key}</span>
  }

  const setLocale = (locale: string) => {
    localStorage.setItem("locale", locale)
  }

  return { t, tLocale, setLocale, locale: currentLocale }
}

export class TranslationBackend {
  private locale: string

  constructor(locale: string = "en") {
    this.locale = locale
  }

  t(key: string): JSX.Element {
    const translation = translations[this.locale][key]
    if (translation) {
      return <span data-cy='translated'>{translation}</span>
    }
    return <span data-cy='not-translated'>{key}</span>
  }

  tLocale(key: string, locale: string): JSX.Element {
    const translation = translations[locale][key]
    if (translation) {
      return <span data-cy='translated'>{translation}</span>
    }
    return <span data-cy='not-translated'>{key}</span>
  }
}

*/