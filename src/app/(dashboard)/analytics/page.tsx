"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface AnalyticsData {
  totalResponses: number;
  sentimentBreakdown: { positive: number; negative: number; neutral: number };
  responsesOverTime: { date: string; count: number }[];
  recentResponses: {
    id: string;
    survey_title: string;
    sentiment_label: string | null;
    created_at: string;
  }[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      const supabase = createSupabaseBrowserClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile) return;

      const companyId = (profile as { company_id: string }).company_id;

      // Fetch total response count
      const { count: totalResponses } = await supabase
        .from("responses")
        .select("*", { count: "exact", head: true })
        .eq("company_id", companyId);

      // Fetch sentiment breakdown
      const { data: sentimentData } = await supabase
        .from("responses")
        .select("sentiment_label")
        .eq("company_id", companyId)
        .not("sentiment_label", "is", null);

      const sentimentBreakdown = {
        positive: (sentimentData as { sentiment_label: string }[] | null)?.filter((r) => r.sentiment_label === "positive").length || 0,
        negative: (sentimentData as { sentiment_label: string }[] | null)?.filter((r) => r.sentiment_label === "negative").length || 0,
        neutral: (sentimentData as { sentiment_label: string }[] | null)?.filter((r) => r.sentiment_label === "neutral").length || 0,
      };

      // Fetch recent responses
      const { data: recentResponses } = await supabase
        .from("responses")
        .select("id, sentiment_label, created_at, survey_id")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(10);

      const typedResponses = (recentResponses || []) as { id: string; sentiment_label: string | null; created_at: string; survey_id: string }[];
      setData({
        totalResponses: totalResponses || 0,
        sentimentBreakdown,
        responsesOverTime: [],
        recentResponses: typedResponses.map((r) => ({
          id: r.id,
          survey_title: r.survey_id,
          sentiment_label: r.sentiment_label,
          created_at: r.created_at,
        })),
      });
      setLoading(false);
    }

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-gray-500">Loading analytics...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Unable to load analytics data.</p>
      </div>
    );
  }

  const totalSentiment =
    data.sentimentBreakdown.positive +
    data.sentimentBreakdown.negative +
    data.sentimentBreakdown.neutral;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Analytics</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-xl border">
          <p className="text-sm text-gray-500">Total Responses</p>
          <p className="text-3xl font-bold mt-1">{data.totalResponses.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border">
          <p className="text-sm text-gray-500">Positive</p>
          <p className="text-3xl font-bold mt-1 text-green-600">
            {totalSentiment > 0
              ? Math.round((data.sentimentBreakdown.positive / totalSentiment) * 100)
              : 0}
            %
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl border">
          <p className="text-sm text-gray-500">Neutral</p>
          <p className="text-3xl font-bold mt-1 text-gray-600">
            {totalSentiment > 0
              ? Math.round((data.sentimentBreakdown.neutral / totalSentiment) * 100)
              : 0}
            %
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl border">
          <p className="text-sm text-gray-500">Negative</p>
          <p className="text-3xl font-bold mt-1 text-red-600">
            {totalSentiment > 0
              ? Math.round((data.sentimentBreakdown.negative / totalSentiment) * 100)
              : 0}
            %
          </p>
        </div>
      </div>

      {/* Sentiment bar */}
      {totalSentiment > 0 && (
        <div className="bg-white p-6 rounded-xl border mb-8">
          <h2 className="text-lg font-semibold mb-4">Sentiment Distribution</h2>
          <div className="flex h-8 rounded-lg overflow-hidden">
            <div
              className="bg-green-500"
              style={{
                width: `${(data.sentimentBreakdown.positive / totalSentiment) * 100}%`,
              }}
            />
            <div
              className="bg-gray-400"
              style={{
                width: `${(data.sentimentBreakdown.neutral / totalSentiment) * 100}%`,
              }}
            />
            <div
              className="bg-red-500"
              style={{
                width: `${(data.sentimentBreakdown.negative / totalSentiment) * 100}%`,
              }}
            />
          </div>
          <div className="flex justify-between mt-2 text-sm text-gray-500">
            <span>Positive ({data.sentimentBreakdown.positive})</span>
            <span>Neutral ({data.sentimentBreakdown.neutral})</span>
            <span>Negative ({data.sentimentBreakdown.negative})</span>
          </div>
        </div>
      )}

      {/* Recent responses */}
      <div className="bg-white rounded-xl border">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Recent Responses</h2>
        </div>
        {data.recentResponses.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No responses yet</div>
        ) : (
          <div className="divide-y">
            {data.recentResponses.map((response) => (
              <div key={response.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{response.survey_title}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(response.created_at).toLocaleString()}
                  </p>
                </div>
                {response.sentiment_label && (
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      response.sentiment_label === "positive"
                        ? "bg-green-100 text-green-800"
                        : response.sentiment_label === "negative"
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {response.sentiment_label}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
