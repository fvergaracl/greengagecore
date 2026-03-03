// POST /api/uploads — Recibe un archivo (multipart) y lo sube a MinIO.
// Retorna la storage key para incluir en el payload de contribución.
import { NextRequest, NextResponse } from "next/server"
import { Client as MinioClient } from "minio"
import { withAuth } from "@/middleware/auth"

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
])

const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

const BUCKET = process.env.MINIO_BUCKET ?? "greencrowd-attachments"

const minio = new MinioClient({
  endPoint: process.env.MINIO_ENDPOINT!,
  port: parseInt(process.env.MINIO_PORT ?? "9000", 10),
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ACCESS_KEY!,
  secretKey: process.env.MINIO_SECRET_KEY!,
})

export const POST = withAuth(async (req: NextRequest, user) => {
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido: se esperaba multipart/form-data" }, { status: 400 })
  }

  const fileEntry = formData.get("file")
  if (!(fileEntry instanceof File)) {
    return NextResponse.json({ error: "Campo 'file' requerido" }, { status: 400 })
  }

  const mimeType = fileEntry.type || "application/octet-stream"
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return NextResponse.json(
      { error: `Tipo de archivo no permitido: ${mimeType}. Permitidos: jpeg, png, webp, heic` },
      { status: 400 }
    )
  }

  const buffer = Buffer.from(await fileEntry.arrayBuffer())
  if (buffer.length > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: `El archivo supera el límite de ${MAX_SIZE_BYTES / 1024 / 1024} MB` },
      { status: 413 }
    )
  }

  // Key: uploads/<userSub>/<uuid>.<ext>
  const ext = mimeType.split("/")[1].replace("jpeg", "jpg")
  const key = `uploads/${user.sub}/${crypto.randomUUID()}.${ext}`

  try {
    await minio.putObject(BUCKET, key, buffer, buffer.length, {
      "Content-Type": mimeType,
    })
  } catch (err) {
    console.error("[uploads] MinIO error:", err)
    return NextResponse.json({ error: "Error al subir el archivo. Inténtalo de nuevo." }, { status: 502 })
  }

  return NextResponse.json(
    {
      key,
      mimeType,
      sizeBytes: buffer.length,
    },
    { status: 201 }
  )
})
