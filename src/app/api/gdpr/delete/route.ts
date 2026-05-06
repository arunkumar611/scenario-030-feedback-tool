import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { gdprDeletionSchema } from "@/lib/validation";

/**
 * POST /api/gdpr/delete
 * GDPR data deletion request. Deletes all response data for a specific respondent email.
 * Requires authentication (admin role).
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
      .select("company_id, role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can process GDPR deletion requests" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = gdprDeletionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const adminClient = createSupabaseAdminClient();
    const { respondent_email } = parsed.data;
    const deletedCounts: Record<string, number> = {};

    // Delete responses for this email within the company
    const { count: responsesDeleted } = await adminClient
      .from("responses")
      .delete({ count: "exact" })
      .eq("company_id", profile.company_id)
      .eq("respondent_email", respondent_email);
    deletedCounts.responses = responsesDeleted || 0;

    // Delete NPS scores for this email within the company
    const { count: npsDeleted } = await adminClient
      .from("nps_scores")
      .delete({ count: "exact" })
      .eq("company_id", profile.company_id)
      .eq("respondent_email", respondent_email);
    deletedCounts.nps_scores = npsDeleted || 0;

    // Delete consent records for this email within the company
    const { count: consentDeleted } = await adminClient
      .from("consent_records")
      .delete({ count: "exact" })
      .eq("company_id", profile.company_id)
      .eq("respondent_email", respondent_email);
    deletedCounts.consent_records = consentDeleted || 0;

    return NextResponse.json({
      message: "GDPR deletion completed",
      respondent_email,
      deleted: deletedCounts,
      processed_at: new Date().toISOString(),
      processed_by: user.id,
    });
  } catch (error) {
    console.error("GDPR deletion error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
