import cookie from "cookie"
import axios from "axios"

const refreshAccessToken = async refreshToken => {
  try {
    const response = await axios.post(
      `${process.env.KEYCLOAK_BASE_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`,
      new URLSearchParams({
        client_id: process.env.KEYCLOAK_CLIENT_ID,
        client_secret: process.env.KEYCLOAK_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: refreshToken
      }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      }
    )

    return response.data // Returns new access_token and refresh_token
  } catch (error) {
    console.error("Error refreshing token:", error.message)
    return null
  }
}

export default async function handler(req, res) {
  const cookies = cookie.parse(req.headers.cookie || "")
  const access_token =
    req.headers.authorization?.split(" ")[1] || cookies.access_token
  const refreshToken = req.headers?.refresh_token || cookies?.refresh_token
  try {
    const tokenData = await refreshAccessToken(refreshToken)
    if (!tokenData) {
      return res.status(401).json({ error: "Failed to refresh token" })
    }

    res.setHeader("Set-Cookie", [
      cookie.serialize("access_token", tokenData.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 3600, // 1 hour
        path: "/"
      }),
      cookie.serialize("refresh_token", tokenData.refresh_token || "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 3600, // 7 days
        path: "/"
      }),
      cookie.serialize("id_token", tokenData.id_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 3600, // 1 hour
        path: "/"
      })
    ])
  } catch (error) {
    console.error("Error refreshing token:", error.message)
    return res.status(401).json({ error: "Failed to refresh token" })
  }

  if (!access_token) {
    return res.status(401).json({ error: "No autenticado" })
  }
  return res.status(200).json({ access_token })
}
