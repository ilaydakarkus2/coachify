import { timingSafeEqual } from "crypto"
import { NextRequest } from "next/server"

/**
 * Zapier webhook isteklerinde API key dogrulamasi yapar.
 * x-api-key header'ini process.env.ZAPIER_API_KEY ile karsilastirir.
 * timingSafeEqual kullanilarak timing attack onlenir.
 */
export function validateApiKey(
  request: NextRequest
): { valid: boolean; error?: string } {
  const apiKey = request.headers.get("x-api-key")
  const expectedKey = process.env.ZAPIER_API_KEY

  if (!expectedKey) {
    return { valid: false, error: "Webhook API key not configured" }
  }

  if (!apiKey) {
    return { valid: false, error: "Missing x-api-key header" }
  }

  const apiKeyBuf = Buffer.from(apiKey)
  const expectedBuf = Buffer.from(expectedKey)

  if (apiKeyBuf.length !== expectedBuf.length) {
    return { valid: false, error: "Invalid API key" }
  }

  if (!timingSafeEqual(apiKeyBuf, expectedBuf)) {
    return { valid: false, error: "Invalid API key" }
  }

  return { valid: true }
}
