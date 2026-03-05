"use client"

// SurveyJS Creator — componente interno cargado dinámicamente (browser-only).
// Los CSS de SurveyJS se importan aquí para no contaminar el bundle SSR.
import "survey-core/survey-core.min.css"
import "survey-creator-core/survey-creator-core.min.css"

import { useState } from "react"
import { SurveyCreatorComponent, SurveyCreator } from "survey-creator-react"

export interface SurveyCreatorInnerProps {
  onChange: (json: object) => void
  accessToken?: string
  initialJson?: object
}

export function SurveyCreatorInner({ onChange, accessToken, initialJson }: SurveyCreatorInnerProps) {
  const [creator] = useState(() => {
    const c = new SurveyCreator({
      showLogicTab: true,
      showTranslationTab: false,
      isAutoSave: false,
      showJSONEditorTab: true,
      showPreviewTab: true,
    })

    if (initialJson && Object.keys(initialJson).length > 0) {
      c.JSON = initialJson
    }

    // Sincronizar JSON con el padre tras cada modificación
    c.onModified.add(() => {
      onChange(c.JSON as object)
    })

    // Configurar upload MinIO en la pestaña Preview/Test
    const configureUpload = (survey: { onUploadFiles: { add: (fn: unknown) => void } }) => {
      survey.onUploadFiles.add(async (_: unknown, options: UploadFilesOptions) => {
        await handleFileUpload(options, accessToken)
      })
    }

    // Compatibilidad con distintas versiones de survey-creator-core
    if (typeof (c as CreatorWithEvents).onPreviewSurveyCreated?.add === "function") {
      ;(c as CreatorWithEvents).onPreviewSurveyCreated!.add((_: unknown, opts: { survey: Parameters<typeof configureUpload>[0] }) => {
        configureUpload(opts.survey)
      })
    }
    if (typeof (c as CreatorWithEvents).onTestSurveyCreated?.add === "function") {
      ;(c as CreatorWithEvents).onTestSurveyCreated!.add((_: unknown, opts: { survey: Parameters<typeof configureUpload>[0] }) => {
        configureUpload(opts.survey)
      })
    }

    return c
  })

  return (
    <div style={{ height: "calc(100vh - 340px)", minHeight: "520px" }}>
      <SurveyCreatorComponent creator={creator} />
    </div>
  )
}

// ─── tipos auxiliares ─────────────────────────────────────────────────────────

interface UploadFilesOptions {
  files: File[]
  callback: (status: string, data: { file: File; content: string }[]) => void
}

interface CreatorWithEvents {
  onPreviewSurveyCreated?: { add: (fn: unknown) => void }
  onTestSurveyCreated?: { add: (fn: unknown) => void }
}

// ─── upload a MinIO ───────────────────────────────────────────────────────────

async function handleFileUpload(options: UploadFilesOptions, accessToken?: string) {
  const formData = new FormData()
  for (const file of options.files) {
    formData.append("files", file, file.name)
  }

  try {
    const res = await fetch("/api/questionnaires/upload", {
      method: "POST",
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      body: formData,
    })

    if (!res.ok) {
      options.callback("error", [])
      return
    }

    const data: { files: { name: string; key: string; url: string }[] } = await res.json()

    // content = presigned URL para previsualización en el Creator.
    // En respuestas reales (mobile), se almacena la `key` MinIO directamente.
    options.callback(
      "success",
      data.files.map((f, i) => ({
        file: options.files[i],
        content: f.url,
      }))
    )
  } catch {
    options.callback("error", [])
  }
}
