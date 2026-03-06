/**
 * provision-game-apikey.ts
 *
 * Runs at setup time. If API_GAME_APIKEY is the placeholder value, this script:
 *   1. Provisions Keycloak (Admin REST API) — idempotent:
 *      a. Creates realm role "AdministratorGAME" if missing
 *      b. Creates client "game-backend" (confidential, service accounts) if missing
 *      c. Assigns "AdministratorGAME" to the client's service account
 *   2. Gets a Keycloak token via client_credentials for the `game-backend` client
 *   3. Calls POST /apikey/create on the GAME engine
 *   4. Writes the returned API key into .env.local
 *
 * Usage:
 *   npx tsx scripts/provision-game-apikey.ts
 *   (or via: make provision-game-key)
 *
 * Required env vars (loaded from .env.local):
 *   KEYCLOAK_ISSUER              http://localhost:8080/realms/greencrowd
 *   KEYCLOAK_ADMIN               admin
 *   KEYCLOAK_ADMIN_PASSWORD      admin_secret
 *   GAME_KEYCLOAK_CLIENT_ID      game-backend
 *   GAME_KEYCLOAK_CLIENT_SECRET  game-backend-secret
 *   API_GAME_BASE_URL            http://localhost:8000/api/v1
 *   API_GAME_APIKEY              your_game_api_key_here  (placeholder triggers provisioning)
 */

import * as fs from "fs"
import * as path from "path"

const PLACEHOLDER = "your_game_api_key_here"
const GAME_ROLE = "AdministratorGAME"
const ENV_FILE = process.env.GAME_APIKEY_ENV_FILE
  ? path.resolve(process.env.GAME_APIKEY_ENV_FILE)
  : path.join(process.cwd(), ".env.local")

// ─── Minimal .env.local parser ───────────────────────────────────────────────

function loadEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {}
  const env: Record<string, string> = {}
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eqIdx = trimmed.indexOf("=")
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const raw = trimmed.slice(eqIdx + 1).trim()
    env[key] = raw.replace(/^["']|["']$/g, "")
  }
  return env
}

function getVar(env: Record<string, string>, name: string): string {
  const val = process.env[name] ?? env[name]
  if (!val) throw new Error(`Missing required env var: ${name}`)
  return val
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

async function kfetch(url: string, init: RequestInit): Promise<Response> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(15_000) })
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function waitForEndpoint(
  label: string,
  url: string,
  attempts = 30,
  delayMs = 2_000
): Promise<void> {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const res = await kfetch(url, { method: "GET" })
      if (res.ok) {
        console.log(`   ${label} reachable ✓`)
        return
      }
    } catch {
      // Service is still booting; retry until the timeout is reached.
    }

    if (attempt === 1) {
      console.log(`   Waiting for ${label} at ${url}...`)
    }

    await sleep(delayMs)
  }

  throw new Error(`${label} did not become ready at ${url}`)
}

async function adminJson<T>(
  url: string,
  adminToken: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await kfetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
      ...(init.headers as Record<string, string> | undefined)
    }
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => "")
    throw new Error(
      `Keycloak Admin API ${init.method ?? "GET"} ${url} → ${res.status}: ${txt}`
    )
  }
  const text = await res.text()
  return (text ? JSON.parse(text) : null) as T
}

// ─── Step 1: Keycloak Admin token (master realm / admin-cli) ─────────────────

async function getAdminToken(
  host: string,
  adminUser: string,
  adminPass: string
): Promise<string> {
  const url = `${host}/realms/master/protocol/openid-connect/token`
  const res = await kfetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "password",
      client_id: "admin-cli",
      username: adminUser,
      password: adminPass
    })
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => "")
    throw new Error(`Keycloak admin token failed (${res.status}): ${txt}`)
  }
  const data = (await res.json()) as { access_token: string }
  return data.access_token
}

// ─── Step 2: Ensure realm role exists ────────────────────────────────────────

async function ensureRealmRole(
  host: string,
  realm: string,
  adminToken: string,
  roleName: string
): Promise<void> {
  const url = `${host}/admin/realms/${realm}/roles/${encodeURIComponent(roleName)}`
  const res = await kfetch(url, {
    headers: { Authorization: `Bearer ${adminToken}` }
  })

  if (res.status === 404) {
    await adminJson(`${host}/admin/realms/${realm}/roles`, adminToken, {
      method: "POST",
      body: JSON.stringify({
        name: roleName,
        description: "Can create API keys in GAME engine"
      })
    })
    console.log(`   Role "${roleName}" created ✓`)
  } else if (res.ok) {
    console.log(`   Role "${roleName}" already exists ✓`)
  } else {
    const txt = await res.text().catch(() => "")
    throw new Error(`GET role failed (${res.status}): ${txt}`)
  }
}

