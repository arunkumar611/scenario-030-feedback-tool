import CryptoJS from "crypto-js";
import type { WebhookEventType, Json } from "@/types/database";

/**
 * Generate an HMAC-SHA256 signature for a webhook payload.
 */
export function signWebhookPayload(payload: string, secret: string): string {
  return CryptoJS.HmacSHA256(payload, secret).toString(CryptoJS.enc.Hex);
}

/**
 * Verify an HMAC-SHA256 signature for a webhook payload.
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = signWebhookPayload(payload, secret);
  return expected === signature;
}

/**
 * Build a webhook event payload.
 */
export function buildWebhookPayload(
  eventType: WebhookEventType,
  data: Json
): {
  event: WebhookEventType;
  data: Json;
  timestamp: string;
  id: string;
} {
  return {
    event: eventType,
    data,
    timestamp: new Date().toISOString(),
    id: crypto.randomUUID(),
  };
}

/**
 * Deliver a webhook with retry logic.
 * Retries up to maxRetries times with exponential backoff.
 */
export async function deliverWebhook(params: {
  url: string;
  payload: string;
  secret: string;
  maxRetries?: number;
}): Promise<{ success: boolean; statusCode: number | null; attempts: number }> {
  const maxRetries = params.maxRetries ?? 5;
  let attempts = 0;
  let lastStatusCode: number | null = null;

  for (let i = 0; i <= maxRetries; i++) {
    attempts++;
    try {
      const signature = signWebhookPayload(params.payload, params.secret);
      const response = await fetch(params.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
          "X-Webhook-Timestamp": new Date().toISOString(),
        },
        body: params.payload,
        signal: AbortSignal.timeout(10000), // 10s timeout
      });

      lastStatusCode = response.status;

      if (response.ok) {
        return { success: true, statusCode: response.status, attempts };
      }

      // Do not retry 4xx errors (except 429)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        return { success: false, statusCode: response.status, attempts };
      }
    } catch (error) {
      console.error(`Webhook delivery attempt ${attempts} failed:`, error);
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    if (i < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }

  return { success: false, statusCode: lastStatusCode, attempts };
}
