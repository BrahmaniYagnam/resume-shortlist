"use client";

import { useEffect, useState } from "react";
import { Users, TrendingUp, Target, Activity } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { SkillBarChart } from "@/components/charts/Charts";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

export default function AdminPage() {
  const { token, user } = useAuth();
  const [dashboard, setDashboard] = useState<Record<string, unknown> | null>(null);
  const [students, setStudents] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    if (!token || user?.role !== "admin") return;
    api.adminDashboard(token).then(setDashboard).catch(() => {});
    api.adminStudents(token).then(setStudents).catch(() => {});
  }, [token, user]);

  if (user?.role !== "admin") {
    return (
      <DashboardLayout>
        <Header title="Admin Panel" subtitle="College placement dashboard" />
        <Card>
          <p className="text-center text-gray-500">Admin access required. Contact your administrator.</p>
        </Card>
      </DashboardLayout>
    );
  }

  const gaps = (dashboard?.common_skill_gaps as Array<{ skill: string; count: number }>) || [];
  const readiness = (dashboard?.placement_readiness as Array<{ role: string; avg_readiness: number }>) || [];
  const activity = (dashboard?.recent_activity as Array<Record<string, string>>) || [];

  return (
    <DashboardLayout>
      <Header title="College Placement Dashboard" subtitle="Monitor student progress and placement readiness" />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Students", value: String(dashboard?.total_students ?? "—"), icon: Users, color: "text-blue-600" },
          { label: "Avg Resume Score", value: `${dashboard?.avg_resume_score ?? "—"}%`, icon: TrendingUp, color: "text-green-600" },
          { label: "Avg Readiness", value: `${dashboard?.avg_readiness ?? "—"}%`, icon: Target, color: "text-purple-600" },
          { label: "Recent Activity", value: String(activity.length), icon: Activity, color: "text-orange-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="flex items-center gap-4">
            <div className={`rounded-xl bg-gray-50 p-3 dark:bg-gray-800 ${color}`}>
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{label}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Common Skill Gaps">
          {gaps.length > 0 ? (
            <SkillBarChart data={gaps.map((g) => ({ name: g.skill, value: g.count * 10 }))} />
          ) : (
            <p className="text-sm text-gray-500">No skill gap data yet.</p>
          )}
        </Card>

        <Card title="Placement Readiness by Role">
          <div className="space-y-3">
            {readiness.map((r, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-800">
                <span className="text-sm font-medium text-gray-900 dark:text-white">{r.role}</span>
                <span className="text-sm font-bold text-blue-600">{r.avg_readiness}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Student Progress" className="mt-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="pb-3 text-left font-medium text-gray-500">Name</th>
                <th className="pb-3 text-left font-medium text-gray-500">College</th>
                <th className="pb-3 text-left font-medium text-gray-500">Target Role</th>
                <th className="pb-3 text-left font-medium text-gray-500">Resume Score</th>
                <th className="pb-3 text-left font-medium text-gray-500">Readiness</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id as number} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-3 text-gray-900 dark:text-white">{s.name as string}</td>
                  <td className="py-3 text-gray-600 dark:text-gray-400">{s.college as string}</td>
                  <td className="py-3 text-gray-600 dark:text-gray-400">{s.target_role as string}</td>
                  <td className="py-3 font-medium text-blue-600">{(s.resume_score as number)?.toFixed(0)}%</td>
                  <td className="py-3 font-medium text-purple-600">{(s.readiness as number)?.toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </DashboardLayout>
  );
}
