"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

const templates = [
  { id: "software_engineer", label: "Software Engineer", desc: "Optimized for SDE, Full Stack, and Backend roles" },
  { id: "data_analyst", label: "Data Analyst", desc: "Highlights analytics, SQL, and visualization skills" },
  { id: "product_manager", label: "Product Manager", desc: "Focuses on product thinking and leadership" },
];

export default function ResumeBuilderPage() {
  const { token } = useAuth();
  const [template, setTemplate] = useState("software_engineer");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState({
    name: "", email: "", phone: "",
    skills: "", projects: "", experience: "",
  });

  const handleBuild = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await api.buildResume(token, {
        template,
        name: form.name,
        email: form.email,
        phone: form.phone,
        skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
        projects: form.projects.split("\n").filter(Boolean).map((p) => ({ name: p.split(":")[0]?.trim(), description: p.split(":")[1]?.trim() || p })),
        experience: form.experience.split("\n").filter(Boolean).map((e) => ({ description: e })),
        education: [],
        certifications: [],
      });
      setResult(data as Record<string, unknown>);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <Header title="AI Resume Builder" subtitle="Generate ATS-optimized resumes tailored to your target role" />

      <div className="mb-8 grid gap-4 md:grid-cols-3">
        {templates.map((t) => (
          <button key={t.id} onClick={() => setTemplate(t.id)}
            className={`rounded-2xl border p-5 text-left transition-all ${template === t.id ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30" : "border-gray-200 dark:border-gray-800 hover:border-gray-300"}`}>
            <p className="font-semibold text-gray-900 dark:text-white">{t.label}</p>
            <p className="mt-1 text-sm text-gray-500">{t.desc}</p>
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Your Information">
          <div className="space-y-4">
            {[
              { key: "name", label: "Full Name", type: "text" },
              { key: "email", label: "Email", type: "email" },
              { key: "phone", label: "Phone", type: "tel" },
            ].map(({ key, label, type }) => (
              <div key={key}>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
                <input type={type} value={form[key as keyof typeof form]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900" />
              </div>
            ))}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Skills (comma-separated)</label>
              <input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900"
                placeholder="Python, React, SQL, Git" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Projects (one per line, Name: Description)</label>
              <textarea value={form.projects} onChange={(e) => setForm({ ...form, projects: e.target.value })} rows={3}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Experience</label>
              <textarea value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} rows={3}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900" />
            </div>
            <Button onClick={handleBuild} loading={loading} className="w-full">Generate Optimized Resume</Button>
          </div>
        </Card>

        <Card title="Generated Resume">
          {result ? (
            <div className="space-y-4 text-sm">
              {typeof result.summary === "string" && result.summary && (
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Summary</h4>
                  <p className="mt-1 text-gray-600 dark:text-gray-400">{result.summary}</p>
                </div>
              )}
              {typeof result.skills_section === "string" && result.skills_section && (
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Skills</h4>
                  <p className="mt-1 text-gray-600 dark:text-gray-400">{result.skills_section}</p>
                </div>
              )}
              {Array.isArray(result.projects) && (
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Projects</h4>
                  {(result.projects as Array<{ name: string; description: string }>).map((p, i) => (
                    <div key={i} className="mt-2 rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
                      <p className="font-medium">{p.name}</p>
                      <p className="text-gray-600 dark:text-gray-400">{p.description}</p>
                    </div>
                  ))}
                </div>
              )}
              {typeof result.full_resume_text === "string" && result.full_resume_text && (
                <div className="rounded-xl bg-gray-50 p-4 font-mono text-xs whitespace-pre-wrap dark:bg-gray-800">
                  {result.full_resume_text}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Fill in your details and click generate to see your AI-optimized resume.</p>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
