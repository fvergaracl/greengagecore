// GreenCrowd V2 — CORS middleware
// Applies to all /api/* routes.
// Configure allowed origins via ALLOWED_ORIGINS env var (comma-separated).
// Defaults to "*" in development.

import { NextRequest, NextResponse } from "next/server"

function getAllowedOrigins(): string[] {
  const raw = process.env.ALLOWED_ORIGINS
  if (raw) return raw.split(",").map(s => s.trim()).filter(Boolean)
  if (process.env.NODE_ENV === "development") return ["*"]
  return [process.env.NEXT_PUBLIC_APP_URL ?? ""]
}

const CORS_METHODS = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
const CORS_HEADERS = "Content-Type, Authorization, X-Requested-With"

export function middleware(req: NextRequest) {
  const origin = req.headers.get("origin") ?? ""
  const allowed = getAllowedOrigins()
  const allowOrigin = allowed.includes("*") ? "*" : (allowed.includes(origin) ? origin : "")

  // Preflight
  if (req.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": allowOrigin,
        "Access-Control-Allow-Methods": CORS_METHODS,
        "Access-Control-Allow-Headers": CORS_HEADERS,
        "Access-Control-Max-Age": "86400",
      },
    })
  }

  const res = NextResponse.next()
  if (allowOrigin) {
    res.headers.set("Access-Control-Allow-Origin", allowOrigin)
    res.headers.set("Access-Control-Allow-Methods", CORS_METHODS)
    res.headers.set("Access-Control-Allow-Headers", CORS_HEADERS)
  }
  return res
}

export const config = {
  matcher: "/api/:path*",
}
