import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { submitResponseSchema } from "@/lib/validation";

/**
 * POST /api/responses
 * Public endpoint for collecting survey responses from the embeddable widget.
 * CORS is configured in next.config.ts to allow all origins.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const parsed = submitResponseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { survey_id, respondent_email, answers, metadata, consent } = parsed.data;

    // Use admin client to bypass RLS (public submissions do not have auth)
    const supabase = createSupabaseAdminClient();

    // Fetch the survey to verify it exists and is active
    const { data: survey, error: surveyError } = await supabase
      .from("surveys")
      .select("id, company_id, status, settings")
      .eq("id", survey_id)
      .single();

    if (surveyError || !survey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    if (survey.status !== "active") {
      return NextResponse.json(
        { error: "Survey is not accepting responses" },
        { status: 403 }
      );
    }

    // Check response limit
    const settings = survey.settings as Record<string, unknown>;
    if (settings?.response_limit) {
      const { count } = await supabase
        .from("responses")
        .select("*", { count: "exact", head: true })
        .eq("survey_id", survey_id);

      if (count && count >= (settings.response_limit as number)) {
        return NextResponse.json(
          { error: "Survey has reached its response limit" },
          { status: 403 }
        );
      }
    }

    // Record consent if provided
    if (consent && respondent_email) {
      await supabase.from("consent_records").insert({
        respondent_email,
        company_id: survey.company_id,
        consent_type: "survey_response",
        granted: true,
        ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
        user_agent: request.headers.get("user-agent"),
      });
    }

    // Insert the response
    const { data: responseData, error: insertError } = await supabase
      .from("responses")
      .insert({
        survey_id,
        company_id: survey.company_id,
        respondent_email: respondent_email || null,
        answers,
        metadata: {
          ...metadata,
          ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
          user_agent: request.headers.get("user-agent"),
        },
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Failed to insert response:", insertError);
      return NextResponse.json(
        { error: "Failed to save response" },
        { status: 500 }
      );
    }

    // Increment response count on the survey
    await supabase.rpc("increment_response_count", { survey_id });

    // TODO: Trigger background jobs via Trigger.dev:
    // 1. Sentiment analysis on open-text answers
    // 2. Webhook delivery to configured endpoints
    // 3. NPS score calculation (if applicable)
    // 4. Analytics cache invalidation

    return NextResponse.json(
      {
        id: responseData.id,
        message: "Response recorded successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Response submission error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS handler for CORS preflight requests.
 * Next.js auto-handles this if we export OPTIONS, but we define it
 * explicitly for clarity.
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Survey-Id",
      "Access-Control-Max-Age": "86400",
    },
  });
}
