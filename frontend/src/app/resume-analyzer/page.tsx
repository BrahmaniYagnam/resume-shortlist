"use client";

import { useState, useRef } from "react";
import { Upload, CheckCircle, AlertCircle, Lightbulb } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ScoreRing, SkillRadarChart } from "@/components/charts/Charts";
import { useAuth } from "@/lib/auth";
import { api, type ResumeAnalysis } from "@/lib/api";

export default function ResumeAnalyzerPage() {
  const { token } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResumeAnalysis | null>(null);
  const [error, setError] = useState("");

  const handleUpload = async (file: File) => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const data = await api.uploadResume(token, file);
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const analysis = result?.analysis || {};
  const extracted = result?.extracted_data || {};
  const skillAnalysis = (analysis.skill_analysis as Record<string, number>) || {};

  const radarData = Object.entries(skillAnalysis).map(([skill, score]) => ({
    skill: skill.replace("_", " "),
    score,
  }));

  return (
    <DashboardLayout>
      <Header title="AI Resume Analyzer" subtitle="Upload your resume for ATS scoring and AI-powered analysis" />

      <Card className="mb-8">
        <div
          onClick={() => fileRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 p-12 transition-colors hover:border-blue-500 hover:bg-blue-50/50 dark:border-gray-700 dark:hover:border-blue-500 dark:hover:bg-blue-950/20"
        >
          <Upload className="mb-4 h-12 w-12 text-gray-400" />
          <p className="text-lg font-medium text-gray-900 dark:text-white">Drop your resume here or click to upload</p>
          <p className="mt-1 text-sm text-gray-500">Supports PDF and DOC/DOCX files</p>
          <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden"
            onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
        </div>
        {loading && (
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-blue-600">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            Analyzing resume with AI...
          </div>
        )}
        {error && <p className="mt-4 text-center text-sm text-red-600">{error}</p>}
      </Card>

      {result && (
        <div className="animate-fade-in space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="flex flex-col items-center justify-center">
              <ScoreRing score={result.ats_score} label="ATS Score" />
            </Card>
            <Card className="flex flex-col items-center justify-center">
              <ScoreRing score={result.quality_score} label="Quality Score" />
            </Card>
            <Card title="Skill Analysis">
              {radarData.length > 0 ? (
                <SkillRadarChart data={radarData} />
              ) : (
                Object.entries(skillAnalysis).map(([k, v]) => (
                  <ProgressBar key={k} value={v as number} label={k.replace("_", " ")} className="mb-3" />
                ))
              )}
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Strengths">
              <ul className="space-y-2">
                {((analysis.strengths as string[]) || []).map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />{s}
                  </li>
                ))}
              </ul>
            </Card>
            <Card title="Weaknesses">
              <ul className="space-y-2">
                {((analysis.weaknesses as string[]) || []).map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />{s}
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <Card title="Improvement Suggestions">
            <ul className="space-y-3">
              {((analysis.improvements as string[]) || []).map((s, i) => (
                <li key={i} className="flex items-start gap-3 rounded-xl bg-yellow-50 p-4 text-sm dark:bg-yellow-950/20">
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600" />{s}
                </li>
              ))}
            </ul>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Extracted Skills">
              <div className="flex flex-wrap gap-2">
                {((extracted.skills as string[]) || []).map((s, i) => (
                  <span key={i} className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-400">{s}</span>
                ))}
              </div>
            </Card>
            <Card title="Missing Keywords">
              <div className="flex flex-wrap gap-2">
                {((analysis.missing_keywords as string[]) || []).map((s, i) => (
                  <span key={i} className="rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-700 dark:bg-red-950 dark:text-red-400">{s}</span>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
