/**
 * Database types matching the Supabase schema.
 * These types define the shape of all tables used in the application.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          name: string;
          slug: string;
          settings: Json;
          plan: "free" | "pro" | "enterprise";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          settings?: Json;
          plan?: "free" | "pro" | "enterprise";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          settings?: Json;
          plan?: "free" | "pro" | "enterprise";
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          company_id: string;
          email: string;
          full_name: string | null;
          role: "admin" | "member" | "viewer";
          preferences: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          company_id: string;
          email: string;
          full_name?: string | null;
          role?: "admin" | "member" | "viewer";
          preferences?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          company_id?: string;
          email?: string;
          full_name?: string | null;
          role?: "admin" | "member" | "viewer";
          preferences?: Json;
          updated_at?: string;
        };
      };
      surveys: {
        Row: {
          id: string;
          company_id: string;
          title: string;
          description: string | null;
          questions: SurveyQuestion[];
          settings: SurveySettings;
          status: "draft" | "active" | "closed";
          response_count: number;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          title: string;
          description?: string | null;
          questions?: SurveyQuestion[];
          settings?: SurveySettings;
          status?: "draft" | "active" | "closed";
          response_count?: number;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          questions?: SurveyQuestion[];
          settings?: SurveySettings;
          status?: "draft" | "active" | "closed";
          response_count?: number;
          updated_at?: string;
        };
      };
      responses: {
        Row: {
          id: string;
          survey_id: string;
          company_id: string;
          respondent_email: string | null;
          answers: Json;
          sentiment_score: number | null;
          sentiment_label: "positive" | "negative" | "neutral" | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          survey_id: string;
          company_id: string;
          respondent_email?: string | null;
          answers: Json;
          sentiment_score?: number | null;
          sentiment_label?: "positive" | "negative" | "neutral" | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          sentiment_score?: number | null;
          sentiment_label?: "positive" | "negative" | "neutral" | null;
          metadata?: Json;
        };
      };
      nps_scores: {
        Row: {
          id: string;
          company_id: string;
          survey_id: string;
          score: number;
          respondent_email: string | null;
          comment: string | null;
          sentiment_label: "positive" | "negative" | "neutral" | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          survey_id: string;
          score: number;
          respondent_email?: string | null;
          comment?: string | null;
          sentiment_label?: "positive" | "negative" | "neutral" | null;
          created_at?: string;
        };
        Update: {
          sentiment_label?: "positive" | "negative" | "neutral" | null;
        };
      };
      webhooks: {
        Row: {
          id: string;
          company_id: string;
          url: string;
          events: string[];
          secret: string;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          url: string;
          events: string[];
          secret: string;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          url?: string;
          events?: string[];
          secret?: string;
          active?: boolean;
          updated_at?: string;
        };
      };
      webhook_deliveries: {
        Row: {
          id: string;
          webhook_id: string;
          event_type: string;
          payload: Json;
          status: "pending" | "delivered" | "failed";
          attempts: number;
          last_attempt_at: string | null;
          response_code: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          webhook_id: string;
          event_type: string;
          payload: Json;
          status?: "pending" | "delivered" | "failed";
          attempts?: number;
          last_attempt_at?: string | null;
          response_code?: number | null;
          created_at?: string;
        };
        Update: {
          status?: "pending" | "delivered" | "failed";
          attempts?: number;
          last_attempt_at?: string | null;
          response_code?: number | null;
        };
      };
      exports: {
        Row: {
          id: string;
          company_id: string;
          type: "csv" | "json";
          status: "pending" | "processing" | "completed" | "failed";
          file_url: string | null;
          expires_at: string | null;
          filters: Json;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          type: "csv" | "json";
          status?: "pending" | "processing" | "completed" | "failed";
          file_url?: string | null;
          expires_at?: string | null;
          filters?: Json;
          created_by: string;
          created_at?: string;
        };
        Update: {
          status?: "pending" | "processing" | "completed" | "failed";
          file_url?: string | null;
          expires_at?: string | null;
        };
      };
      consent_records: {
        Row: {
          id: string;
          respondent_email: string;
          company_id: string;
          consent_type: string;
          granted: boolean;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          respondent_email: string;
          company_id: string;
          consent_type: string;
          granted: boolean;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          granted?: boolean;
        };
      };
    };
  };
}

// Survey question types
export type QuestionType =
  | "multiple_choice"
  | "rating"
  | "nps"
  | "open_text"
  | "yes_no"
  | "dropdown";

export interface SurveyQuestion {
  id: string;
  type: QuestionType;
  text: string;
  required: boolean;
  options?: string[];
  min?: number;
  max?: number;
  conditional?: {
    question_id: string;
    operator: "equals" | "not_equals" | "contains";
    value: string;
  };
}

export interface SurveySettings {
  anonymous: boolean;
  close_date: string | null;
  response_limit: number | null;
  theme: {
    primary_color: string;
    font_family: string;
  };
  notifications: {
    email_on_response: boolean;
    slack_on_response: boolean;
  };
}

// Webhook event types
export type WebhookEventType =
  | "response.created"
  | "survey.completed"
  | "nps.score_changed"
  | "survey.closed";
