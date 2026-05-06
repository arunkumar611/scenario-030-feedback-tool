import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "feedback@example.com";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

/**
 * Send a transactional email via Resend.
 */
export async function sendEmail(options: SendEmailOptions) {
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
    replyTo: options.replyTo,
  });

  if (error) {
    console.error("Failed to send email:", error);
    throw new Error(`Email send failed: ${error.message}`);
  }

  return data;
}

/**
 * Send a survey invitation email.
 */
export async function sendSurveyInvitation(params: {
  to: string;
  surveyTitle: string;
  surveyUrl: string;
  companyName: string;
}) {
  return sendEmail({
    to: params.to,
    subject: `You're invited to take a survey: ${params.surveyTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>${params.companyName} would like your feedback</h2>
        <p>You've been invited to participate in a survey: <strong>${params.surveyTitle}</strong></p>
        <a href="${params.surveyUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 16px 0;">
          Take the Survey
        </a>
        <p style="color: #6b7280; font-size: 14px;">
          If you don't want to receive these emails, you can
          <a href="${params.surveyUrl}?unsubscribe=true">unsubscribe here</a>.
        </p>
      </div>
    `,
  });
}

/**
 * Send an export completion notification email.
 */
export async function sendExportReady(params: {
  to: string;
  exportType: string;
  downloadUrl: string;
  expiresAt: string;
}) {
  return sendEmail({
    to: params.to,
    subject: "Your data export is ready",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Your ${params.exportType.toUpperCase()} export is ready</h2>
        <p>Your data export has been generated and is ready for download.</p>
        <a href="${params.downloadUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 16px 0;">
          Download Export
        </a>
        <p style="color: #6b7280; font-size: 14px;">
          This download link expires on ${params.expiresAt}.
        </p>
      </div>
    `,
  });
}

export default resend;
