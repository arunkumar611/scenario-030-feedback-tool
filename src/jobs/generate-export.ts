/**
 * Background job: Generate CSV or JSON data exports.
 *
 * This job queries the database for matching responses, generates the export file,
 * uploads it to Supabase Storage, and sends a notification email with the download link.
 *
 * Designed to run on Trigger.dev v3.
 */

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { sendExportReady } from "@/lib/resend";

export interface GenerateExportPayload {
  exportId: string;
}

export async function runGenerateExport(payload: GenerateExportPayload) {
  const { exportId } = payload;
  const supabase = createSupabaseAdminClient();

  // Fetch the export record
  const { data: exportRecord, error: fetchError } = await supabase
    .from("exports")
    .select("*")
    .eq("id", exportId)
    .single();

  if (fetchError || !exportRecord) {
    throw new Error(`Export record not found: ${exportId}`);
  }

  // Update status to processing
  await supabase
    .from("exports")
    .update({ status: "processing" })
    .eq("id", exportId);

  try {
    // Build the query based on filters
    const filters = exportRecord.filters as Record<string, string>;
    let query = supabase
      .from("responses")
      .select("id, survey_id, respondent_email, answers, sentiment_score, sentiment_label, created_at")
      .eq("company_id", exportRecord.company_id)
      .order("created_at", { ascending: false });

    if (filters?.survey_id) {
      query = query.eq("survey_id", filters.survey_id);
    }
    if (filters?.date_from) {
      query = query.gte("created_at", filters.date_from);
    }
    if (filters?.date_to) {
      query = query.lte("created_at", filters.date_to);
    }

    const { data: responses, error: queryError } = await query;

    if (queryError) {
      throw queryError;
    }

    // Generate the file content
    let fileContent: string;
    let contentType: string;
    let extension: string;

    if (exportRecord.type === "json") {
      fileContent = JSON.stringify(responses, null, 2);
      contentType = "application/json";
      extension = "json";
    } else {
      // CSV generation
      if (!responses || responses.length === 0) {
        fileContent = "No responses found";
      } else {
        const headers = ["id", "survey_id", "respondent_email", "sentiment_score", "sentiment_label", "created_at", "answers"];
        const rows = responses.map((r) => [
          r.id,
          r.survey_id,
          r.respondent_email || "",
          r.sentiment_score?.toString() || "",
          r.sentiment_label || "",
          r.created_at,
          JSON.stringify(r.answers),
        ]);
        fileContent = [
          headers.join(","),
          ...rows.map((row) =>
            row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
          ),
        ].join("\n");
      }
      contentType = "text/csv";
      extension = "csv";
    }

    // Upload to Supabase Storage
    const fileName = `exports/${exportRecord.company_id}/${exportId}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("exports")
      .upload(fileName, fileContent, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    // Generate a signed URL (valid for 24 hours)
    const { data: signedUrl } = await supabase.storage
      .from("exports")
      .createSignedUrl(fileName, 86400); // 24 hours

    const expiresAt = new Date(Date.now() + 86400 * 1000).toISOString();

    // Update the export record
    await supabase
      .from("exports")
      .update({
        status: "completed",
        file_url: signedUrl?.signedUrl || null,
        expires_at: expiresAt,
      })
      .eq("id", exportId);

    // Send notification email
    const { data: creator } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", exportRecord.created_by)
      .single();

    if (creator?.email && signedUrl?.signedUrl) {
      await sendExportReady({
        to: creator.email,
        exportType: exportRecord.type,
        downloadUrl: signedUrl.signedUrl,
        expiresAt: new Date(expiresAt).toLocaleDateString(),
      });
    }

    return {
      exportId,
      status: "completed",
      rowCount: responses?.length || 0,
      fileUrl: signedUrl?.signedUrl,
    };
  } catch (error) {
    // Mark export as failed
    await supabase
      .from("exports")
      .update({ status: "failed" })
      .eq("id", exportId);

    throw error;
  }
}
