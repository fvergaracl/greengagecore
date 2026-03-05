// POST /api/questionnaires/upload
// Recibe archivos (multipart/form-data) durante el diseño/testing en SurveyJS Creator.
// Los sube a MinIO y devuelve una presigned URL para visualización inmediata.
// El cliente almacena la `key` MinIO como valor de la respuesta.

import { NextRequest, NextResponse } from "next/server"
import { withResearcher } from "@/middleware/auth"
import { minio, ensureBucketExists } from "@/lib/minio"

const BUCKET = process.env.MINIO_BUCKET ?? "greencrowd-attachments"
const MAX_FILE_BYTES = 20 * 1024 * 1024 // 20 MB por archivo
const MAX_FILES = 10
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif",
  "image/gif", "image/svg+xml",
  "video/mp4", "video/webm", "video/quicktime",
  "audio/mpeg", "audio/wav", "audio/ogg",
  "application/pdf",
])
const PRESIGN_TTL = 60 * 60 * 24 // 24 h (para previsualización en el creator)

export const POST = withResearcher(async (req: NextRequest) => {
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 })
  }

  const fileEntries = formData.getAll("files")
  if (fileEntries.length === 0) {
    return NextResponse.json({ error: "At least one file required (field name: 'files')" }, { status: 400 })
  }
  if (fileEntries.length > MAX_FILES) {
    return NextResponse.json({ error: `Max ${MAX_FILES} files per request` }, { status: 400 })
  }

  await ensureBucketExists()

  const results: { name: string; key: string; url: string }[] = []

  for (const entry of fileEntries) {
    if (!(entry instanceof File)) continue

    const mimeType = entry.type || "application/octet-stream"
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json({ error: `File type not allowed: ${mimeType}` }, { status: 400 })
    }

    const buffer = Buffer.from(await entry.arrayBuffer())
    if (buffer.length > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: `File "${entry.name}" exceeds ${MAX_FILE_BYTES / 1024 / 1024} MB limit` },
        { status: 413 }
      )
    }

    const ext = entry.name.split(".").pop()?.toLowerCase() ?? mimeType.split("/")[1] ?? "bin"
    const key = `questionnaire-uploads/${crypto.randomUUID()}.${ext}`

    await minio.putObject(BUCKET, key, buffer, buffer.length, {
      "Content-Type": mimeType,
      "x-amz-meta-original-name": entry.name,
    })

    const url = await minio.presignedGetObject(BUCKET, key, PRESIGN_TTL)
    results.push({ name: entry.name, key, url })
  }

  return NextResponse.json({ files: results }, { status: 200 })
})
