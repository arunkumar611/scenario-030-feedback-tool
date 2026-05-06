import { z } from "zod";

/**
 * Validation schemas for API inputs using Zod.
 */

// Survey response submission (from widget or API)
export const submitResponseSchema = z.object({
  survey_id: z.string().uuid(),
  respondent_email: z.string().email().optional().nullable(),
  answers: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])),
  metadata: z
    .object({
      user_agent: z.string().optional(),
      referrer: z.string().optional(),
      page_url: z.string().optional(),
      ip_address: z.string().optional(),
    })
    .optional(),
  consent: z.boolean().optional(),
});

export type SubmitResponseInput = z.infer<typeof submitResponseSchema>;

// Survey creation/update
export const surveyQuestionSchema = z.object({
  id: z.string(),
  type: z.enum(["multiple_choice", "rating", "nps", "open_text", "yes_no", "dropdown"]),
  text: z.string().min(1).max(500),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  conditional: z
    .object({
      question_id: z.string(),
      operator: z.enum(["equals", "not_equals", "contains"]),
      value: z.string(),
    })
    .optional(),
});

export const createSurveySchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  questions: z.array(surveyQuestionSchema).min(1).max(50),
  settings: z
    .object({
      anonymous: z.boolean().default(false),
      close_date: z.string().nullable().default(null),
      response_limit: z.number().nullable().default(null),
      theme: z
        .object({
          primary_color: z.string().default("#2563eb"),
          font_family: z.string().default("Inter"),
        })
        .default({ primary_color: "#2563eb", font_family: "Inter" }),
      notifications: z
        .object({
          email_on_response: z.boolean().default(false),
          slack_on_response: z.boolean().default(false),
        })
        .default({ email_on_response: false, slack_on_response: false }),
    })
    .default({
      anonymous: false,
      close_date: null,
      response_limit: null,
      theme: { primary_color: "#2563eb", font_family: "Inter" },
      notifications: { email_on_response: false, slack_on_response: false },
    }),
});

export type CreateSurveyInput = z.infer<typeof createSurveySchema>;

// Webhook configuration
export const createWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(
    z.enum(["response.created", "survey.completed", "nps.score_changed", "survey.closed"])
  ).min(1),
});

export type CreateWebhookInput = z.infer<typeof createWebhookSchema>;

// Export request
export const createExportSchema = z.object({
  type: z.enum(["csv", "json"]),
  survey_id: z.string().uuid().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
});

export type CreateExportInput = z.infer<typeof createExportSchema>;

// GDPR deletion request
export const gdprDeletionSchema = z.object({
  respondent_email: z.string().email(),
  reason: z.string().optional(),
});

export type GdprDeletionInput = z.infer<typeof gdprDeletionSchema>;
