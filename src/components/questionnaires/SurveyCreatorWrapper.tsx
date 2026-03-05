"use client"

// SurveyCreatorWrapper — carga el Creator con dynamic import (ssr:false).
// Usar este componente en lugar de SurveyCreatorInner directamente.

import dynamic from "next/dynamic"
import type { SurveyCreatorInnerProps } from "./SurveyCreatorInner"

export const SurveyCreatorWrapper = dynamic<SurveyCreatorInnerProps>(
  () =>
    import("./SurveyCreatorInner").then(m => m.SurveyCreatorInner),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700" style={{ height: "calc(100vh - 340px)", minHeight: "520px" }}>
        <p className="text-sm text-gray-400">Loading survey designer…</p>
      </div>
    ),
  }
)
