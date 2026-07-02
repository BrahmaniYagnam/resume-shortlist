"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Lightbulb } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";

const STATUSES = ["Applied", "Online Assessment", "Interview", "Rejected", "Selected"];
const statusColors: Record<string, string> = {
  Applied: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  "Online Assessment": "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400",
  Interview: "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-400",
  Rejected: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
  Selected: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400",
};

interface Application {
  id: number;
  company_name: string;
  role: string;
  applied_date: string;
  status: string;
  notes: string;
  ai_suggestions: string[];
}

export default function ApplicationsPage() {
  const { token } = useAuth();
  const [apps, setApps] = useState<Application[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ company_name: "", role: "", notes: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.listApplications(token).then(setApps).catch(() => {});
  }, [token]);

  const handleCreate = async () => {
    if (!token) return;
    setLoading(true);
    try {
      await api.createApplication(token, form);
      setForm({ company_name: "", role: "", notes: "" });
      setShowForm(false);
      if (token) api.listApplications(token).then(setApps).catch(() => {});
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    if (!token) return;
    await api.updateApplication(token, id, { status });
    if (token) api.listApplications(token).then(setApps).catch(() => {});
  };

  const handleDelete = async (id: number) => {
    if (!token) return;
    await api.deleteApplication(token, id);
    if (token) api.listApplications(token).then(setApps).catch(() => {});
  };

  return (
    <DashboardLayout>
      <Header title="Job Application Tracker" subtitle="Track applications and get AI-powered next-step suggestions" />

      <div className="mb-6 flex justify-end">
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" /> Add Application
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6 animate-slide-up">
          <div className="grid gap-4 md:grid-cols-3">
            <input placeholder="Company Name" value={form.company_name}
              onChange={(e) => setForm({ ...form, company_name: e.target.value })}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900" />
            <input placeholder="Role" value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900" />
            <input placeholder="Notes (optional)" value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900" />
          </div>
          <Button onClick={handleCreate} loading={loading} className="mt-4">Save Application</Button>
        </Card>
      )}

      <div className="space-y-4">
        {apps.length === 0 ? (
          <Card><p className="text-center text-sm text-gray-500">No applications yet. Add your first one!</p></Card>
        ) : (
          apps.map((app) => (
            <Card key={app.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{app.company_name}</h3>
                  <p className="text-sm text-gray-500">{app.role}</p>
                  <p className="mt-1 text-xs text-gray-400">Applied: {formatDate(app.applied_date)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select value={app.status} onChange={(e) => handleStatusChange(app.id, e.target.value)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium ${statusColors[app.status] || ""} border-0 cursor-pointer`}>
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button onClick={() => handleDelete(app.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {app.ai_suggestions?.length > 0 && (
                <div className="mt-4 rounded-xl bg-yellow-50 p-4 dark:bg-yellow-950/20">
                  <p className="mb-2 flex items-center gap-1 text-sm font-medium text-yellow-800 dark:text-yellow-400">
                    <Lightbulb className="h-4 w-4" /> AI Suggestions
                  </p>
                  <ul className="space-y-1">
                    {app.ai_suggestions.map((s, i) => (
                      <li key={i} className="text-sm text-yellow-700 dark:text-yellow-300">• {s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </DashboardLayout>
  );
}
