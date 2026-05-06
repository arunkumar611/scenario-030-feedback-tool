import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * GET /api/surveys/[id]
 * Get a single survey. Public access for active surveys (widget needs this).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Use admin client so the widget can fetch survey definitions without auth
    const supabase = createSupabaseAdminClient();

    const { data: survey, error } = await supabase
      .from("surveys")
      .select("id, title, description, questions, settings, status")
      .eq("id", id)
      .single();

    if (error || !survey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    // Only return active surveys publicly
    if (survey.status !== "active") {
      // Check if the request has auth (dashboard user editing a draft)
      const authSupabase = await createSupabaseServerClient();
      const { data: { user } } = await authSupabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: "Survey not found" }, { status: 404 });
      }
    }

    return NextResponse.json({ survey });
  } catch (error) {
    console.error("Survey fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/surveys/[id]
 * Update a survey (requires authentication).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const { data: survey, error } = await supabase
      .from("surveys")
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to update survey" }, { status: 500 });
    }

    return NextResponse.json({ survey });
  } catch (error) {
    console.error("Survey update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/surveys/[id]
 * Delete a survey (requires authentication, admin role).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Only admins can delete surveys" }, { status: 403 });
    }

    const { error } = await supabase
      .from("surveys")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: "Failed to delete survey" }, { status: 500 });
    }

    return NextResponse.json({ message: "Survey deleted" });
  } catch (error) {
    console.error("Survey delete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
