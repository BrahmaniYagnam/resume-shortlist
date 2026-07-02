"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileSearch, Mic, Target, Briefcase, ArrowRight, TrendingUp } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

const quickActions = [
  { href: "/resume-analyzer", icon: FileSearch, label: "Analyze Resume", color: "from-blue-500 to-blue-600" },
  { href: "/voice-coach", icon: Mic, label: "Voice Coach", color: "from-purple-500 to-purple-600" },
  { href: "/skills", icon: Target, label: "Skill Assessment", color: "from-green-500 to-green-600" },
  { href: "/job-matcher", icon: Briefcase, label: "Match Jobs", color: "from-orange-500 to-orange-600" },
];

export default function DashboardPage() {
  const { token, user } = useAuth();
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [resumes, setResumes] = useState<Array<{ ats_score: number; quality_score: number }>>([]);
  const [applications, setApplications] = useState<Array<{ status: string }>>([]);

  useEffect(() => {
    if (!token) return;
    api.getProfile(token).then(setProfile).catch(() => {});
    api.listResumes(token).then(setResumes).catch(() => {});
    api.listApplications(token).then(setApplications).catch(() => {});
  }, [token]);

  const latestScore = resumes[0]?.ats_score || 0;
  const avgQuality = resumes.length
    ? resumes.reduce((s, r) => s + r.quality_score, 0) / resumes.length
    : 0;

  return (
    <DashboardLayout>
      <Header
        title={`Welcome back, ${user?.name || "Student"}!`}
        subtitle="Your AI-powered placement command center"
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Resume Score", value: `${latestScore.toFixed(0)}%`, icon: TrendingUp, color: "text-blue-600" },
          { label: "Quality Score", value: `${avgQuality.toFixed(0)}%`, icon: FileSearch, color: "text-green-600" },
          { label: "Applications", value: String(applications.length), icon: Briefcase, color: "text-orange-600" },
          { label: "Target Role", value: (profile?.target_role as string) || "Not set", icon: Target, color: "text-purple-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="flex items-center gap-4">
            <div className={`rounded-xl bg-gray-50 p-3 dark:bg-gray-800 ${color}`}>
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{label}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white truncate">{value}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quickActions.map(({ href, icon: Icon, label, color }) => (
          <Link key={href} href={href}>
            <div className="group flex items-center gap-4 rounded-2xl border border-gray-200/80 bg-white p-5 transition-all hover:shadow-md dark:border-gray-800 dark:bg-gray-900/80">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${color}`}>
                <Icon className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">{label}</p>
                <ArrowRight className="mt-1 h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Resume Progress">
          <ProgressBar value={latestScore} label="ATS Score" color="bg-blue-600" />
          <div className="mt-4">
            <ProgressBar value={avgQuality} label="Quality Score" color="bg-green-600" />
          </div>
        </Card>

        <Card title="Recent Applications">
          {applications.length === 0 ? (
            <p className="text-sm text-gray-500">No applications tracked yet. <Link href="/applications" className="text-blue-600 hover:underline">Add one</Link></p>
          ) : (
            <div className="space-y-3">
              {applications.slice(0, 5).map((app: Record<string, unknown>, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-800">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{app.company_name as string}</p>
                    <p className="text-xs text-gray-500">{app.role as string}</p>
                  </div>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-400">
                    {app.status as string}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
