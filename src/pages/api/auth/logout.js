import cookie from "cookie"
import clearAllCookies from "../../../utils/clearAllCookies"
export default async function handler(req, res) {
  const {
    KEYCLOAK_BASE_URL,
    KEYCLOAK_REALM,
    KEYCLOAK_CLIENT_ID,
    NEXTAUTH_URL
  } = process.env

  const cookies = cookie.parse(req.headers.cookie || "")
  const refreshToken = cookies.refresh_token

  try {
    if (refreshToken) {
      const logoutUrl = `${KEYCLOAK_BASE_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/logout`

      const params = new URLSearchParams({
        client_id: KEYCLOAK_CLIENT_ID,
        refresh_token: refreshToken
      })

      await fetch(logoutUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params
      })
    }

    clearAllCookies(req, res)
    return res.redirect(`${NEXTAUTH_URL}/`)
  } catch (error) {
    console.error("Error during logout process:", error.message)
    return res
      .status(500)
      .json({ error: "Failed to log out from Keycloak session" })
  }
}
