import axios from "axios"
import cookie from "cookie"
import jwt from "jsonwebtoken"

const axiosInstance = axios.create({
  timeout: 10000 // 10 seconds
})

const refreshAccessToken = async refreshToken => {
  try {
    const response = await axiosInstance.post(
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

    return response.data
  } catch (error) {
    console.error("Error refreshing token:", error.message)
    return null
  }
}

export default async function handler(req, res) {
  const cookies = cookie.parse(req.headers?.cookie || "")
  let token = req.headers.authorization?.split(" ")[1] || cookies?.access_token
  const refreshToken = req.headers?.refresh_token || cookies?.refresh_token

  if (!token || !refreshToken) {
    console.log("> No token or refresh token provided")
    return res.status(401).json({ error: "No autenticado" })
  }

  // Decode the current token
  const tokenData = jwt.decode(token)
  const now = Math.floor(Date.now() / 1000)

  if (!tokenData || tokenData.exp - now <= 900) {
    console.log("> Token is close to expiration or expired. Refreshing...")
    const newTokenData = await refreshAccessToken(refreshToken)
    if (newTokenData) {
      token = newTokenData.access_token
    }

    if (!newTokenData) {
      console.error("> Failed to refresh token")
      return res.status(401).json({ error: "Failed to refresh token" })
    }

    // Update the cookies with the new tokens
    res.setHeader("Set-Cookie", [
      cookie.serialize("access_token", newTokenData.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 3600, // 1 hour
        path: "/"
      }),
      cookie.serialize("refresh_token", newTokenData.refresh_token || "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 3600, // 7 days
        path: "/"
      }),
      cookie.serialize("id_token", newTokenData.id_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 3600, // 1 hour
        path: "/"
      })
    ])

    console.log("> Refreshed token. New expiration times:")
    console.log({
      access_token: new Date(Date.now() + 3600 * 1000).toLocaleString(),
      refresh_token: new Date(
        Date.now() + 7 * 24 * 3600 * 1000
      ).toLocaleString(),
      id_token: new Date(Date.now() + 3600 * 1000).toLocaleString()
    })
  }

  try {
    const userInfo = await axios.get(
      `${process.env.KEYCLOAK_BASE_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/userinfo`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    console.log("> User info retrieved successfully")
    res.status(200).json(userInfo.data)
  } catch (error) {
    console.error(
      "Error validating token:",
      error.response?.data || error.message
    )
    res.status(401).json({ error: "Invalid token or expired" })
  }
}
