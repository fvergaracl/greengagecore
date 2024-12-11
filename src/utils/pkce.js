import crypto from "crypto"

// Generar el code_verifier
export function generateCodeVerifier() {
  return crypto.randomBytes(32).toString("base64url")
}

// Generar el code_challenge
export async function generateCodeChallenge(codeVerifier) {
  const hash = crypto.createHash("sha256").update(codeVerifier).digest()
  return Buffer.from(hash).toString("base64url")
}
