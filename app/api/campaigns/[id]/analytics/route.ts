// API: GET /api/campaigns/[id]/analytics
// Devuelve datos de contribuciones por día (últimos N días) + desglose por tarea.
// Requiere researcher con ownership de la campaña (via NextAuth session cookie).

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: campaignId } = await params
  const { searchParams } = req.nextUrl
  const days = Math.min(parseInt(searchParams.get("days") ?? "30"), 90)

  // Verificar ownership
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, researcherId: session.user.id },
    select: { id: true, name: true },
  })
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
  }

  const since = new Date()
  since.setDate(since.getDate() - days)
  since.setHours(0, 0, 0, 0)

  // Contribuciones por día (raw SQL para agrupar por fecha en Postgres)
  const dailyRaw = await prisma.$queryRaw<
    { date: Date; status: string; count: bigint }[]
  >`
    SELECT
      date_trunc('day', created_at AT TIME ZONE 'UTC') AS date,
      status,
      COUNT(*) AS count
    FROM contributions
    WHERE campaign_id = ${campaignId}::uuid
      AND created_at >= ${since}
    GROUP BY 1, 2
    ORDER BY 1 ASC
  `

  // Construir serie temporal con todos los días en el rango
  const dateMap = new Map<
    string,
    { date: string; submitted: number; validated: number; rejected: number; flagged: number; total: number }
  >()

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    dateMap.set(key, { date: key, submitted: 0, validated: 0, rejected: 0, flagged: 0, total: 0 })
  }

  for (const row of dailyRaw) {
    const key = new Date(row.date).toISOString().slice(0, 10)
    const entry = dateMap.get(key)
    if (!entry) continue
    const n = Number(row.count)
    entry[row.status as keyof typeof entry] = n
    entry.total += n
  }

  const timeSeries = Array.from(dateMap.values())

  // Desglose por tarea (top 10)
  const byTaskRaw = await prisma.$queryRaw<
    { task_id: string; title: string; count: bigint; validated: bigint }[]
  >`
    SELECT
      t.id AS task_id,
      t.title,
      COUNT(c.id) AS count,
      COUNT(c.id) FILTER (WHERE c.status = 'validated') AS validated
    FROM tasks t
    LEFT JOIN contributions c ON c.task_id = t.id AND c.campaign_id = ${campaignId}::uuid
    WHERE (t.area_id IN (SELECT id FROM areas WHERE campaign_id = ${campaignId}::uuid)
        OR t.poi_id IN (SELECT poi.id FROM points_of_interest poi JOIN areas a ON poi.area_id = a.id WHERE a.campaign_id = ${campaignId}::uuid))
    GROUP BY t.id, t.title
    ORDER BY count DESC
    LIMIT 10
  `

  const byTask = byTaskRaw.map((r) => ({
    taskId: r.task_id,
    title: r.title,
    total: Number(r.count),
    validated: Number(r.validated),
  }))

  // Resumen global
  const summary = timeSeries.reduce(
    (acc, d) => {
      acc.total += d.total
      acc.submitted += d.submitted
      acc.validated += d.validated
      acc.rejected += d.rejected
      acc.flagged += d.flagged
      return acc
    },
    { total: 0, submitted: 0, validated: 0, rejected: 0, flagged: 0 }
  )

  return NextResponse.json({ timeSeries, byTask, summary, days })
}
