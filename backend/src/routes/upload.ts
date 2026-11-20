import admin from "../firebase"
import { verifyToken } from "../services/auth"
import { pool } from "../db/connection"

export const uploadRoutes: Record<string, (req: Request) => Promise<Response>> = {
  "POST /upload": async (req: Request) => {
    const decoded = await verifyToken(req)
    if (!decoded) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File
    const woId = formData.get("woId") as string

    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      })
    }

    const maxSize = 8 * 1024 * 1024
    if (file.size > maxSize) {
      return new Response(JSON.stringify({ error: "File too large" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      })
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "video/mp4"]
    if (!allowedTypes.includes(file.type)) {
      return new Response(JSON.stringify({ error: "Invalid file type" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      })
    }

    const fileId = crypto.randomUUID()
    const ext = file.name.split(".").pop()
    const path = `uploads/${decoded.tenant_id}/${fileId}.${ext}`

    const buffer = Buffer.from(await file.arrayBuffer())
    const bucket = admin.storage().bucket()
    const fileRef = bucket.file(path)

    await fileRef.save(buffer, {
      metadata: { contentType: file.type }
    })

    const [url] = await fileRef.getSignedUrl({
      action: "read",
      expires: Date.now() + 1000 * 60 * 60 * 24 * 7
    })

    await pool.query(
      "INSERT INTO attachments (id, wo_id, url, mime_type, size_bytes) VALUES ($1, $2, $3, $4, $5)",
      [fileId, woId, url, file.type, file.size]
    )

    return new Response(
      JSON.stringify({ id: fileId, url, mime: file.type }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" }
      }
    )
  }
}
