import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { createSurveySchema } from "@/lib/validation";

/**
 * GET /api/surveys
 * List surveys for the authenticated user's company.
 */
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's company
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const { data: surveys, error } = await supabase
      .from("surveys")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Failed to fetch surveys" }, { status: 500 });
    }

    return NextResponse.json({ surveys });
  } catch (error) {
    console.error("Survey list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/surveys
 * Create a new survey.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id, role")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (profile.role === "viewer") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createSurveySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data: survey, error } = await supabase
      .from("surveys")
      .insert({
        company_id: profile.company_id,
        title: parsed.data.title,
        description: parsed.data.description,
        questions: parsed.data.questions,
        settings: parsed.data.settings,
        status: "draft",
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Survey creation error:", error);
      return NextResponse.json({ error: "Failed to create survey" }, { status: 500 });
    }

    return NextResponse.json({ survey }, { status: 201 });
  } catch (error) {
    console.error("Survey creation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
