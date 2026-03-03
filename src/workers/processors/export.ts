// GreenCrowd V2 — Processor: Async exports (CSV, GeoJSON)
// For large datasets (>10k records) a file is generated and uploaded to MinIO.

import { prisma } from "@/lib/db"
import { minio } from "@/lib/minio"

export type ExportJob = {
  campaignId: string
  requestedBy: string
  format: "csv" | "geojson"
  filters?: { dateFrom?: string; dateTo?: string; areaId?: string }
}

export async function processExport(job: ExportJob): Promise<void> {
  const { campaignId, format, filters } = job

  const contributions = await prisma.contribution.findMany({
    where: {
      campaignId,
      status: { in: ["submitted", "validated"] },
      ...(filters?.dateFrom || filters?.dateTo
        ? {
            submittedAt: {
              ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
              ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}),
            },
          }
        : {}),
    },
    include: {
      task: { select: { title: true, type: true } },
      attachments: { select: { storageKey: true, type: true } },
    },
    orderBy: { submittedAt: "asc" },
  })

  let content: string
  let contentType: string
  let extension: string

  if (format === "csv") {
    content = toCSV(contributions)
    contentType = "text/csv"
    extension = "csv"
  } else {
    content = toGeoJSON(contributions)
    contentType = "application/geo+json"
    extension = "geojson"
  }

  const key = `exports/${campaignId}/${Date.now()}.${extension}`
  const buffer = Buffer.from(content, "utf-8")

  await minio.putObject(
    process.env.MINIO_BUCKET ?? "greencrowd-attachments",
    key,
    buffer,
    buffer.length,
    { "Content-Type": contentType }
  )

  // Generar URL firmada válida por 24 horas
  const url = await minio.presignedGetObject(
    process.env.MINIO_BUCKET ?? "greencrowd-attachments",
    key,
    86400
  )

  console.info(`[Export] Export ready: ${url}`)
  // TODO: notificar al usuario por email que el export está listo
}

type ContributionRow = {
  id: string
  submittedAt: Date | null
  latitude: number
  longitude: number
  status: string
  data: unknown
  task: { title: string; type: string } | null
}

function toCSV(rows: ContributionRow[]): string {
  const headers = ["id", "task_title", "task_type", "latitude", "longitude", "status", "submitted_at", "data"]
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      [
        r.id,
        `"${r.task?.title ?? ""}"`,
        r.task?.type ?? "",
        r.latitude,
        r.longitude,
        r.status,
        r.submittedAt?.toISOString() ?? "",
        `"${JSON.stringify(r.data).replace(/"/g, '""')}"`,
      ].join(",")
    ),
  ]
  return lines.join("\n")
}

function toGeoJSON(rows: ContributionRow[]): string {
  const features = rows.map((r) => ({
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [r.longitude, r.latitude],
    },
    properties: {
      id: r.id,
      task_title: r.task?.title,
      task_type: r.task?.type,
      status: r.status,
      submitted_at: r.submittedAt?.toISOString(),
      data: r.data,
    },
  }))

  return JSON.stringify({ type: "FeatureCollection", features }, null, 2)
}
