import axios from "axios"
import cookie from "cookie"

export default async function handler(req, res) {
  const {
    KEYCLOAK_CLIENT_SECRET,
    KEYCLOAK_BASE_URL,
    KEYCLOAK_REALM,
    KEYCLOAK_CLIENT_ID,
    NEXTAUTH_URL
  } = process.env
  console.log("Query parameters received:", req.query)
  const { code } = req.query

  if (!code) {
    return res.status(400).json({ error: "Authorization code missing" })
  }

  // Recuperar el code_verifier de las cookies
  const cookies = cookie.parse(req.headers.cookie || "")
  const codeVerifier = cookies.code_verifier
  res.setHeader(
    "Set-Cookie",
    `code_verifier=${codeVerifier}; HttpOnly; Path=/; Secure=${
      process.env.NODE_ENV === "production"
    }`
  )

  try {
    // Intercambiar el código por tokens
    const tokenResponse = await axios.post(
      `${KEYCLOAK_BASE_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`,
      new URLSearchParams({
        client_id: KEYCLOAK_CLIENT_ID,
        client_secret: KEYCLOAK_CLIENT_SECRET,
        redirect_uri: `${NEXTAUTH_URL}/api/auth/callback`,
        grant_type: "authorization_code",
        code,
        code_verifier: codeVerifier
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    )

    const { access_token, refresh_token } = tokenResponse.data

    // Configurar cookies para los tokens
    res.setHeader(
      "Set-Cookie",
      [
        cookie.serialize("access_token", access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 3600,
          path: "/"
        }),
        cookie.serialize("refresh_token", refresh_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 3600 * 24 * 7,
          path: "/"
        })
      ].join("; ")
    )

    res.redirect("/dashboard")
  } catch (error) {
    console.error("Error exchanging code for token:", error.message)
    res.status(500).json({ error: "Failed to exchange code for token" })
  }
}
