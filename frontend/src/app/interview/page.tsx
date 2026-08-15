"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Mic, MicOff, ChevronRight, Award, CheckCircle } from "lucide-react";

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
  const [listening, setListening] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);


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
      setCompleted(false);
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

  const finishInterview = () => {
    setCompleted(true);
  };

  const loadMore = async () => {
    if (!token || sessionId === null) return;
    setLoadingMore(true);
    try {
      const data = await api.moreInterviewQuestions(token, { session_id: sessionId }) as { session_id: number; questions: Question[] };
      setQuestions(data.questions);
      setCurrentIdx((prev) => prev + 1);
      setAnswer("");
      setFeedback(null);
    } finally {
      setLoadingMore(false);
    }
  };


  const toggleListening = () => {
    if (listening) {
      setListening(false);
      return;
    }

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onerror = (event: any) => {
      console.error(event.error);
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setAnswer((prev) => (prev ? prev + " " + transcript : transcript));
    };

    recognition.start();
  };

  const categoryColors: Record<string, string> = {
    technical: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
    hr: "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-400",
    project: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400",
  };

  const current = questions[currentIdx];
  const progressPercentage = questions.length ? ((currentIdx + 1) / questions.length) * 100 : 0;

  return (
    <DashboardLayout>
      <Header title="AI Interview Preparation" subtitle="Practice with personalized questions and get AI feedback" />

      {completed ? (
        <Card className="text-center max-w-xl mx-auto py-10 space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400">
            <CheckCircle className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Interview Practice Completed!</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Excellent job practicing! You have gone through all the personalized mock interview questions. Keep practicing to build confidence.
          </p>
          <Button onClick={() => { setSessionId(null); setCompleted(false); setQuestions([]); }} size="lg">
            Start New Session
          </Button>
        </Card>
      ) : !sessionId ? (
        <Card className="text-center max-w-xl mx-auto py-8">
          <p className="mb-6 text-gray-600 dark:text-gray-400">
            Generate personalized, role-specific mock interview questions based on your resume and skills, and get real-time feedback.
          </p>
          <Button onClick={startSession} loading={loading} size="lg">Start Interview Session</Button>
        </Card>
      ) : current ? (
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Progress Tracker */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Question {currentIdx + 1} of {questions.length}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${categoryColors[current.category] || ""}`}>
              {current.category} — {current.subcategory}
            </span>
          </div>

          <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden dark:bg-gray-800">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-full rounded-full transition-all duration-300" 
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          {/* Question display */}
          <Card className="border border-blue-100/50 bg-gradient-to-br from-blue-500/5 to-purple-500/5 dark:border-blue-900/30">
            <p className="text-lg font-medium leading-relaxed text-gray-900 dark:text-white">{current.question}</p>
          </Card>

          {/* Answer Input */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Your Answer</h3>
              <Button
                variant={listening ? "danger" : "secondary"}
                size="sm"
                onClick={toggleListening}
                className="flex items-center gap-1.5"
              >
                {listening ? <MicOff className="h-4 w-4 animate-pulse text-red-600" /> : <Mic className="h-4 w-4" />}
                {listening ? "Recording..." : "Answer by Voice"}
              </Button>
            </div>

            <textarea 
              value={answer} 
              onChange={(e) => setAnswer(e.target.value)} 
              rows={6}
              placeholder={listening ? "Listening to your voice... Speak clearly into your microphone." : "Type or speak your answer here..."}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900" 
            />

            <div className="mt-4 flex justify-between items-center">
              <Button onClick={submitAnswer} loading={evaluating} disabled={!answer.trim()}>
                Get AI Feedback
              </Button>

              {currentIdx < questions.length - 1 ? (
                <Button variant="secondary" onClick={nextQuestion} className="flex items-center gap-1">
                  Next Question <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={loadMore} loading={loadingMore} className="flex items-center gap-1">
                    Get More Questions
                  </Button>
                  <Button variant="outline" onClick={finishInterview} className="flex items-center gap-1.5">
                    Finish Practice <Award className="h-4 w-4" />
                  </Button>
                </div>
              )}

            </div>
          </Card>

          {/* AI Feedback */}
          {feedback && (
            <Card title="AI Feedback" className="border border-green-100/50 bg-gradient-to-br from-green-500/5 to-emerald-500/5 dark:border-green-900/20 animate-fade-in">
              <div className="mb-4 flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-lg font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-400">
                  {feedback.score as number}/10
                </div>
                <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{feedback.feedback as string}</p>
              </div>

              {Array.isArray(feedback.improvements) && feedback.improvements.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Key Areas for Improvement:</p>
                  <ul className="space-y-1.5">
                    {(feedback.improvements as string[]).map((s, i) => (
                      <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                        <span className="text-blue-500 mt-0.5">•</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {typeof feedback.sample_answer === "string" && feedback.sample_answer && (
                <div className="mt-5 rounded-xl bg-green-50/50 border border-green-100/30 p-4 text-sm dark:bg-green-950/10 dark:border-green-900/30">
                  <p className="font-semibold text-green-800 dark:text-green-400 mb-1.5">Sample Answer:</p>
                  <p className="text-green-700 dark:text-green-300 leading-relaxed">{feedback.sample_answer}</p>
                </div>
              )}
            </Card>
          )}
        </div>
      ) : null}
    </DashboardLayout>
  );
}
