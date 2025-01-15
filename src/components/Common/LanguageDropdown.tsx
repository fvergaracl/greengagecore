import React, { useState } from "react"
import { useTranslation } from "@/hooks/useTranslation"

type LocaleKey = "en" | "dk" | "es" | "nl" | "it"

const locales: Record<LocaleKey, { label: string; flag: string }> = {
  en: { label: "English", flag: "🇺🇸" },
  dk: { label: "Danish", flag: "🇩🇰" },
  es: { label: "Spanish", flag: "🇪🇸" },
  nl: { label: "Nederlands", flag: "🇳🇱" },
  it: { label: "Italian", flag: "🇮🇹" }
}

export default function LanguageDropdown() {
  const currentLocale = (localStorage.getItem("locale") as LocaleKey) || "en"
  const { t, setLocale } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)

  const handleLocaleChange = (locale: LocaleKey) => {
    setLocale(locale)
    setIsOpen(false)
  }

  return (
    <div className='relative inline-block text-left'>
      <p className='text-gray-600 mt-4' data-cy='settings-user-locale-label'>
        {t("Language")}
      </p>
      <div
        className='font-medium text-gray-800 flex items-center gap-2 cursor-pointer'
        onClick={() => setIsOpen(!isOpen)}
        data-cy='settings-user-locale-dropdown'
      >
        <span data-cy='settings-user-locale-flag'>
          {locales[currentLocale]?.flag || "🌍"}
        </span>
        <span data-cy='settings-user-locale'>
          {locales[currentLocale]?.label || t("Unknown Locale")}
        </span>
        <svg
          className='w-5 h-5 ml-2 text-gray-600 transform transition-transform'
          viewBox='0 0 20 20'
          fill='currentColor'
          xmlns='http://www.w3.org/2000/svg'
          style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <path
            fillRule='evenodd'
            d='M5.293 9.707a1 1 0 011.414 0L10 13.414l3.293-3.707a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z'
            clipRule='evenodd'
          />
        </svg>
      </div>
      {isOpen && (
        <div
          className='absolute mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10'
          data-cy='settings-user-locale-options'
        >
          <div className='py-1'>
            {Object.entries(locales).map(([key, { label, flag }]) => (
              <button
                key={key}
                onClick={() => handleLocaleChange(key as LocaleKey)}
                className='flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100'
                data-cy={`settings-user-locale-option-${key}`}
              >
                <span className='mr-2'>{flag}</span> {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