// ─── Step 3: Ensure client exists, return internal UUID ──────────────────────

async function ensureClient(
  host: string,
  realm: string,
  adminToken: string,
  clientId: string,
  clientSecret: string
): Promise<string> {
  const listUrl = `${host}/admin/realms/${realm}/clients?clientId=${encodeURIComponent(clientId)}`
  const existing = await adminJson<Array<{ id: string }>>(listUrl, adminToken)

  if (existing.length > 0) {
    console.log(`   Client "${clientId}" already exists ✓`)
    return existing[0].id
  }

  await adminJson(`${host}/admin/realms/${realm}/clients`, adminToken, {
    method: "POST",
    body: JSON.stringify({
      clientId,
      name: "GAME Engine Backend",
      description:
        "Service account used by GreenCrowd to provision GAME API keys",
      enabled: true,
      publicClient: false,
      secret: clientSecret,
      standardFlowEnabled: false,
      implicitFlowEnabled: false,
      directAccessGrantsEnabled: false,
      serviceAccountsEnabled: true,
      authorizationServicesEnabled: false,
      protocol: "openid-connect"
    })
  })
  console.log(`   Client "${clientId}" created ✓`)

  // Fetch UUID of newly-created client
  const created = await adminJson<Array<{ id: string }>>(listUrl, adminToken)
  if (!created[0])
    throw new Error(`Client "${clientId}" not found after creation`)
  return created[0].id
}

// ─── Step 4: Assign realm role to client's service account ───────────────────

async function assignRoleToServiceAccount(
  host: string,
  realm: string,
  adminToken: string,
  clientUUID: string,
  roleName: string
): Promise<void> {
  // Get service account user
  const saUser = await adminJson<{ id: string }>(
    `${host}/admin/realms/${realm}/clients/${clientUUID}/service-account-user`,
    adminToken
  )

  // Get full role object (need id + name for the mapping body)
  const role = await adminJson<{ id: string; name: string }>(
    `${host}/admin/realms/${realm}/roles/${encodeURIComponent(roleName)}`,
    adminToken
  )

  // Assign role (idempotent — Keycloak ignores duplicates with 204)
  const res = await kfetch(
    `${host}/admin/realms/${realm}/users/${saUser.id}/role-mappings/realm`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify([{ id: role.id, name: role.name }])
    }
  )

  if (res.ok || res.status === 409) {
    console.log(`   Role "${roleName}" assigned to service account ✓`)
  } else {
    const txt = await res.text().catch(() => "")
    throw new Error(`Role assignment failed (${res.status}): ${txt}`)
  }
}

// ─── Keycloak full provisioning orchestrator ─────────────────────────────────

async function provisionKeycloak(opts: {
  issuer: string
  adminUser: string
  adminPass: string
  clientId: string
  clientSecret: string
}): Promise<void> {
  // Derive host and realm from issuer (e.g. http://localhost:8080/realms/greencrowd)
  const issuerUrl = new URL(opts.issuer)
  const host = issuerUrl.origin // http://localhost:8080
  const realm = issuerUrl.pathname.split("/").pop()! // greencrowd

  console.log(`   Host: ${host}  Realm: ${realm}`)

  const adminToken = await getAdminToken(host, opts.adminUser, opts.adminPass)
  console.log("   Keycloak admin token obtained ✓")

  await ensureRealmRole(host, realm, adminToken, GAME_ROLE)
  const clientUUID = await ensureClient(
    host,
    realm,
    adminToken,
    opts.clientId,
    opts.clientSecret
  )
  await assignRoleToServiceAccount(
    host,
    realm,
    adminToken,
    clientUUID,
    GAME_ROLE
  )
}

// ─── Keycloak: client_credentials token ──────────────────────────────────────

