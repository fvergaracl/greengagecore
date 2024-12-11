import {
  generateCodeVerifier,
  generateCodeChallenge
} from "../../../utils/pkce"

export default async function handler(req, res) {
  const {
    KEYCLOAK_BASE_URL,
    KEYCLOAK_REALM,
    KEYCLOAK_CLIENT_ID,
    NEXTAUTH_URL
  } = process.env

  const codeVerifier = generateCodeVerifier()
  const codeChallenge = await generateCodeChallenge(codeVerifier)

  // Almacenar el code_verifier en una cookie para usarlo más tarde
  res.setHeader(
    "Set-Cookie",
    `code_verifier=${codeVerifier}; HttpOnly; Path=/; Secure=${
      process.env.NODE_ENV === "production"
    }`
  )

  const authUrl =
    `${KEYCLOAK_BASE_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/auth?` +
    new URLSearchParams({
      client_id: KEYCLOAK_CLIENT_ID,
      redirect_uri: `${NEXTAUTH_URL}/api/auth/callback`,
      response_type: "code",
      scope: "openid profile email",
      code_challenge: codeChallenge,
      code_challenge_method: "S256"
    })
  console.log("Redirecting to Keycloak:", authUrl) // <-- Agrega esto para verificar
  console.log({
    KEYCLOAK_BASE_URL,
    KEYCLOAK_REALM,
    KEYCLOAK_CLIENT_ID,
    NEXTAUTH_URL
  })
  res.redirect(authUrl)
}
