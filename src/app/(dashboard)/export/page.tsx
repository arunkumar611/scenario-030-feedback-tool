"use client";

import { useState } from "react";

export default function ExportPage() {
  const [type, setType] = useState<"csv" | "json">("csv");
  const [surveyId, setSurveyId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleExport(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const response = await fetch("/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        survey_id: surveyId || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      setMessage("Export started. You will receive an email when it is ready.");
    } else {
      setMessage(`Error: ${data.error}`);
    }
    setLoading(false);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Data Export</h1>

      <div className="bg-white p-6 rounded-xl border max-w-lg">
        <form onSubmit={handleExport} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Export format
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "csv" | "json")}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Survey ID (optional)
            </label>
            <input
              type="text"
              value={surveyId}
              onChange={(e) => setSurveyId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Leave empty to export all surveys"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date from
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date to
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Starting export..." : "Start export"}
          </button>
        </form>

        {message && (
          <div
            className={`mt-4 p-3 rounded-lg text-sm ${
              message.startsWith("Error")
                ? "bg-red-50 text-red-700"
                : "bg-green-50 text-green-700"
            }`}
          >
            {message}
          </div>
        )}
      </div>

      {/* GDPR section */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">GDPR Data Requests</h2>
        <div className="bg-white p-6 rounded-xl border max-w-lg">
          <p className="text-sm text-gray-600 mb-4">
            Under GDPR, individuals have the right to request deletion of their personal data.
            Enter the respondent's email to delete all their survey responses.
          </p>
          <GdprDeletionForm />
        </div>
      </div>
    </div>
  );
}

function GdprDeletionForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();

    if (!confirm(`This will permanently delete all data for ${email}. This cannot be undone. Continue?`)) {
      return;
    }

    setLoading(true);
    setResult(null);

    const response = await fetch("/api/gdpr/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ respondent_email: email }),
    });

    const data = await response.json();

    if (response.ok) {
      setResult(
        `Deletion completed. Removed: ${data.deleted.responses} responses, ${data.deleted.nps_scores} NPS scores, ${data.deleted.consent_records} consent records.`
      );
      setEmail("");
    } else {
      setResult(`Error: ${data.error}`);
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleDelete} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Respondent email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
          placeholder="respondent@example.com"
          required
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
      >
        {loading ? "Processing deletion..." : "Delete all data for this email"}
      </button>
      {result && (
        <div
          className={`p-3 rounded-lg text-sm ${
            result.startsWith("Error")
              ? "bg-red-50 text-red-700"
              : "bg-green-50 text-green-700"
          }`}
        >
          {result}
        </div>
      )}
    </form>
  );
}