async function getKeycloakToken(
  issuer: string,
  clientId: string,
  clientSecret: string
): Promise<string> {
  const res = await kfetch(`${issuer}/protocol/openid-connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret
    })
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => "")
    throw new Error(`Keycloak token request failed (${res.status}): ${txt}`)
  }
  return ((await res.json()) as { access_token: string }).access_token
}

// ─── GAME: POST /apikey/create ────────────────────────────────────────────────

async function createGameApiKey(
  gameBaseUrl: string,
  bearerToken: string
): Promise<string> {
  let res: Response
  try {
    res = await kfetch(`${gameBaseUrl}/apikey/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearerToken}`
      },
      body: JSON.stringify({
        client: "greencrowd",
        description: "GreenCrowd auto-provisioned API key"
      })
    })
  } catch (err: unknown) {
    const code = (err as { cause?: { code?: string } })?.cause?.code
    if (code === "ECONNREFUSED") {
      throw new Error(
        `Cannot reach GAME engine at ${gameBaseUrl}\n` +
          `  → Make sure the game container is running: make infra-up`
      )
    }
    if (code === "ECONNRESET") {
      throw new Error(
        `GAME engine at ${gameBaseUrl} reset the connection.\n` +
          `  → GAME crashed while processing the request (likely wrong Keycloak config).\n` +
          `  → Restart containers with the updated docker-compose:\n` +
          `      docker compose -f docker-compose.dev.yml down\n` +
          `      docker volume rm greencrowd_game_postgres_dev_data\n` +
          `      make infra-up`
      )
    }
    throw err
  }
  if (!res.ok) {
    const txt = await res.text().catch(() => "")
    throw new Error(`GAME /apikey/create failed (${res.status}): ${txt}`)
  }
  const data = (await res.json()) as { apiKey: string }
  if (!data.apiKey) throw new Error("GAME response did not contain apiKey")
  return data.apiKey
}

async function validateGameApiKey(
  gameBaseUrl: string,
  apiKey: string
): Promise<boolean> {
  try {
    const res = await kfetch(`${gameBaseUrl}/games?limit=1`, {
      method: "GET",
      headers: {
        "X-API-Key": apiKey,
      },
    })

    if (res.ok) return true
    if (res.status === 401 || res.status === 403) return false
    return false
  } catch {
    return false
  }
}

// ─── .env.local updater ───────────────────────────────────────────────────────

function writeApiKeyToEnvLocal(apiKey: string): void {
  fs.mkdirSync(path.dirname(ENV_FILE), { recursive: true })
  let content = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, "utf8") : ""
  if (/^API_GAME_APIKEY=.*/m.test(content)) {
    content = content.replace(
      /^API_GAME_APIKEY=.*$/m,
      `API_GAME_APIKEY=${apiKey}`
    )
  } else {
    content += `\nAPI_GAME_APIKEY=${apiKey}\n`
  }
  fs.writeFileSync(ENV_FILE, content, "utf8")
  console.log(`✅  API_GAME_APIKEY written to ${ENV_FILE}`)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const env = loadEnvFile(ENV_FILE)

  const currentKey = process.env.API_GAME_APIKEY ?? env["API_GAME_APIKEY"] ?? ""
  const issuer = getVar(env, "KEYCLOAK_ISSUER")
  const adminUser = getVar(env, "KEYCLOAK_ADMIN")
  const adminPass = getVar(env, "KEYCLOAK_ADMIN_PASSWORD")
  const clientId = getVar(env, "GAME_KEYCLOAK_CLIENT_ID")
  const clientSecret = getVar(env, "GAME_KEYCLOAK_CLIENT_SECRET")
  const issuerBase = issuer.replace(/\/$/, "")
  const gameBaseUrl = getVar(env, "API_GAME_BASE_URL").replace(/\/$/, "")

  if (currentKey && currentKey !== PLACEHOLDER) {
    console.log("🔎  Validating existing API_GAME_APIKEY...")
    const isValid = await validateGameApiKey(gameBaseUrl, currentKey)
    if (isValid) {
      console.log(
        "✅  API_GAME_APIKEY is already configured and valid — skipping provisioning"
      )
      return
    }
    console.log("⚠️  Existing API_GAME_APIKEY is invalid — reprovisioning...")
  } else {
    console.log("🔑  API_GAME_APIKEY is not set — provisioning...")
  }

  console.log("\n[1/4] Waiting for Keycloak and GAME...")
  await waitForEndpoint(
    "Keycloak",
    `${issuerBase}/.well-known/openid-configuration`
  )
  await waitForEndpoint("GAME API", `${gameBaseUrl}/kpi/health_check`)

  // ── 1. Provision Keycloak ──────────────────────────────────────────────────
  console.log("\n[2/4] Provisioning Keycloak...")
  await provisionKeycloak({
    issuer,
    adminUser,
    adminPass,
    clientId,
    clientSecret
  })

  // ── 2. Get client_credentials token ───────────────────────────────────────
  console.log("\n[3/4] Obtaining client_credentials token...")
  const token = await getKeycloakToken(issuer, clientId, clientSecret)
  console.log("   Token obtained ✓")

  // ── 3. Create GAME API key ─────────────────────────────────────────────────
  console.log(`\n[4/4] Creating GAME API key at ${gameBaseUrl}...`)
  const apiKey = await createGameApiKey(gameBaseUrl, token)
  console.log(`   API key received: ${apiKey.slice(0, 8)}...`)

  writeApiKeyToEnvLocal(apiKey)
  console.log("\n🎮  Done — GAME API key provisioned successfully")
}

main().catch((err: unknown) => {
  console.error("\n❌  Provisioning failed:", err)
  process.exit(1)
})
