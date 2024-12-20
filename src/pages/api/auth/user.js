import axios from "axios"
import cookie from "cookie"
import jwt from "jsonwebtoken"

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
  const cookies = cookie.parse(req.headers?.cookie || "")
  const token =
    req.headers.authorization?.split(" ")[1] || cookies?.access_token
  const refreshToken = req.headers?.refresh_token || cookies?.refresh_token
  if (!token) {
    console.log("> No token")
    console.log({
      token: token,
      cookies: cookies
    })
    return res.status(401).json({ error: "No autenticado" })
  }
  // refresh token only if will expire in less than 5 minutes
  const tokenData = jwt.decode(token)
  const now = Math.floor(Date.now() / 1000)

  if (tokenData.exp - now > 300) {
    try {
      const userInfo = await axios.get(
        `${process.env.KEYCLOAK_BASE_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/userinfo`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      console.log("> User info")
      const tokenData = await refreshAccessToken(refreshToken)
      if (!tokenData) {
        console.log("> Failed to refresh token")
        console.log({ tokenData })
        return res.status(401).json({ error: "Failed to refresh token" })
      }
      console.log(" ")
      console.log(" ")
      console.log(" ")
      console.log(" ")
      console.log(" ")
      console.log(" ")
      console.log(" ")
      console.log(" ")
      console.log(" ")
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
      // console.log of macAge of ecach cookie dd/mm/yyyy hh:mm:ss
      console.log({
        access_token: new Date(Date.now() + 3600 * 1000).toLocaleString(),
        refresh_token: new Date(
          Date.now() + 7 * 24 * 3600 * 1000
        ).toLocaleString(),
        id_token: new Date(Date.now() + 3600 * 1000).toLocaleString()
      })
      res.status(200).json(userInfo.data)
    } catch (error) {
      console.error(
        "Error validando token:",
        error.response?.data || error.message
      )

      res.status(401).json({ error: "Token inválido o expirado" })
    }
  }
  res.status(200).json({ tokenData })
}
