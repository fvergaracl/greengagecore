import { booleanIntersects, booleanTouches, polygon as turfPolygon } from "@turf/turf"

export function polygonsOverlap(
  a: GeoJSON.Polygon,
  b: GeoJSON.Polygon
): boolean {
  try {
    const aFeature = turfPolygon(a.coordinates as [number, number][][])
    const bFeature = turfPolygon(b.coordinates as [number, number][][])

    return (
      booleanIntersects(aFeature, bFeature) &&
      !booleanTouches(aFeature, bFeature)
    )
  } catch {
    return false
  }
}
