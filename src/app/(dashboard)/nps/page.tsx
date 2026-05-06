"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface NpsData {
  totalResponses: number;
  promoters: number;
  passives: number;
  detractors: number;
  npsScore: number;
  recentScores: { id: string; score: number; comment: string | null; created_at: string }[];
}

export default function NpsPage() {
  const [data, setData] = useState<NpsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNps() {
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

      const { data: scores } = await supabase
        .from("nps_scores")
        .select("*")
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false });

      if (!scores) {
        setData({
          totalResponses: 0,
          promoters: 0,
          passives: 0,
          detractors: 0,
          npsScore: 0,
          recentScores: [],
        });
        setLoading(false);
        return;
      }

      const promoters = scores.filter((s) => s.score >= 9).length;
      const passives = scores.filter((s) => s.score >= 7 && s.score <= 8).length;
      const detractors = scores.filter((s) => s.score <= 6).length;
      const total = scores.length;
      const npsScore =
        total > 0
          ? Math.round(((promoters / total) * 100) - ((detractors / total) * 100))
          : 0;

      setData({
        totalResponses: total,
        promoters,
        passives,
        detractors,
        npsScore,
        recentScores: scores.slice(0, 20).map((s) => ({
          id: s.id,
          score: s.score,
          comment: s.comment,
          created_at: s.created_at,
        })),
      });
      setLoading(false);
    }

    fetchNps();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-gray-500">Loading NPS data...</div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Net Promoter Score</h1>

      {/* NPS Score card */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <div className="md:col-span-2 bg-white p-8 rounded-xl border text-center">
          <p className="text-sm text-gray-500 mb-2">NPS Score</p>
          <p
            className={`text-6xl font-bold ${
              data.npsScore >= 50
                ? "text-green-600"
                : data.npsScore >= 0
                ? "text-yellow-600"
                : "text-red-600"
            }`}
          >
            {data.npsScore}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Based on {data.totalResponses} responses
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl border">
          <p className="text-sm text-gray-500">Promoters (9-10)</p>
          <p className="text-3xl font-bold mt-1 text-green-600">{data.promoters}</p>
          <p className="text-sm text-gray-400">
            {data.totalResponses > 0
              ? Math.round((data.promoters / data.totalResponses) * 100)
              : 0}
            %
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl border">
          <p className="text-sm text-gray-500">Passives (7-8)</p>
          <p className="text-3xl font-bold mt-1 text-yellow-600">{data.passives}</p>
          <p className="text-sm text-gray-400">
            {data.totalResponses > 0
              ? Math.round((data.passives / data.totalResponses) * 100)
              : 0}
            %
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl border">
          <p className="text-sm text-gray-500">Detractors (0-6)</p>
          <p className="text-3xl font-bold mt-1 text-red-600">{data.detractors}</p>
          <p className="text-sm text-gray-400">
            {data.totalResponses > 0
              ? Math.round((data.detractors / data.totalResponses) * 100)
              : 0}
            %
          </p>
        </div>
      </div>

      {/* Recent scores */}
      <div className="bg-white rounded-xl border">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Recent NPS Responses</h2>
        </div>
        {data.recentScores.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No NPS responses yet. Create an NPS survey to start tracking.
          </div>
        ) : (
          <div className="divide-y">
            {data.recentScores.map((score) => (
              <div key={score.id} className="px-6 py-4 flex items-center gap-4">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                    score.score >= 9
                      ? "bg-green-500"
                      : score.score >= 7
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  }`}
                >
                  {score.score}
                </div>
                <div className="flex-1">
                  {score.comment && (
                    <p className="text-sm text-gray-700">{score.comment}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    {new Date(score.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
