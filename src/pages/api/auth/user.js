import axios from "axios"
import cookie from "cookie"

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
  const token = req.headers.authorization?.split(" ")[1] || cookies.access_token
  const refreshToken = req.headers.refresh_token || cookies.refresh_token
  if (!token) {
    return res.status(401).json({ error: "No autenticado" })
  }


  try {
    const userInfo = await axios.get(
      `${process.env.KEYCLOAK_BASE_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/userinfo`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

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

    res.status(200).json(userInfo.data)
  } catch (error) {
    console.error(
      "Error validando token:",
      error.response?.data || error.message
    )

    res.status(401).json({ error: "Token inválido o expirado" })
  }
}
