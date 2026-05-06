import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface SentimentResult {
  label: "positive" | "negative" | "neutral";
  score: number; // confidence 0-1
  themes: string[];
  category: "praise" | "bug_report" | "feature_request" | "complaint" | "neutral" | "other";
}

/**
 * Analyze sentiment of a survey response text using GPT-4o-mini.
 * Returns structured sentiment data including label, confidence, themes, and category.
 */
export async function analyzeSentiment(text: string): Promise<SentimentResult> {
  if (!text || text.trim().length === 0) {
    return {
      label: "neutral",
      score: 1.0,
      themes: [],
      category: "neutral",
    };
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a sentiment analysis system for survey responses. Analyze the given text and return a JSON object with:
- "label": one of "positive", "negative", or "neutral"
- "score": confidence score from 0.0 to 1.0
- "themes": array of 1-3 key themes/topics mentioned (e.g., ["customer support", "pricing"])
- "category": one of "praise", "bug_report", "feature_request", "complaint", "neutral", "other"

Be accurate with short, terse survey responses. Consider context and nuance.`,
      },
      {
        role: "user",
        content: text,
      },
    ],
    temperature: 0.1,
    max_tokens: 150,
  });

  try {
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No content in response");
    }
    const result = JSON.parse(content) as SentimentResult;
    return {
      label: result.label || "neutral",
      score: typeof result.score === "number" ? result.score : 0.5,
      themes: Array.isArray(result.themes) ? result.themes : [],
      category: result.category || "other",
    };
  } catch {
    return {
      label: "neutral",
      score: 0.5,
      themes: [],
      category: "other",
    };
  }
}

export default openai;
