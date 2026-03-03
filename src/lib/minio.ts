// GreenCrowd V2 — MinIO client
import { Client as MinioClient } from "minio"

export const minio = new MinioClient({
  endPoint: process.env.MINIO_ENDPOINT!,
  port: parseInt(process.env.MINIO_PORT ?? "9000", 10),
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ACCESS_KEY!,
  secretKey: process.env.MINIO_SECRET_KEY!,
})

const BUCKET = process.env.MINIO_BUCKET ?? "greencrowd-attachments"

/**
 * Uploads a file to MinIO and returns the storage key.
 * Key format: contributions/<contributionId>/<uuid>.<ext>
 */
export async function uploadAttachment(
  contributionId: string,
  filename: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  const ext = filename.split(".").pop() ?? "bin"
  const key = `contributions/${contributionId}/${crypto.randomUUID()}.${ext}`

  await minio.putObject(BUCKET, key, buffer, buffer.length, {
    "Content-Type": mimeType,
  })

  return key
}

/**
 * Generates a pre-signed URL for temporary access to an attachment.
 * Default TTL: 1 hour.
 */
export async function getSignedUrl(
  storageKey: string,
  ttlSeconds = 3600
): Promise<string> {
  return minio.presignedGetObject(BUCKET, storageKey, ttlSeconds)
}

/**
 * Deletes an object from MinIO.
 */
export async function deleteAttachment(storageKey: string): Promise<void> {
  await minio.removeObject(BUCKET, storageKey)
}

/**
 * Ensures the bucket exists; creates it if not.
 */
export async function ensureBucketExists(): Promise<void> {
  const exists = await minio.bucketExists(BUCKET)
  if (!exists) {
    await minio.makeBucket(BUCKET, process.env.MINIO_REGION ?? "us-east-1")
  }
}
