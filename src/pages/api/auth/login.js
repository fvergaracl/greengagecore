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

  // Borrar cookies relacionadas con la autenticación previa
  res.setHeader("Set-Cookie", [
    `code_verifier=; HttpOnly; Path=/; Secure=${
      process.env.NODE_ENV === "production"
    }; Max-Age=0`,
    `access_token=; HttpOnly; Path=/; Secure=${
      process.env.NODE_ENV === "production"
    }; Max-Age=0`,
    `refresh_token=; HttpOnly; Path=/; Secure=${
      process.env.NODE_ENV === "production"
    }; Max-Age=0`
  ])

  // Generar PKCE para la nueva sesión
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = await generateCodeChallenge(codeVerifier)

  // Almacenar el code_verifier en una cookie para usarlo más tarde
  res.setHeader(
    "Set-Cookie",
    `code_verifier=${codeVerifier}; HttpOnly; Path=/; Secure=${
      process.env.NODE_ENV === "production"
    }`
  )

  const logoutUrl = `${KEYCLOAK_BASE_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/logout?redirect_uri=${encodeURIComponent(
    `${NEXTAUTH_URL}/api/auth/login`
  )}`

  if (req.query.logout === "true") {
    return res.redirect(logoutUrl)
  }

  const authUrl =
    `${KEYCLOAK_BASE_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/auth?` +
    new URLSearchParams({
      client_id: KEYCLOAK_CLIENT_ID,
      redirect_uri: `${NEXTAUTH_URL}/api/auth/callback`,
      response_type: "code",
      scope: "openid profile email offline_access greenCrowdScope",
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      prompt: "login"
    })

  res.redirect(authUrl)
}
