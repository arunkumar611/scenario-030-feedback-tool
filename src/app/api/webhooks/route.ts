import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createWebhookSchema } from "@/lib/validation";
import { v4 as uuidv4 } from "uuid";

/**
 * GET /api/webhooks
 * List webhooks for the authenticated user's company.
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

    const { data: webhooks, error } = await supabase
      .from("webhooks")
      .select("id, url, events, active, created_at")
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Failed to fetch webhooks" }, { status: 500 });
    }

    return NextResponse.json({ webhooks });
  } catch (error) {
    console.error("Webhook list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/webhooks
 * Create a new webhook endpoint.
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

    if (!profile || profile.role === "viewer") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createWebhookSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Generate a signing secret for this webhook
    const secret = `whsec_${uuidv4().replace(/-/g, "")}`;

    const { data: webhook, error } = await supabase
      .from("webhooks")
      .insert({
        company_id: profile.company_id,
        url: parsed.data.url,
        events: parsed.data.events,
        secret,
        active: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to create webhook" }, { status: 500 });
    }

    return NextResponse.json({ webhook }, { status: 201 });
  } catch (error) {
    console.error("Webhook creation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
