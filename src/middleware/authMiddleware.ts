import { NextApiRequest, NextApiResponse } from "next"
import KcAdminClient from "keycloak-admin"
import jwt from "jsonwebtoken"

const kcAdminClient = new KcAdminClient({
  baseUrl: process.env.KEYCLOAK_BASE_URL,
  realmName: process.env.KEYCLOAK_REALM
})

export const authMiddleware = (requiredRoles: string[] = []) => {
  return async (req: NextApiRequest, res: NextApiResponse, next: Function) => {
    try {
      // Obtener el token del encabezado Authorization
      const authHeader = req.headers.authorization
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "No token provided" })
      }

      const token = authHeader.split(" ")[1]

      // Decodificar el token para verificar su validez
      const decodedToken: any = jwt.decode(token, { complete: true })
      if (!decodedToken) {
        return res.status(401).json({ error: "Invalid token" })
      }

      // Verificar el token con Keycloak
      kcAdminClient.setAccessToken(token)
      const userInfo = await kcAdminClient.users.findOne({
        id: decodedToken.payload.sub
      })

      if (!userInfo || !userInfo.enabled) {
        return res.status(403).json({ error: "User not authorized" })
      }

      // Validar roles requeridos
      const userRoles = decodedToken.payload.realm_access?.roles || []
      const hasRequiredRoles = requiredRoles.every(role =>
        userRoles.includes(role)
      )
      if (requiredRoles.length > 0 && !hasRequiredRoles) {
        return res.status(403).json({ error: "Insufficient permissions" })
      }

      // Pasar el control a la siguiente función
      req.user = { id: userInfo.id, roles: userRoles }
      next()
    } catch (err: any) {
      console.error("Authentication error:", err.message)
      res.status(401).json({ error: "Invalid or expired token" })
    }
  }
}
