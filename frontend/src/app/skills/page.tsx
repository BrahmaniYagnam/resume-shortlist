"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SkillBarChart } from "@/components/charts/Charts";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

export default function SkillsPage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  const handleAssess = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await api.assessSkills(token);
      setResult(data as Record<string, unknown>);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const skillScores = (result?.skill_scores as Record<string, number>) || {};
  const barData = Object.entries(skillScores).map(([name, value]) => ({ name, value }));
  const weeklyRoadmap = (result?.weekly_roadmap as Array<Record<string, unknown>>) || [];
  const monthlyPlan = (result?.monthly_plan as Array<Record<string, unknown>>) || [];
  const resources = (result?.resources as Array<Record<string, unknown>>) || [];

  return (
    <DashboardLayout>
      <Header title="Skill Gap Prediction" subtitle="AI-powered job readiness assessment and learning roadmap" />

      <Card className="mb-8 text-center">
        <p className="mb-4 text-gray-600 dark:text-gray-400">
          Get a comprehensive analysis of your placement readiness across key skill areas.
        </p>
        <Button onClick={handleAssess} loading={loading} size="lg">Run Skill Assessment</Button>
      </Card>

      {result && (
        <div className="animate-fade-in space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card title={`Overall Readiness: ${(result.overall_readiness as number)?.toFixed(0)}%`}>
              <ProgressBar value={(result.overall_readiness as number) || 0} color="bg-purple-600" />
              <div className="mt-6 space-y-3">
                {Object.entries(skillScores).map(([skill, score]) => (
                  <ProgressBar key={skill} value={score} label={skill}
                    color={score >= 70 ? "bg-green-600" : score >= 40 ? "bg-yellow-500" : "bg-red-500"} />
                ))}
              </div>
            </Card>
            <Card title="Skill Breakdown">
              <SkillBarChart data={barData} />
            </Card>
          </div>

          <Card title="Weekly Learning Roadmap">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {weeklyRoadmap.map((week, i) => (
                <div key={i} className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                  <p className="text-sm font-bold text-blue-600">Week {week.week as number}</p>
                  <p className="mt-1 font-medium text-gray-900 dark:text-white">{week.focus as string}</p>
                  <ul className="mt-2 space-y-1">
                    {((week.tasks as string[]) || []).map((t, j) => (
                      <li key={j} className="text-xs text-gray-600 dark:text-gray-400">• {t}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Monthly Career Plan">
              {monthlyPlan.map((month, i) => (
                <div key={i} className="mb-4 rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
                  <p className="font-medium text-gray-900 dark:text-white">Month {month.month as number}: {month.goal as string}</p>
                  <ul className="mt-2 space-y-1">
                    {((month.milestones as string[]) || []).map((m, j) => (
                      <li key={j} className="text-sm text-gray-600 dark:text-gray-400">✓ {m}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </Card>

            <Card title="Recommended Resources">
              <div className="space-y-3">
                {resources.map((r, i) => (
                  <a key={i} href={r.url as string} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-xl border border-gray-200 p-4 transition-colors hover:border-blue-500 dark:border-gray-800">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{r.title as string}</p>
                      <p className="text-xs text-gray-500">{r.type as string}</p>
                    </div>
                    <span className="text-blue-600">→</span>
                  </a>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
