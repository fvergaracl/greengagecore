const jwt = require("jsonwebtoken")
const KeycloakAdminClient = require("keycloak-admin")

const keycloakUrl =
  process.env.KEYCLOAK_ISSUER_URL || "http://localhost:8080/auth"
const realmName = process.env.KEYCLOAK_REALM || "master"
const clientId = Process.env.KEYCLOAK_CLIENT_ID || "admin-cli"
const clientSecret = process.env.KEYCLOAK_CLIENT_SECRET || "admin-cli"

const keycloak = new KeycloakAdminClient({
  baseUrl: keycloakUrl,
  realmName
})

// Autenticar al cliente Keycloak para usar la API administrativa
async function authenticateClient() {
  try {
    await keycloak.auth({
      grantType: "client_credentials",
      clientId,
      clientSecret
    })
  } catch (error) {
    console.error("Error al autenticar el cliente:", error.message)
    throw new Error("No se pudo autenticar el cliente.")
  }
}

// Verificar un token JWT contra Keycloak
async function verifyToken(token) {
  try {
    await authenticateClient()

    const decodedToken = jwt.decode(token, { complete: true })
    if (!decodedToken || !decodedToken.payload) {
      throw new Error("Token inválido.")
    }

    const tokenInfo = await keycloak.users.findOne({
      id: decodedToken.payload.sub
    })

    if (!tokenInfo) {
      throw new Error("Usuario no encontrado o token inválido.")
    }

    return { valid: true, user: tokenInfo } // Token válido
  } catch (error) {
    console.error("Error al verificar el token:", error.message)
    return { valid: false, error: error.message } // Token inválido
  }
}

// Iniciar sesión con credenciales y obtener un token JWT
async function login(username, password) {
  try {
    const response = await keycloak.auth({
      grantType: "password",
      clientId,
      clientSecret,
      username,
      password
    })

    if (!response || !response.access_token) {
      throw new Error("Credenciales inválidas o error en el inicio de sesión.")
    }

    return {
      success: true,
      token: response.access_token,
      refreshToken: response.refresh_token
    } // Token generado
  } catch (error) {
    console.error("Error en el inicio de sesión:", error.message)
    return { success: false, error: error.message } // Fallo en el inicio de sesión
  }
}

// Cerrar sesión (invalidar token)
async function logout(refreshToken) {
  try {
    await authenticateClient()

    // Endpoint de logout de Keycloak
    const logoutUrl = `${keycloakUrl}/realms/${realmName}/protocol/openid-connect/logout`

    const params = new URLSearchParams()
    params.append("client_id", clientId)
    params.append("client_secret", clientSecret)
    params.append("refresh_token", refreshToken)

    const response = await fetch(logoutUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Error en el cierre de sesión: ${error}`)
    }

    return { success: true, message: "Cierre de sesión exitoso" }
  } catch (error) {
    console.error("Error en el cierre de sesión:", error.message)
    return { success: false, error: error.message }
  }
}

module.exports = { verifyToken, login, logout }
