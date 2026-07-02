"use client";

import { useState } from "react";
import { Code2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { LanguagePieChart } from "@/components/charts/Charts";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

export default function GithubPage() {
  const { token } = useAuth();
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  const handleAnalyze = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await api.analyzeGithub(token, username);
      setResult(data as Record<string, unknown>);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const analysis = (result?.analysis as Record<string, unknown>) || {};
  const profile = (result?.profile as Record<string, unknown>) || {};
  const repos = (result?.repos as Array<Record<string, unknown>>) || [];
  const languages = analysis.languages as Record<string, number> | undefined;
  const langData = languages
    ? Object.entries(languages).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <DashboardLayout>
      <Header title="GitHub Profile Analyzer" subtitle="Analyze your GitHub repos, languages, and project quality" />

      <Card className="mb-8">
        <div className="flex gap-3">
          <input value={username} onChange={(e) => setUsername(e.target.value)}
            placeholder="GitHub username (e.g., octocat)"
            className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900" />
          <Button onClick={handleAnalyze} loading={loading}>
            <Code2 className="h-4 w-4" /> Analyze
          </Button>
        </div>
      </Card>

      {result && (
        <div className="animate-fade-in space-y-6">
          <div className="grid gap-6 md:grid-cols-4">
            <Card className="text-center">
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{(analysis.overall_score as number)?.toFixed(0)}%</p>
              <p className="text-sm text-gray-500">Overall Score</p>
            </Card>
            <Card className="text-center">
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{profile.public_repos as number}</p>
              <p className="text-sm text-gray-500">Public Repos</p>
            </Card>
            <Card className="text-center">
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{profile.followers as number}</p>
              <p className="text-sm text-gray-500">Followers</p>
            </Card>
            <Card className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">{analysis.contributions_summary as string}</p>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {langData.length > 0 && (
              <Card title="Language Distribution">
                <LanguagePieChart data={langData} />
              </Card>
            )}
            <Card title="Suggestions">
              <ul className="space-y-2">
                {((analysis.suggestions as string[]) || []).map((s, i) => (
                  <li key={i} className="text-sm text-gray-700 dark:text-gray-300">• {s}</li>
                ))}
              </ul>
            </Card>
          </div>

          <Card title="Repository Analysis">
            <div className="space-y-4">
              {((analysis.repo_analysis as Array<Record<string, unknown>>) || repos.slice(0, 5).map((r) => ({
                name: r.name, quality: 50, suggestion: "Review project documentation",
              }))).map((repo, i) => (
                <div key={i} className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-900 dark:text-white">{repo.name as string}</p>
                    <span className="text-sm font-medium text-blue-600">{(repo.quality as number)}% quality</span>
                  </div>
                  <ProgressBar value={(repo.quality as number) || 0} className="mt-2" />
                  <p className="mt-2 text-sm text-gray-500">{repo.suggestion as string}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
