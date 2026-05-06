/**
 * Background job: Deliver webhook payloads to customer-configured endpoints.
 *
 * Features:
 * - HMAC-SHA256 payload signing
 * - Exponential backoff retry (up to 5 attempts)
 * - Delivery logging for debugging
 *
 * Designed to run on Trigger.dev v3.
 */

import { deliverWebhook, buildWebhookPayload } from "@/lib/webhooks";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { WebhookEventType, Json } from "@/types/database";

export interface DeliverWebhookPayload {
  companyId: string;
  eventType: WebhookEventType;
  data: Json;
}

export async function runWebhookDelivery(payload: DeliverWebhookPayload) {
  const { companyId, eventType, data } = payload;
  const supabase = createSupabaseAdminClient();

  // Find all active webhooks for this company that subscribe to this event type
  const { data: webhooks, error: fetchError } = await supabase
    .from("webhooks")
    .select("*")
    .eq("company_id", companyId)
    .eq("active", true);

  if (fetchError) {
    console.error("Failed to fetch webhooks:", fetchError);
    throw fetchError;
  }

  if (!webhooks || webhooks.length === 0) {
    return { delivered: 0, message: "No active webhooks found" };
  }

  const results = [];

  for (const webhook of webhooks) {
    // Check if this webhook subscribes to the event type
    const events = webhook.events as string[];
    if (!events.includes(eventType)) {
      continue;
    }

    const webhookPayload = buildWebhookPayload(eventType, data);
    const payloadString = JSON.stringify(webhookPayload);

    // Create a delivery log record
    const { data: delivery } = await supabase
      .from("webhook_deliveries")
      .insert({
        webhook_id: webhook.id,
        event_type: eventType,
        payload: webhookPayload as unknown as Json,
        status: "pending",
      })
      .select("id")
      .single();

    // Attempt delivery with retries
    const result = await deliverWebhook({
      url: webhook.url,
      payload: payloadString,
      secret: webhook.secret,
    });

    // Update delivery record
    if (delivery) {
      await supabase
        .from("webhook_deliveries")
        .update({
          status: result.success ? "delivered" : "failed",
          attempts: result.attempts,
          last_attempt_at: new Date().toISOString(),
          response_code: result.statusCode,
        })
        .eq("id", delivery.id);
    }

    results.push({
      webhookId: webhook.id,
      url: webhook.url,
      success: result.success,
      attempts: result.attempts,
      statusCode: result.statusCode,
    });
  }

  return {
    delivered: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  };
}
