import axios from "axios"
import cookie from "cookie"
import prisma from "@/prismaClient"

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

  const cookies = cookie.parse(req.headers.cookie || "")
  const codeVerifier = cookies.code_verifier

  try {
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

    const { access_token, refresh_token, id_token } = tokenResponse.data

    const userInfoResponse = await axios.get(
      `${KEYCLOAK_BASE_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/userinfo`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    )

    const userInfo = userInfoResponse.data // e.g., { sub, email, name, etc. }
    const userSub = userInfo.sub

    let user = await prisma.user.findUnique({
      where: { sub: userSub }
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          sub: userSub
        }
      })
      console.log("New user created:", user)
    } else {
      console.log("User already exists:", user)
    }

    // Set cookies for the tokens
    res.setHeader("Set-Cookie", [
      cookie.serialize("access_token", access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 3600, // 1 hour
        path: "/"
      }),
      cookie.serialize("refresh_token", refresh_token || "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 3600, // 7 days
        path: "/"
      }),
      cookie.serialize("id_token", id_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 3600, // 1 hour
        path: "/"
      })
    ])

    res.redirect("/dashboard")
  } catch (error) {
    console.error("Error during callback process:", error.message)
    res
      .status(500)
      .json({ error: "Failed to complete the authentication flow" })
  }
}
