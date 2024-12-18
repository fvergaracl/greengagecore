import cookie from "cookie"
import clearAllCookies from "../../../utils/clearAllCookies"

const validateToken = async token => {
  const introspectUrl = `${process.env.KEYCLOAK_BASE_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token/introspect`

  const params = new URLSearchParams({
    client_id: process.env.KEYCLOAK_CLIENT_ID,
    client_secret: process.env.KEYCLOAK_CLIENT_SECRET,
    token
  })

  const response = await fetch(introspectUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString()
  })

  if (!response.ok) {
    console.error(`Token introspection failed: ${response.statusText}`)
    return false
  }

  const data = await response.json()
  return data.active // Returns true if the token is active
}

export default async function handler(req, res) {
  const {
    KEYCLOAK_BASE_URL,
    KEYCLOAK_REALM,
    KEYCLOAK_CLIENT_ID,
    KEYCLOAK_CLIENT_SECRET
  } = process.env

  const cookies = cookie.parse(req.headers.cookie || "")
  const token = req.headers.authorization?.split(" ")[1] || cookies.access_token
  const refreshToken = req.headers.refresh_token || cookies.refresh_token
  const idToken = req.headers.idToken || cookies.idToken

  try {
    const validToken = await validateToken(token)
    if (!refreshToken && !idToken) {
      await clearAllCookies(req, res)
      res.setHeader(
        "Set-Cookie",
        `flash_message=${encodeURIComponent(
          "You are already logged out"
        )}; Path=/; HttpOnly; Secure=${
          process.env.NODE_ENV === "production"
        }; Max-Age=30`
      )
    }
    if (!validToken) {
      await clearAllCookies(req, res)
      res.setHeader(
        "Set-Cookie",
        `flash_message=${encodeURIComponent(
          "You are already logged out."
        )}; Path=/; HttpOnly; Secure=${
          process.env.NODE_ENV === "production"
        }; Max-Age=30`
      )
    }

    if (validToken && (refreshToken || idToken)) {
      const logoutUrl = `${KEYCLOAK_BASE_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/logout`

      const params = new URLSearchParams({
        client_id: KEYCLOAK_CLIENT_ID,
        client_secret: KEYCLOAK_CLIENT_SECRET
      })

      if (refreshToken) {
        params.append("refresh_token", refreshToken)
      }
      if (idToken) {
        params.append("id_token_hint", idToken)
      }

      const logoutResponse = await fetch(logoutUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString()
      })

      console.log("Logout response status:", logoutResponse.status)
      await clearAllCookies(req, res)
      if (!logoutResponse.ok) {
        res.setHeader(
          "Set-Cookie",
          `flash_message=${encodeURIComponent(
            "Failed to log out from Keycloak session"
          )}; Path=/; HttpOnly; Secure=${
            process.env.NODE_ENV === "production"
          }; Max-Age=30`
        )

      }
    }

    res.redirect("/")
  } catch (error) {
    await clearAllCookies(req, res)
    console.error("Error during logout process:", error.message)

    res.setHeader(
      "Set-Cookie",
      `flash_message=${encodeURIComponent(
        "Failed to log out from Keycloak session"
      )}; Path=/; HttpOnly; Secure=${
        process.env.NODE_ENV === "production"
      }; Max-Age=30`
    )
    res.redirect("/")
  }
}
