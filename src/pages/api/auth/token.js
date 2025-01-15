import cookie from "cookie"
import refreshAccessToken from "@/utils/refreshAccessToken"
import setAuthCookies from "@/utils/setAuthCookies"

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

    const newTokenData = {
      access_token: {
        value: tokenData.access_token,
        maxAge: tokenData.expires_in
      },
      refresh_token: {
        value: tokenData.refresh_token,
        maxAge: tokenData.expires_in
      },
      id_token: {
        value: tokenData.id_token,
        maxAge: tokenData.expires_in
      }
    }
    setAuthCookies(res, newTokenData)
  } catch (error) {
    console.error("Error refreshing token:", error.message)
    return res.status(401).json({ error: "Failed to refresh token" })
  }

  if (!access_token) {
    return res.status(401).json({ error: "No autenticado" })
  }
  return res.status(200).json({ access_token })
}
