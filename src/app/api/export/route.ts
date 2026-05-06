import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createExportSchema } from "@/lib/validation";

/**
 * POST /api/export
 * Request a data export (CSV or JSON). The export is generated asynchronously.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = createExportSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Create an export record
    const { data: exportRecord, error } = await supabase
      .from("exports")
      .insert({
        company_id: profile.company_id,
        type: parsed.data.type,
        status: "pending",
        filters: {
          survey_id: parsed.data.survey_id,
          date_from: parsed.data.date_from,
          date_to: parsed.data.date_to,
        },
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to create export" }, { status: 500 });
    }

    // TODO: Trigger background job via Trigger.dev to generate the export
    // await triggerExportJob(exportRecord.id);

    return NextResponse.json(
      {
        export: exportRecord,
        message: "Export started. You will be notified when it is ready.",
      },
      { status: 202 }
    );
  } catch (error) {
    console.error("Export creation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/export
 * List exports for the authenticated user's company.
 */
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const { data: exports, error } = await supabase
      .from("exports")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ error: "Failed to fetch exports" }, { status: 500 });
    }

    return NextResponse.json({ exports });
  } catch (error) {
    console.error("Export list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
