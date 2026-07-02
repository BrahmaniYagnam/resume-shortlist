"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ScoreRing } from "@/components/charts/Charts";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

export default function JobMatcherPage() {
  const { token } = useAuth();
  const [jd, setJd] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  const handleMatch = async () => {
    if (!token || !jd.trim()) return;
    setLoading(true);
    try {
      const data = await api.matchJob(token, { job_description: jd });
      setResult(data as Record<string, unknown>);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <Header title="Job Description Matcher" subtitle="Compare your resume against any job posting" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Paste Job Description">
          <textarea
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            rows={16}
            placeholder="Paste the full job description here..."
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-900"
          />
          <Button onClick={handleMatch} loading={loading} className="mt-4 w-full" disabled={!jd.trim()}>
            Analyze Match
          </Button>
        </Card>

        <div className="space-y-6">
          {result ? (
            <>
              <Card className="flex flex-col items-center">
                <ScoreRing score={(result.match_percentage as number) || 0} label="Match Score" />
              </Card>

              <Card title="Matching Skills">
                <div className="flex flex-wrap gap-2">
                  {((result.matching_skills as string[]) || []).map((s, i) => (
                    <span key={i} className="rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700 dark:bg-green-950 dark:text-green-400">{s}</span>
                  ))}
                </div>
              </Card>

              <Card title="Missing Skills">
                <div className="flex flex-wrap gap-2">
                  {((result.missing_skills as string[]) || []).map((s, i) => (
                    <span key={i} className="rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-700 dark:bg-red-950 dark:text-red-400">{s}</span>
                  ))}
                </div>
              </Card>

              <Card title="Recommended Improvements">
                <ul className="space-y-2">
                  {((result.recommended_improvements as string[]) || []).map((s, i) => (
                    <li key={i} className="text-sm text-gray-700 dark:text-gray-300">• {s}</li>
                  ))}
                </ul>
              </Card>

              <Card title="Suitable Roles">
                <div className="flex flex-wrap gap-2">
                  {((result.suitable_roles as string[]) || []).map((s, i) => (
                    <span key={i} className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-400">{s}</span>
                  ))}
                </div>
              </Card>
            </>
          ) : (
            <Card>
              <p className="text-sm text-gray-500">Paste a job description and click Analyze Match to see how well your resume aligns.</p>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
