/**
 * Background job: Analyze sentiment of survey response text using OpenAI GPT-4o-mini.
 *
 * This job is triggered when a new survey response is submitted that contains
 * open-text answers. It calls the OpenAI API and updates the response record
 * with the sentiment analysis results.
 *
 * Designed to run on Trigger.dev v3.
 */

import { analyzeSentiment } from "@/lib/openai";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export interface AnalyzeSentimentPayload {
  responseId: string;
  textContent: string;
}

export async function runSentimentAnalysis(payload: AnalyzeSentimentPayload) {
  const { responseId, textContent } = payload;

  if (!textContent || textContent.trim().length === 0) {
    console.log(`No text content for response ${responseId}, skipping sentiment analysis`);
    return { skipped: true };
  }

  // Run sentiment analysis
  const result = await analyzeSentiment(textContent);

  // Update the response record with sentiment results
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("responses")
    .update({
      sentiment_score: result.score,
      sentiment_label: result.label,
      metadata: {
        sentiment_themes: result.themes,
        sentiment_category: result.category,
      },
    })
    .eq("id", responseId);

  if (error) {
    console.error(`Failed to update sentiment for response ${responseId}:`, error);
    throw error;
  }

  return {
    responseId,
    sentiment: result,
  };
}
