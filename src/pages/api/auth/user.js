import getUserInfo from "@/utils/getUserInfo"
import cookie from "cookie"
import jwt from "jsonwebtoken"
import refreshAccessToken from "@/utils/refreshAccessToken"
import setAuthCookies from "@/utils/setAuthCookies"

export default async function handler(req, res) {
  const cookies = cookie.parse(req.headers?.cookie || "")
  let token = req.headers.authorization?.split(" ")[1] || cookies?.access_token
  const refreshToken = req.headers?.refresh_token || cookies?.refresh_token

  if (!token || !refreshToken) {
    console.log("> No token or refresh token provided")
    return res.status(401).json({ error: "No autenticado" })
  }

  const tokenData = jwt.decode(token)
  const now = Math.floor(Date.now() / 1000)

  if (!tokenData || tokenData.exp - now <= 900) {
    console.log("> Token is close to expiration or expired. Refreshing...")
    const tokenDataRefreshed = await refreshAccessToken(refreshToken)
    if (tokenDataRefreshed) {
      token = tokenDataRefreshed.access_token
    }

    if (!tokenDataRefreshed) {
      console.error("> Failed to refresh token")
      return res.status(401).json({ error: "Failed to refresh token" })
    }

    const newTokenData = {
      access_token: {
        value: tokenDataRefreshed?.access_token,
        maxAge: tokenDataRefreshed.expires_in
      },
      refresh_token: {
        value: tokenDataRefreshed?.refresh_token,
        maxAge: tokenDataRefreshed.expires_in
      },
      id_token: {
        value: tokenDataRefreshed?.id_token,
        maxAge: tokenDataRefreshed.expires_in
      }
    }
    token = tokenDataRefreshed.access_token

    setAuthCookies(res, newTokenData)

    console.log("> Refreshed token. New expiration times:")
  }

  try {
    const userInfo = await getUserInfo(token)

    console.log("> User info retrieved successfully")
    res.status(200).json(userInfo)
  } catch (error) {
    console.error(
      "Error validating token:",
      error.response?.data || error.message
    )
    res.status(401).json({ error: "Invalid token or expired" })
  }
}
