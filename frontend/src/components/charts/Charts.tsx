"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";

const COLORS = ["#4285F4", "#34A853", "#FBBC04", "#EA4335", "#9334E6", "#FF6D01"];

export function ScoreRing({ score, label }: { score: number; label: string }) {
  const data = [
    { value: score },
    { value: 100 - score },
  ];
  const color = score >= 75 ? "#34A853" : score >= 50 ? "#FBBC04" : "#EA4335";

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-32 w-32">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={55} startAngle={90} endAngle={-270} dataKey="value">
              <Cell fill={color} />
              <Cell fill="#E8EAED" className="dark:fill-gray-700" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">{score.toFixed(0)}</span>
        </div>
      </div>
      <p className="mt-2 text-sm font-medium text-gray-600 dark:text-gray-400">{label}</p>
    </div>
  );
}

export function SkillBarChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
        <XAxis type="number" domain={[0, 100]} hide />
        <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
        <Tooltip formatter={(v) => [`${v ?? 0}%`, "Score"]} />
        <Bar dataKey="value" radius={[0, 6, 6, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SkillRadarChart({ data }: { data: { skill: string; score: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11 }} />
        <PolarRadiusAxis domain={[0, 100]} tick={false} />
        <Radar name="Score" dataKey="score" stroke="#4285F4" fill="#4285F4" fillOpacity={0.3} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export function LanguagePieChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}
