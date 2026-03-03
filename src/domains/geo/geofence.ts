// GreenCrowd V2 — Geofencing utilities
// Server-side: PostGIS queries
// Shared logic (also used in anti-spoofing validation)

import { prisma } from "@/lib/db"
import { Sql } from "@prisma/client/runtime/library"

export type LatLng = {
  latitude: number
  longitude: number
}

export type NearbyTask = {
  taskId: string
  taskTitle: string
  taskType: string
  poiId: string
  poiName: string
  distanceMeters: number
  campaignId: string
  campaignName: string
}

export type AreaWithOpenTasks = {
  areaId: string
  areaName: string
  campaignId: string
  openTaskCount: number
}

/**
 * Returns the tasks visible to the user at their current position.
 * Applies: published campaign, dates, POI radius, response limit.
 */
export async function getNearbyTasks(
  position: LatLng,
  userId: string,
  maxRadiusMeters = 500
): Promise<NearbyTask[]> {
  // Raw SQL with PostGIS
  return prisma.$queryRaw<NearbyTask[]>`
    SELECT
      t.id AS "taskId",
      t.title AS "taskTitle",
      t.type AS "taskType",
      p.id AS "poiId",
      p.name AS "poiName",
      ST_Distance(
        p.location,
        ST_SetSRID(ST_MakePoint(${position.longitude}, ${position.latitude}), 4326)::geography
      ) AS "distanceMeters",
      c.id AS "campaignId",
      c.name AS "campaignName"
    FROM tasks t
    JOIN points_of_interest p ON t.poi_id = p.id
    JOIN areas a ON p.area_id = a.id
    JOIN campaigns c ON a.campaign_id = c.id
    WHERE
      c.status = 'published'
      AND (c.start_datetime IS NULL OR c.start_datetime <= NOW())
      AND (c.end_datetime IS NULL OR c.end_datetime >= NOW())
      AND t.is_disabled = false
      AND p.is_disabled = false
      AND a.is_disabled = false
      AND (t.available_from IS NULL OR t.available_from <= NOW())
      AND (t.available_to IS NULL OR t.available_to >= NOW())
      AND ST_DWithin(
        p.location,
        ST_SetSRID(ST_MakePoint(${position.longitude}, ${position.latitude}), 4326)::geography,
        ${maxRadiusMeters}
      )
      -- Exclude already completed tasks if response_limit = 1
      AND NOT (
        t.response_limit = 1
        AND EXISTS (
          SELECT 1 FROM contributions cn
          WHERE cn.task_id = t.id
            AND cn.user_id = ${userId}::uuid
            AND cn.status IN ('submitted', 'validated')
        )
      )
    ORDER BY "distanceMeters" ASC
    LIMIT 50
  `
}

/**
 * Checks if a position is within any active area with tasks.
 * Used for server-side notifications.
 */
export async function getAreasWithOpenTasksAt(
  position: LatLng,
  userId: string
): Promise<AreaWithOpenTasks[]> {
  return prisma.$queryRaw<AreaWithOpenTasks[]>`
    SELECT
      a.id AS "areaId",
      a.name AS "areaName",
      c.id AS "campaignId",
      COUNT(t.id) AS "openTaskCount"
    FROM areas a
    JOIN campaigns c ON a.campaign_id = c.id
    JOIN tasks t ON t.area_id = a.id
    WHERE
      c.status = 'published'
      AND (c.start_datetime IS NULL OR c.start_datetime <= NOW())
      AND (c.end_datetime IS NULL OR c.end_datetime >= NOW())
      AND a.is_disabled = false
      AND t.is_disabled = false
      AND (t.available_from IS NULL OR t.available_from <= NOW())
      AND (t.available_to IS NULL OR t.available_to >= NOW())
      -- Point within the area polygon
      AND ST_Within(
        ST_SetSRID(ST_MakePoint(${position.longitude}, ${position.latitude}), 4326),
        a.polygon::geometry
      )
      -- User has access to the campaign
      AND EXISTS (
        SELECT 1 FROM user_campaign_access uca
        WHERE uca.campaign_id = c.id
          AND uca.user_id = ${userId}::uuid
      )
    GROUP BY a.id, a.name, c.id
    HAVING COUNT(t.id) > 0
  `
}

/**
 * Validates that a position is within the radius of a POI.
 * Used for anti-spoofing when saving contributions.
 */
export async function isWithinPoiRadius(
  position: LatLng,
  poiId: string,
  toleranceMeters = 0
): Promise<boolean> {
  const results = await prisma.$queryRaw<{ within: boolean }[]>`
    SELECT ST_DWithin(
      p.location,
      ST_SetSRID(ST_MakePoint(${position.longitude}, ${position.latitude}), 4326)::geography,
      p.radius_meters + ${toleranceMeters}
    ) AS within
    FROM points_of_interest p
    WHERE p.id = ${poiId}::uuid
  `
  return results[0]?.within ?? false
}

/**
 * Calcula la distancia en metros entre dos puntos.
 */
export function haversineDistance(a: LatLng, b: LatLng): number {
  const R = 6371e3 // Earth radius in meters
  const φ1 = (a.latitude * Math.PI) / 180
  const φ2 = (b.latitude * Math.PI) / 180
  const Δφ = ((b.latitude - a.latitude) * Math.PI) / 180
  const Δλ = ((b.longitude - a.longitude) * Math.PI) / 180

  const x =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))

  return R * c
}
