-- Initial schema for the Customer Feedback and Survey Tool
-- This migration creates all core tables with Row Level Security

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Companies table
-- ============================================================
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}',
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- User profiles (extends Supabase auth.users)
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile and profiles in their company
CREATE POLICY "Users can view own company profiles"
  ON public.profiles FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  ));

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

-- ============================================================
-- Surveys table
-- ============================================================
CREATE TABLE public.surveys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  questions JSONB NOT NULL DEFAULT '[]',
  settings JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed')),
  response_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company surveys"
  ON public.surveys FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Members and admins can create surveys"
  ON public.surveys FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'member')
  ));

CREATE POLICY "Members and admins can update surveys"
  ON public.surveys FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'member')
  ));

CREATE POLICY "Admins can delete surveys"
  ON public.surveys FOR DELETE
  USING (company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- ============================================================
-- Survey responses table
-- ============================================================
CREATE TABLE public.responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  respondent_email TEXT,
  answers JSONB NOT NULL,
  sentiment_score REAL,
  sentiment_label TEXT CHECK (sentiment_label IN ('positive', 'negative', 'neutral')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company responses"
  ON public.responses FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  ));

-- Index for efficient analytics queries
CREATE INDEX idx_responses_survey_id ON public.responses(survey_id);
CREATE INDEX idx_responses_company_id ON public.responses(company_id);
CREATE INDEX idx_responses_created_at ON public.responses(created_at);
CREATE INDEX idx_responses_sentiment ON public.responses(company_id, sentiment_label);
CREATE INDEX idx_responses_respondent ON public.responses(respondent_email) WHERE respondent_email IS NOT NULL;

-- GIN index for JSONB answers querying
CREATE INDEX idx_responses_answers ON public.responses USING GIN(answers);

-- ============================================================
-- NPS Scores table
-- ============================================================
CREATE TABLE public.nps_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 10),
  respondent_email TEXT,
  comment TEXT,
  sentiment_label TEXT CHECK (sentiment_label IN ('positive', 'negative', 'neutral')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.nps_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company NPS scores"
  ON public.nps_scores FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE INDEX idx_nps_scores_company ON public.nps_scores(company_id, created_at);
CREATE INDEX idx_nps_scores_survey ON public.nps_scores(survey_id, created_at);

-- ============================================================
-- Webhooks table
-- ============================================================
CREATE TABLE public.webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events JSONB NOT NULL DEFAULT '[]',
  secret TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company webhooks"
  ON public.webhooks FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Members and admins can manage webhooks"
  ON public.webhooks FOR ALL
  USING (company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'member')
  ));

-- ============================================================
-- Webhook deliveries log
-- ============================================================
CREATE TABLE public.webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_id UUID NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  response_code INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company webhook deliveries"
  ON public.webhook_deliveries FOR SELECT
  USING (webhook_id IN (
    SELECT id FROM public.webhooks WHERE company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  ));

CREATE INDEX idx_webhook_deliveries_webhook ON public.webhook_deliveries(webhook_id, created_at);

-- ============================================================
-- Exports table
-- ============================================================
CREATE TABLE public.exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('csv', 'json')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  file_url TEXT,
  expires_at TIMESTAMPTZ,
  filters JSONB DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company exports"
  ON public.exports FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can create exports"
  ON public.exports FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  ));

-- ============================================================
-- Consent records (GDPR compliance)
-- ============================================================
CREATE TABLE public.consent_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  respondent_email TEXT NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL,
  granted BOOLEAN NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company consent records"
  ON public.consent_records FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE INDEX idx_consent_respondent ON public.consent_records(respondent_email, company_id);

-- ============================================================
-- Helper functions
-- ============================================================

-- Function to increment response count on a survey
CREATE OR REPLACE FUNCTION public.increment_response_count(survey_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.surveys
  SET response_count = response_count + 1,
      updated_at = NOW()
  WHERE id = survey_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate NPS score for a company
CREATE OR REPLACE FUNCTION public.calculate_nps(p_company_id UUID, p_survey_id UUID DEFAULT NULL)
RETURNS TABLE(
  total_responses BIGINT,
  promoters BIGINT,
  passives BIGINT,
  detractors BIGINT,
  nps_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) AS total_responses,
    COUNT(*) FILTER (WHERE score >= 9) AS promoters,
    COUNT(*) FILTER (WHERE score >= 7 AND score <= 8) AS passives,
    COUNT(*) FILTER (WHERE score <= 6) AS detractors,
    CASE
      WHEN COUNT(*) > 0 THEN
        ROUND(
          (COUNT(*) FILTER (WHERE score >= 9)::NUMERIC / COUNT(*)::NUMERIC * 100) -
          (COUNT(*) FILTER (WHERE score <= 6)::NUMERIC / COUNT(*)::NUMERIC * 100),
          1
        )
      ELSE 0
    END AS nps_score
  FROM public.nps_scores
  WHERE company_id = p_company_id
    AND (p_survey_id IS NULL OR survey_id = p_survey_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_company_id UUID;
BEGIN
  -- Create a default company for the new user
  INSERT INTO public.companies (name, slug)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'company_name', split_part(NEW.email, '@', 1) || '-workspace'),
    LOWER(REPLACE(COALESCE(NEW.raw_user_meta_data->>'company_name', split_part(NEW.email, '@', 1) || '-workspace'), ' ', '-')) || '-' || SUBSTRING(NEW.id::TEXT, 1, 8)
  )
  RETURNING id INTO new_company_id;

  -- Create the user's profile
  INSERT INTO public.profiles (id, company_id, email, full_name, role)
  VALUES (
    NEW.id,
    new_company_id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    'admin'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- RLS policy for companies: users can only see their own company
-- ============================================================
CREATE POLICY "Users can view own company"
  ON public.companies FOR SELECT
  USING (id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Admins can update own company"
  ON public.companies FOR UPDATE
  USING (id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));
