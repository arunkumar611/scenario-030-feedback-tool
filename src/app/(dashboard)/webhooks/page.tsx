"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface Webhook {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  created_at: string;
}

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>(["response.created"]);
  const [saving, setSaving] = useState(false);

  const eventTypes = [
    { value: "response.created", label: "New response received" },
    { value: "survey.completed", label: "Survey completed" },
    { value: "nps.score_changed", label: "NPS score changed" },
    { value: "survey.closed", label: "Survey closed" },
  ];

  useEffect(() => {
    fetchWebhooks();
  }, []);

  async function fetchWebhooks() {
    const response = await fetch("/api/webhooks");
    const data = await response.json();
    setWebhooks(data.webhooks || []);
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const response = await fetch("/api/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, events }),
    });

    if (response.ok) {
      setUrl("");
      setEvents(["response.created"]);
      setShowForm(false);
      fetchWebhooks();
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-gray-500">Loading webhooks...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Webhooks</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          {showForm ? "Cancel" : "Add webhook"}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-xl border mb-6">
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Endpoint URL
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="https://your-app.com/webhooks"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Events to subscribe
              </label>
              <div className="space-y-2">
                {eventTypes.map((et) => (
                  <label key={et.value} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={events.includes(et.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setEvents([...events, et.value]);
                        } else {
                          setEvents(events.filter((ev) => ev !== et.value));
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{et.label}</span>
                    <code className="text-xs text-gray-500">{et.value}</code>
                  </label>
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={saving || events.length === 0}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
            >
              {saving ? "Creating..." : "Create webhook"}
            </button>
          </form>
        </div>
      )}

      {webhooks.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No webhooks configured</h3>
          <p className="text-gray-500">
            Add a webhook to receive real-time notifications when events occur.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">URL</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Events</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {webhooks.map((wh) => (
                <tr key={wh.id}>
                  <td className="px-6 py-4 text-sm font-mono">{wh.url}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {(wh.events as string[]).map((e) => (
                        <span
                          key={e}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700"
                        >
                          {e}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        wh.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}
                    >
                      {wh.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(wh.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
