const Minio = require("minio")
import getDecodedToken from "@/utils/getDecodedToken"
import multer from "multer"
import cookie from "cookie"
import sharp from "sharp"
import refreshAccessToken from "@/utils/refreshAccessToken"
import setAuthCookies from "@/utils/setAuthCookies"

const KcAdminClient = require("keycloak-admin").default

const kcAdminClient = new KcAdminClient({
  baseUrl: process.env.KEYCLOAK_BASE_URL,
  realmName: process.env.KEYCLOAK_REALM
})

const storage = multer.memoryStorage()
const upload = multer({ storage: storage })
const singleUpload = upload.single("file")

export const config = {
  api: {
    bodyParser: false
  }
}

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || "localhost",
  port: parseInt(process.env.MINIO_PORT) || 9000,
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
  secretKey: process.env.MINIO_SECRET_KEY || "minioadmin"
})

const updatePhoto = async (userId, ext, file) => {
  const bucketName = process.env.MINIO_BUCKET_NAME || "users"
  const date = new Date()
  const photoName = `${date.getTime()}.${ext}`
  const fileKey = `${userId}/${photoName}`

  try {
    const processedFile = await sharp(file).toBuffer()
    await minioClient.putObject(bucketName, fileKey, processedFile, {
      "Content-Type": `image/${ext}`,
      "x-amz-acl": "public-read"
    })
    return { success: true, fileKey }
  } catch (error) {
    console.error("Error uploading file to MinIO:", error)
    return { success: false, error }
  }
}

async function updatePhotoKeycloak(userId, photoUrl) {
  try {
    await kcAdminClient.auth({
      clientId: process.env.KEYCLOAK_ADMIN_CLIENT_ID,
      clientSecret: process.env.KEYCLOAK_ADMIN_CLIENT_SECRET,
      grantType: "client_credentials"
    })

    const user = await kcAdminClient.users.findOne({ id: userId })
    const updatedAttributes = {
      ...user.attributes,
      picture: [photoUrl],
      pictureKeycloak: [photoUrl]
    }

    await kcAdminClient.users.update(
      { id: userId },
      { attributes: updatedAttributes }
    )

    return { success: true }
  } catch (error) {
    return { success: false, error }
  }
}

export default async function handler(req, res) {
  if (req.method !== "PUT") {
    res.setHeader("Allow", ["PUT"])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  singleUpload(req, res, async function (err) {
    if (err) {
      return res.status(500).json({ error: "File upload failed" })
    }

    const cookies = cookie.parse(req.headers.cookie || "")
    const token =
      req.headers.authorization?.split(" ")[1] || cookies.access_token
    const refreshToken = req.headers.refresh_token || cookies.refresh_token

    if (!token) {
      return res.status(401).json({ error: "Missing token" })
    }

    const decodedToken = getDecodedToken(token)
    if (!decodedToken) {
      return res.status(401).json({ error: "Invalid token" })
    }

    const userID = decodedToken.sub
    const photoFile = req.file?.buffer
    const photoName = req.file?.originalname

    if (!photoFile || !photoName) {
      return res.status(400).json({ error: "Invalid photo data" })
    }

    const ext = photoName.split(".").pop()?.toLowerCase()
    const acceptedExtensions = ["jpg", "jpeg", "png", "gif", "webp"]
    if (!ext || !acceptedExtensions.includes(ext)) {
      return res.status(400).json({ error: "Invalid photo extension" })
    }

    try {
      const uploadResponse = await updatePhoto(userID, ext, photoFile)

      if (!uploadResponse.success) {
        return res.status(500).json({ error: "Failed to upload photo" })
      }

      const protocol = process.env.MINIO_USE_SSL === "true" ? "https" : "http"
      const photoUrl = `${protocol}://${process.env.MINIO_ENDPOINT_PUBLIC}/${process.env.MINIO_BUCKET_NAME}/${uploadResponse.fileKey}`

      const keycloakResponse = await updatePhotoKeycloak(userID, photoUrl)
      if (!keycloakResponse.success) {
        return res
          .status(500)
          .json({ error: "Failed to update Keycloak attributes" })
      }

      // Refresh the token
      const tokenData = await refreshAccessToken(refreshToken)
      if (!tokenData) {
        return res.status(401).json({ error: "Failed to refresh token" })
      }

      const newTokenData = {
        access_token: {
          value: tokenData.access_token,
          maxAge: tokenData.expires_in
        },
        refresh_token: {
          value: tokenData.refresh_token,
          maxAge: tokenData.expires_in
        },
        id_token: {
          value: tokenData.id_token,
          maxAge: tokenData.expires_in
        }
      }
      setAuthCookies(res, newTokenData)

      return res.status(200).json({ success: true, url: photoUrl })
    } catch (error) {
      return res.status(500).json({ error: "Unexpected error during photo update" })
    }
  })
}
