"use client"

// Provider de i18n que inicializa i18next antes de renderizar children.
// Debe envolver toda la app o al menos los layouts que usen traducciones.

import { useEffect, useState, type ReactNode } from "react"
import { I18nextProvider } from "react-i18next"
import { initI18n, i18n } from "@/lib/i18n/client"

export function I18nProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    initI18n().then(() => setReady(true))
  }, [])

  if (!ready) return null

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
}
