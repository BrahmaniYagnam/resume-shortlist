"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

interface Question {
  category: string;
  subcategory: string;
  question: string;
}

export default function InterviewPage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<Record<string, unknown> | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  const startSession = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await api.generateInterview(token, {}) as { session_id: number; questions: Question[] };
      setSessionId(data.session_id);
      setQuestions(data.questions);
      setCurrentIdx(0);
      setFeedback(null);
      setAnswer("");
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!token || sessionId === null || !answer.trim()) return;
    setEvaluating(true);
    try {
      const fb = await api.evaluateAnswer(token, {
        session_id: sessionId,
        question_index: currentIdx,
        answer,
      });
      setFeedback(fb as Record<string, unknown>);
    } finally {
      setEvaluating(false);
    }
  };

  const nextQuestion = () => {
    setCurrentIdx((i) => Math.min(i + 1, questions.length - 1));
    setAnswer("");
    setFeedback(null);
  };

  const categoryColors: Record<string, string> = {
    technical: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
    hr: "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-400",
    project: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400",
  };

  const current = questions[currentIdx];

  return (
    <DashboardLayout>
      <Header title="AI Interview Preparation" subtitle="Practice with personalized questions and get AI feedback" />

      {!sessionId ? (
        <Card className="text-center">
          <p className="mb-6 text-gray-600 dark:text-gray-400">
            Generate personalized interview questions based on your resume, target role, and skills.
          </p>
          <Button onClick={startSession} loading={loading} size="lg">Start Interview Session</Button>
        </Card>
      ) : current ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <Card title="Questions">
              <div className="space-y-2">
                {questions.map((q, i) => (
                  <button key={i} onClick={() => { setCurrentIdx(i); setFeedback(null); setAnswer(""); }}
                    className={`w-full rounded-xl px-3 py-2 text-left text-sm transition-colors ${i === currentIdx ? "bg-blue-50 text-blue-700 dark:bg-blue-950" : "hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
                    <span className={`mr-2 rounded px-1.5 py-0.5 text-xs ${categoryColors[q.category] || ""}`}>{q.category}</span>
                    Q{i + 1}
                  </button>
                ))}
              </div>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <Card>
              <div className="mb-4 flex items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${categoryColors[current.category] || ""}`}>
                  {current.category} — {current.subcategory}
                </span>
                <span className="text-sm text-gray-500">{currentIdx + 1} / {questions.length}</span>
              </div>
              <p className="text-lg font-medium text-gray-900 dark:text-white">{current.question}</p>
            </Card>

            <Card title="Your Answer">
              <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={6}
                placeholder="Type your answer here..."
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-900" />
              <div className="mt-4 flex gap-3">
                <Button onClick={submitAnswer} loading={evaluating} disabled={!answer.trim()}>Get AI Feedback</Button>
                {currentIdx < questions.length - 1 && (
                  <Button variant="secondary" onClick={nextQuestion}>Next Question</Button>
                )}
              </div>
            </Card>

            {feedback && (
              <Card title="AI Feedback" className="animate-fade-in">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-xl font-bold text-blue-700 dark:bg-blue-950">
                    {feedback.score as number}/10
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{feedback.feedback as string}</p>
                </div>
                {Array.isArray(feedback.improvements) && (
                  <ul className="space-y-1">
                    {(feedback.improvements as string[]).map((s, i) => (
                      <li key={i} className="text-sm text-gray-700 dark:text-gray-300">• {s}</li>
                    ))}
                  </ul>
                )}
                {typeof feedback.sample_answer === "string" && feedback.sample_answer && (
                  <div className="mt-4 rounded-xl bg-green-50 p-4 text-sm dark:bg-green-950/20">
                    <p className="font-medium text-green-800 dark:text-green-400">Sample Answer:</p>
                    <p className="mt-1 text-green-700 dark:text-green-300">{feedback.sample_answer}</p>
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}
