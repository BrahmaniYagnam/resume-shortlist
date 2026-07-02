"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

export default function ProfilePage() {
  const { token } = useAuth();
  const [form, setForm] = useState({
    name: "", college: "", branch: "", year: "",
    skills: "", target_role: "", career_goals: "", github_username: "",
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.getProfile(token).then((p: Record<string, unknown>) => {
      setForm({
        name: (p.name as string) || "",
        college: (p.college as string) || "",
        branch: (p.branch as string) || "",
        year: (p.year as string) || "",
        skills: Array.isArray(p.skills) ? (p.skills as string[]).join(", ") : "",
        target_role: (p.target_role as string) || "",
        career_goals: (p.career_goals as string) || "",
        github_username: (p.github_username as string) || "",
      });
    }).catch(() => {});
  }, [token]);

  const handleSave = async () => {
    if (!token) return;
    setLoading(true);
    setSaved(false);
    try {
      await api.updateProfile(token, {
        ...form,
        skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
      });
      setSaved(true);
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { key: "name", label: "Full Name", type: "text" },
    { key: "college", label: "College", type: "text" },
    { key: "branch", label: "Branch", type: "text" },
    { key: "year", label: "Year", type: "text", placeholder: "e.g., 3rd Year, Final Year" },
    { key: "target_role", label: "Target Role", type: "text", placeholder: "e.g., Software Engineer" },
    { key: "github_username", label: "GitHub Username", type: "text" },
  ];

  return (
    <DashboardLayout>
      <Header title="Student Profile" subtitle="Manage your personal and career information" />

      <Card>
        <div className="grid gap-4 md:grid-cols-2">
          {fields.map(({ key, label, type, placeholder }) => (
            <div key={key}>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
              <input type={type} value={form[key as keyof typeof form]}
                placeholder={placeholder}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900" />
            </div>
          ))}
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Skills (comma-separated)</label>
            <input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })}
              placeholder="Python, React, SQL, DSA"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Career Goals</label>
            <textarea value={form.career_goals} onChange={(e) => setForm({ ...form, career_goals: e.target.value })} rows={4}
              placeholder="Describe your career aspirations..."
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900" />
          </div>
        </div>
        <div className="mt-6 flex items-center gap-3">
          <Button onClick={handleSave} loading={loading}>Save Profile</Button>
          {saved && <span className="text-sm text-green-600">Profile saved successfully!</span>}
        </div>
      </Card>
    </DashboardLayout>
  );
}
