"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { ScoreRing, SkillRadarChart } from "@/components/charts/Charts";
import {
  Sparkles, Mic, MicOff, Video, VideoOff, Volume2, VolumeX,
  Play, Pause, LogOut, FileText, Upload, History, Clock,
  ArrowLeft, RefreshCw, CheckCircle, AlertTriangle, BookOpen,
  ChevronRight, Award, Eye, Trash, MessageSquare, ShieldAlert
} from "lucide-react";

interface Question {
  category: string;
  subcategory: string;
  question: string;
}

interface AnswerDetail {
  answer: string;
  feedback?: {
    score: number;
    feedback: string;
    strengths?: string[];
    improvements?: string[];
    sample_answer?: string;
  };
}

export default function InterviewPage() {
  const { token } = useAuth();

  // Navigation & Mode States
  // 'landing' | 'interview' | 'loading_report' | 'report'
  const [mode, setMode] = useState<"landing" | "interview" | "loading_report" | "report">("landing");

  // Setup Form States
  const [jobRole, setJobRole] = useState("Software Engineer");
  const [interviewType, setInterviewType] = useState("mixed");
  const [difficulty, setDifficulty] = useState("medium");
  const [selectedResumeId, setSelectedResumeId] = useState<number | null>(null);

  // Data Lists
  const [resumes, setResumes] = useState<any[]>([]);
  const [resumesLoading, setResumesLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Active Session Details
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [finishedLoading, setFinishedLoading] = useState(false);

  // Audio/Video Hardware Toggles
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [speechVolume, setSpeechVolume] = useState(true);
  const [listening, setListening] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);

  // Webcam Streams
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Timers (10 Minutes Total)
  const [timerSeconds, setTimerSeconds] = useState(600);
  const recognitionRef = useRef<any>(null);

  // Final Report Data
  const [report, setReport] = useState<any>(null);
  const [selectedSessionDetails, setSelectedSessionDetails] = useState<any>(null);

  // Initial Load (Resumes & Previous Sessions)
  useEffect(() => {
    if (token) {
      loadResumes();
      loadHistory();
    }
  }, [token]);

  // Load Resumes
  const loadResumes = async () => {
    if (!token) return;
    setResumesLoading(true);
    try {
      const list = await api.listResumes(token);
      setResumes(list);
    } catch (err) {
      console.error("Error loading resumes:", err);
    } finally {
      setResumesLoading(false);
    }
  };

  // Load Interview History
  const loadHistory = async () => {
    if (!token) return;
    setHistoryLoading(true);
    try {
      const list = await api.listInterviewSessions(token);
      setHistory(list);
    } catch (err) {
      console.error("Error loading interview history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Upload Resume on landing page
  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    setUploading(true);
    try {
      const uploaded = await api.uploadResume(token, file);
      setResumes((prev) => [uploaded, ...prev]);
      setSelectedResumeId(uploaded.id);
    } catch (err: any) {
      alert("Resume upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  // Trigger file selection
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Manage Web Camera Stream
  useEffect(() => {
    if (mode === "interview" && cameraEnabled && !paused) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then((stream) => {
          streamRef.current = stream;
          setVideoStream(stream);
        })
        .catch((err) => {
          console.warn("Could not acquire video and audio stream, trying video only...", err);
          navigator.mediaDevices.getUserMedia({ video: true })
            .then((stream) => {
              streamRef.current = stream;
              setVideoStream(stream);
            })
            .catch((videoErr) => {
              console.error("Camera access failed:", videoErr);
            });
        });
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setVideoStream(null);
      }
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [mode, cameraEnabled, paused]);

  // Manage binding of videoStream to the video element
  useEffect(() => {
    if (videoRef.current && videoStream) {
      videoRef.current.srcObject = videoStream;
    }
  }, [videoStream]);

  // Handle Speech Recognition Setup & Updates
  const toggleListening = () => {
    if (listening) {
      stopListening();
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please type your answer.");
      return;
    }

    // Cancel ongoing speech synthesis if user starts speaking
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setAiSpeaking(false);
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = "en-US";

    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onerror = (e: any) => {
      console.error(e);
      setListening(false);
    };
    rec.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      setAnswer((prev) => (prev ? prev + " " + transcript : transcript));
    };

    recognitionRef.current = rec;
    rec.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setListening(false);
  };

  // Helper to find female voice matching the avatar image
  const getFemaleVoice = (voices: SpeechSynthesisVoice[]) => {
    const femaleVoiceNames = ["female", "zira", "hazel", "samantha", "karen", "victoria", "moira", "tessa", "susan", "siri", "jessa"];
    return voices.find(
      (v) => v.lang.startsWith("en") && femaleVoiceNames.some(name => v.name.toLowerCase().includes(name))
    ) || voices.find(
      (v) => v.lang.startsWith("en") && (v.name.includes("Google") || v.name.includes("Natural"))
    ) || voices.find((v) => v.lang.startsWith("en"));
  };

  // Handle Speech Synthesis (Speak Question)
  const speakQuestionText = (text: string) => {
    if (!speechVolume || paused) return;
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = getFemaleVoice(voices);

      if (preferredVoice) utterance.voice = preferredVoice;
      utterance.rate = 0.95;
      utterance.pitch = 1.0;

      utterance.onstart = () => setAiSpeaking(true);
      utterance.onend = () => setAiSpeaking(false);
      utterance.onerror = () => setAiSpeaking(false);

      window.speechSynthesis.speak(utterance);
    }
  };

  // Toggling Timer Interval
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (mode === "interview" && !paused) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            handleEndInterview();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [mode, paused]);

  // Read first question on session start
  useEffect(() => {
    if (mode === "interview" && questions.length > 0 && currentIdx === 0) {
      // Small timeout to allow voices to load
      const timeout = setTimeout(() => {
        speakQuestionText(questions[0].question);
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [mode, questions]);

  // Start Session Request
  const startSession = async () => {
    if (!token) return;

    // Synchronously unlock SpeechSynthesis context in the click event stack
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const unlockUtterance = new SpeechSynthesisUtterance("Preparing interview room. Please wait.");
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = getFemaleVoice(voices);
      if (preferredVoice) unlockUtterance.voice = preferredVoice;
      unlockUtterance.rate = 1.0;
      unlockUtterance.volume = 0.5;
      window.speechSynthesis.speak(unlockUtterance);
    }

    setEvaluating(true);
    setTimerSeconds(600); // 10 minutes
    setQuestions([]);
    setCurrentIdx(0);
    setAnswer("");
    setReport(null);
    setPaused(false);
    try {
      const data: any = await api.generateInterview(token, {
        target_role: jobRole,
        resume_id: selectedResumeId || undefined,
        interview_type: interviewType,
        difficulty: difficulty,
      });
      setSessionId(data.session_id);
      setQuestions(data.questions);
      setMode("interview");
    } catch (err: any) {
      alert("Failed to start interview: " + err.message);
    } finally {
      setEvaluating(false);
    }
  };

  // Submit current answer and get next question
  const submitAnswer = async () => {
    if (!token || sessionId === null || !answer.trim()) return;
    stopListening();
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setAiSpeaking(false);
    }

    setEvaluating(true);
    try {
      const data = await api.evaluateAnswer(token, {
        session_id: sessionId,
        question_index: currentIdx,
        answer: answer.trim(),
      });

      if (data.completed) {
        // Complete state reached
        handleEndInterview();
      } else if (data.next_question) {
        // Append question and advance
        setQuestions((prev) => {
          const updated = [...prev];
          if (updated.length <= currentIdx + 1) {
            updated.push(data.next_question as Question);
          } else {
            updated[currentIdx + 1] = data.next_question as Question;
          }
          return updated;
        });
        setCurrentIdx((prev) => prev + 1);
        setAnswer("");
        speakQuestionText(data.next_question.question);
      }
    } catch (err: any) {
      alert("Failed to submit answer: " + err.message);
    } finally {
      setEvaluating(false);
    }
  };

  // End Interview manually or automatically
  const handleEndInterview = async () => {
    if (!token || sessionId === null) return;
    stopListening();
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setAiSpeaking(false);
    }

    setMode("loading_report");
    setFinishedLoading(true);

    try {
      const elapsedSeconds = 600 - timerSeconds;
      const finalReport = await api.finishInterview(token, {
        session_id: sessionId,
        duration_seconds: elapsedSeconds,
      });
      setReport(finalReport);
      setMode("report");
      loadHistory(); // reload history lists
    } catch (err: any) {
      alert("Error finalizing report: " + err.message);
      setMode("landing");
    } finally {
      setFinishedLoading(false);
    }
  };

  // View historical report details
  const viewHistoryReport = async (sessId: number) => {
    if (!token) return;
    setHistoryLoading(true);
    try {
      const details = await api.getInterviewSession(token, sessId);
      setSelectedSessionDetails(details);
      setReport(details.feedback?.report || null);
      setQuestions(details.questions || []);
      // Map feedback evaluations back into a structured array
      const restoredAnswers = (details.answers || []).map((ans: any, idx: number) => {
        const evalFeedback = details.feedback?.evaluations?.[String(idx)] || ans.feedback;
        return {
          answer: ans.answer || "",
          feedback: evalFeedback
        };
      });
      setSelectedSessionDetails({
        ...details,
        restoredAnswers
      });
      setMode("report");
    } catch (err: any) {
      alert("Failed to fetch session report: " + err.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Exit Report and reset
  const backToDashboard = () => {
    setMode("landing");
    setSessionId(null);
    setQuestions([]);
    setCurrentIdx(0);
    setAnswer("");
    setReport(null);
    setSelectedSessionDetails(null);
  };

  // Format Elapsed Timer
  const formatTime = (secs: number) => {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  // Format Duration Elapsed in Report
  const formatDuration = (secs: number) => {
    const min = Math.floor(secs / 60);
    const sec = secs % 60;
    if (min === 0) return `${sec}s`;
    return `${min}m ${sec}s`;
  };

  // Dynamic waveform helper values
  const waveformBars = 11;

  // Colors for roles and types
  const getBadgeStyles = (val: string) => {
    const str = val.toLowerCase();
    if (str.includes("tech") || str.includes("frontend") || str.includes("backend") || str.includes("stack") || str.includes("software")) {
      return "bg-blue-50 text-blue-700 border-blue-100/50 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/30";
    }
    if (str.includes("hr") || str.includes("behavior") || str.includes("manager")) {
      return "bg-purple-50 text-purple-700 border-purple-100/50 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/30";
    }
    if (str.includes("easy")) {
      return "bg-green-50 text-green-700 border-green-100/50 dark:bg-green-950/40 dark:text-green-400 dark:border-green-900/30";
    }
    if (str.includes("hard")) {
      return "bg-red-50 text-red-700 border-red-100/50 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/30";
    }
    return "bg-gray-50 text-gray-700 border-gray-100/50 dark:bg-gray-950/40 dark:text-gray-400 dark:border-gray-900/30";
  };

  return (
    <DashboardLayout>
      <Header
        title="AI Mock Interview Room"
        subtitle="Harness deep neural evaluation to simulate real-world recruiter assessments"
      />

      <div className="mx-auto max-w-6xl space-y-8">
        <AnimatePresence mode="wait">
          {/* LANDING MODE PAGE */}
          {mode === "landing" && (
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="grid gap-8 lg:grid-cols-3"
            >
              {/* Configuration Panel */}
              <div className="space-y-6 lg:col-span-2">
                <Card
                  title="Configure Mock Session"
                  description="Choose your parameters to build a customized, dynamic recruiter simulator."
                  className="bg-white/90 backdrop-blur"
                >
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Target Job Role
                      </label>
                      <select
                        value={jobRole}
                        onChange={(e) => setJobRole(e.target.value)}
                        className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white dark:border-gray-800 dark:bg-gray-950 dark:focus:border-blue-500"
                      >
                        <option value="Software Engineer">Software Engineer</option>
                        <option value="Frontend Developer">Frontend Developer</option>
                        <option value="Backend Developer">Backend Developer</option>
                        <option value="Full Stack Developer">Full Stack Developer</option>
                        <option value="Data Analyst">Data Analyst</option>
                        <option value="Business Analyst">Business Analyst</option>
                        <option value="Product Manager">Product Manager</option>
                        <option value="Other">Other Role</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Interview Type
                      </label>
                      <select
                        value={interviewType}
                        onChange={(e) => setInterviewType(e.target.value)}
                        className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white dark:border-gray-800 dark:bg-gray-950 dark:focus:border-blue-500"
                      >
                        <option value="mixed">Mixed (General)</option>
                        <option value="technical">Technical Focus</option>
                        <option value="hr">HR & Soft Skills</option>
                        <option value="behavioral">Behavioral (STAR Method)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Interview Difficulty
                      </label>
                      <select
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value)}
                        className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white dark:border-gray-800 dark:bg-gray-950 dark:focus:border-blue-500"
                      >
                        <option value="easy">Easy (Fundamentals)</option>
                        <option value="medium">Medium (Standard)</option>
                        <option value="hard">Hard (Deep & Challenging)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex justify-between items-center">
                        <span>Select Resume context</span>
                        {uploading && (
                          <span className="text-[10px] text-blue-500 animate-pulse">Uploading...</span>
                        )}
                      </label>
                      <div className="mt-2 flex gap-2">
                        <select
                          value={selectedResumeId || ""}
                          onChange={(e) => setSelectedResumeId(Number(e.target.value) || null)}
                          disabled={resumesLoading}
                          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white disabled:opacity-60 dark:border-gray-800 dark:bg-gray-950 dark:focus:border-blue-500"
                        >
                          <option value="">No Resume (General Questions)</option>
                          {resumes.map((res) => (
                            <option key={res.id} value={res.id}>
                              {res.filename} (ATS: {res.ats_score.toFixed(0)})
                            </option>
                          ))}
                        </select>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleResumeUpload}
                          accept=".pdf,.docx,.doc"
                          className="hidden"
                        />
                        <button
                          onClick={triggerFileInput}
                          type="button"
                          className="inline-flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600 dark:border-gray-800 dark:bg-gray-950 dark:hover:bg-gray-900 dark:text-gray-400"
                          title="Upload new resume"
                        >
                          <Upload className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 border-t border-gray-150 pt-6 dark:border-gray-800 flex justify-end">
                    <Button
                      onClick={startSession}
                      loading={evaluating}
                      size="lg"
                      className="px-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg transition duration-200 shadow-md"
                    >
                      <Sparkles className="h-4 w-4 mr-2" /> Start Mock Interview
                    </Button>
                  </div>
                </Card>
              </div>

              {/* Sidebar Info Card */}
              <div className="space-y-6">
                <Card className="bg-gradient-to-br from-blue-600/5 to-purple-600/5 border-blue-500/10">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <h4 className="mt-4 text-base font-bold text-gray-900 dark:text-white">AI-Driven Simulator</h4>
                  <p className="mt-2 text-sm text-gray-600 leading-relaxed dark:text-gray-400">
                    Unlike standard linear assessments, Antigravity AI listens to your responses dynamically. It analyzes your design choices, raises question complexities for great answers, simplifies them when you struggle, and asks logical follow-ups.
                  </p>
                </Card>
              </div>

              {/* Previous History logs */}
              <div className="lg:col-span-3">
                <Card
                  title="Practice History"
                  description="Review your performance metrics over previous evaluations to map your progression."
                >
                  {historyLoading && history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 space-y-4">
                      <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
                      <p className="text-sm text-gray-500">Loading history logs...</p>
                    </div>
                  ) : history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-gray-200 rounded-2xl dark:border-gray-800">
                      <History className="h-10 w-10 text-gray-300 dark:text-gray-700" />
                      <h4 className="mt-4 text-sm font-bold text-gray-900 dark:text-white">No Previous Practice Sessions</h4>
                      <p className="mt-1 text-xs text-gray-500 max-w-sm">
                        Create a configured session above to start practice. Your completed interviews will show up here.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-gray-250/60 dark:border-gray-800">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-gray-950 text-gray-500 font-semibold border-b border-gray-250/60 dark:border-gray-800">
                            <th className="p-4">Date</th>
                            <th className="p-4">Role</th>
                            <th className="p-4">Type</th>
                            <th className="p-4">Difficulty</th>
                            <th className="p-4 text-center">Score</th>
                            <th className="p-4 text-center">Duration</th>
                            <th className="p-4 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-150 dark:divide-gray-800">
                          {history.map((sess) => (
                            <tr key={sess.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30">
                              <td className="p-4 font-medium text-gray-900 dark:text-white">
                                {new Date(sess.created_at).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric"
                                })}
                              </td>
                              <td className="p-4 text-gray-700 dark:text-gray-300 font-medium">
                                {sess.target_role}
                              </td>
                              <td className="p-4">
                                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold capitalize ${getBadgeStyles(sess.interview_type)}`}>
                                  {sess.interview_type}
                                </span>
                              </td>
                              <td className="p-4">
                                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold capitalize ${getBadgeStyles(sess.difficulty)}`}>
                                  {sess.difficulty}
                                </span>
                              </td>
                              <td className="p-4 text-center font-bold">
                                {sess.score !== null ? (
                                  <span className={sess.score >= 75 ? "text-green-600 dark:text-green-400" : sess.score >= 50 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"}>
                                    {sess.score}%
                                  </span>
                                ) : (
                                  <span className="text-gray-400 font-normal">Unfinished</span>
                                )}
                              </td>
                              <td className="p-4 text-center text-gray-500">
                                {sess.duration_seconds ? formatDuration(sess.duration_seconds) : "-"}
                              </td>
                              <td className="p-4 text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => viewHistoryReport(sess.id)}
                                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                >
                                  <Eye className="h-4 w-4 mr-1.5" /> View Report
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              </div>
            </motion.div>
          )}

          {/* DYNAMIC INTERVIEW CONFERENCE ROOM */}
          {mode === "interview" && (
            <motion.div
              key="interview"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-6"
            >
              {/* Top Meta Details bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-4 shadow-sm border border-gray-150 dark:bg-gray-900/60 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  <span className="flex h-3 w-3 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    Live Simulator — {jobRole}
                  </span>
                  <span className="hidden sm:inline text-xs text-gray-400 border-l border-gray-200 pl-3 capitalize dark:border-gray-800">
                    Difficulty: {difficulty}
                  </span>
                </div>

                <div className="flex items-center gap-6">
                  {/* Timer Display */}
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span>Time Remaining:</span>
                    <span className="font-mono font-bold text-gray-900 dark:text-white">
                      {formatTime(timerSeconds)}
                    </span>
                  </div>

                  {/* Progress tracker */}
                  <div className="text-sm text-gray-500 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                    <span>Question</span>
                    <span className="font-bold text-gray-900 dark:text-white">{currentIdx + 1}</span>
                    <span className="text-xs text-gray-400 font-mono">(Infinite Mode)</span>
                  </div>
                </div>
              </div>

              {/* Progress Line */}
              <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden dark:bg-gray-800">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-full rounded-full transition-all duration-500 ease-out shadow-[0_0_8px_rgba(59,130,246,0.3)]"
                  style={{ width: `${Math.min(((currentIdx + 1) / 5) * 100, 100)}%` }}
                />
              </div>              {/* Grid: AI Interviewer Video vs User Camera Preview */}
              <div className="grid gap-6 md:grid-cols-3">
                {/* Left Side: AI Screen & Current Question */}
                <div className="md:col-span-2 flex flex-col gap-6">
                  {/* Large AI Interviewer Screen */}
                  <div className="relative aspect-video rounded-3xl bg-gray-950 overflow-hidden border border-gray-850 shadow-2xl flex flex-col items-center justify-center p-6 text-center">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.08)_0%,transparent_70%)]" />

                    {/* Glowing AI Avatar & Waveform Visualizer */}
                    <div className="relative flex flex-col items-center justify-center space-y-4">
                      {/* The Avatar Container */}
                      <div className="relative h-44 w-44 rounded-full border-2 border-blue-500/20 bg-gray-900 overflow-hidden shadow-[0_0_40px_rgba(59,130,246,0.25)]">
                        {/* Avatar Image */}
                        <img
                          src="/ai_interviewer_avatar.jpg"
                          alt="AI Recruiter"
                          className="h-full w-full object-cover transition duration-300"
                          style={{ filter: aiSpeaking ? "brightness(1.08) contrast(1.03)" : "brightness(0.92)" }}
                        />

                        {/* Glowing Overlay when speaking */}
                        <AnimatePresence>
                          {aiSpeaking && (
                            <motion.div
                              className="absolute inset-0 border-4 border-blue-500/80 rounded-full"
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: [0.3, 0.8, 0.3], scale: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                            />
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Waveform Visualizer below the avatar */}
                      <div className="flex items-center justify-center gap-1.5 h-8 w-44">
                        {[...Array(waveformBars)].map((_, i) => (
                          <motion.div
                            key={i}
                            className="w-1.5 rounded-full bg-gradient-to-t from-blue-400 to-purple-500"
                            animate={
                              aiSpeaking
                                ? { height: [8, 32, 8] }
                                : { height: 4 }
                            }
                            transition={
                              aiSpeaking
                                ? {
                                    duration: 0.8,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                    delay: i * 0.08,
                                  }
                                : { duration: 0.2 }
                            }
                          />
                        ))}
                      </div>
                    </div>

                    {/* Label Indicator */}
                    <div className="mt-6 z-10">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold text-gray-300 border border-gray-800">
                        <span className={`h-1.5 w-1.5 rounded-full ${aiSpeaking ? "bg-blue-500 animate-ping" : "bg-gray-500"}`} />
                        {aiSpeaking ? "Interviewer is Speaking" : "Interviewer is Listening"}
                      </span>
                    </div>
                  </div>

                  {/* Dedicated Current Question Card (Separated to prevent any overlay issues) */}
                  <Card className="bg-gradient-to-br from-blue-500/5 to-purple-500/5 border-blue-100/30">
                    <p className="text-xs font-semibold text-blue-500 uppercase tracking-widest">Current Question</p>
                    <p className="mt-2 text-base text-gray-900 dark:text-white leading-relaxed font-medium">
                      {questions[currentIdx]?.question || "Generating first question..."}
                    </p>
                  </Card>
                </div>

                {/* Candidate Video Preview (Webcam feed) */}
                <div className="flex flex-col gap-6">
                  <div className="relative aspect-video md:aspect-square rounded-3xl bg-gray-900 overflow-hidden border border-gray-200 shadow-xl dark:border-gray-800">
                    {cameraEnabled && videoStream ? (
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="h-full w-full object-cover scale-x-[-1]" // mirror effect
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600">
                          <VideoOff className="h-6 w-6" />
                        </div>
                        <p className="mt-3 text-sm font-bold text-gray-700 dark:text-gray-300">Camera Feed is Disabled</p>
                        <p className="text-xs text-gray-400 mt-0.5">Toggle video below to enable your camera preview</p>
                      </div>
                    )}

                    {/* Microphone status overlay */}
                    {!micEnabled && (
                      <div className="absolute top-3 left-3 bg-red-600/90 text-white rounded-lg p-1.5 shadow-md flex items-center justify-center">
                        <MicOff className="h-3.5 w-3.5" />
                      </div>
                    )}
                    
                    {/* User Label badge */}
                    <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-0.5 rounded-md border border-white/10">
                      Candidate (You)
                    </div>
                  </div>

                  {/* Room controls Card */}
                  <Card className="bg-white/95 backdrop-blur py-4 flex flex-col gap-3 items-center">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setCameraEnabled(!cameraEnabled)}
                        className={`flex h-11 w-11 items-center justify-center rounded-xl transition duration-200 ${
                          cameraEnabled
                            ? "bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                            : "bg-red-500 hover:bg-red-600 text-white"
                        }`}
                        title={cameraEnabled ? "Turn video off" : "Turn video on"}
                      >
                        {cameraEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                      </button>

                      <button
                        onClick={toggleListening}
                        className={`flex h-11 w-11 items-center justify-center rounded-xl transition duration-200 ${
                          listening
                            ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                            : "bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                        }`}
                        title={listening ? "Stop Speech-to-Text" : "Record by voice"}
                      >
                        {listening ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                      </button>

                      <button
                        onClick={() => setSpeechVolume(!speechVolume)}
                        className={`flex h-11 w-11 items-center justify-center rounded-xl transition duration-200 ${
                          speechVolume
                            ? "bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                            : "bg-orange-500 hover:bg-orange-600 text-white"
                        }`}
                        title={speechVolume ? "Mute AI speech synthesis" : "Unmute AI speech synthesis"}
                      >
                        {speechVolume ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                      </button>

                      <button
                        onClick={() => setPaused(!paused)}
                        className={`flex h-11 w-11 items-center justify-center rounded-xl transition duration-200 ${
                          paused
                            ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                            : "bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                        }`}
                        title={paused ? "Resume Session" : "Pause Session"}
                      >
                        {paused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                      </button>
                    </div>

                    <button
                      onClick={handleEndInterview}
                      className="w-full mt-2 border border-red-200 hover:bg-red-50 hover:text-red-700 text-red-600 rounded-xl py-2 font-semibold text-xs tracking-wider uppercase transition dark:border-red-950/40 dark:hover:bg-red-950/20"
                    >
                      End Practice Session
                    </button>
                  </Card>
                </div>
              </div>

              {/* Textarea answer input and Speech details */}
              <Card className="bg-white">
                <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-3 dark:border-gray-800">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">Your Answer</h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      You can type your answer or click the mic button to speak. Edit the transcript before submitting.
                    </p>
                  </div>

                  <Button
                    variant={listening ? "danger" : "secondary"}
                    size="sm"
                    onClick={toggleListening}
                    disabled={paused}
                    className="flex items-center gap-1.5 font-semibold"
                  >
                    {listening ? (
                      <>
                        <MicOff className="h-4 w-4 text-white animate-pulse" />
                        <span>Recording (Click to stop)</span>
                      </>
                    ) : (
                      <>
                        <Mic className="h-4 w-4 text-blue-600" />
                        <span>Answer by Voice</span>
                      </>
                    )}
                  </Button>
                </div>

                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  disabled={paused}
                  rows={6}
                  placeholder={
                    paused
                      ? "Interview is currently paused. Resume to input or speak your response."
                      : listening
                      ? "Listening carefully... Speak into your microphone and click stop when you are done."
                      : "Type your detailed answer here, or click 'Answer by Voice' to speak..."
                  }
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm leading-relaxed outline-none focus:border-blue-500 focus:bg-white disabled:opacity-60 transition dark:border-gray-800 dark:bg-gray-950 dark:focus:border-blue-500"
                />

                <div className="mt-4 flex justify-between items-center">
                  <div className="flex gap-2">
                    {questions[currentIdx]?.question && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => speakQuestionText(questions[currentIdx].question)}
                        disabled={paused}
                      >
                        <Volume2 className="h-4 w-4 mr-1.5 text-blue-500" /> Repeat Question
                      </Button>
                    )}
                  </div>

                  <Button
                    onClick={submitAnswer}
                    loading={evaluating}
                    disabled={!answer.trim() || paused}
                    className="px-8 font-semibold bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl shadow"
                  >
                    Submit Response <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}

          {/* REPORT LOADING STATE */}
          {mode === "loading_report" && (
            <motion.div
              key="loading_report"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 text-center space-y-6"
            >
              <div className="relative h-20 w-20">
                <div className="absolute inset-0 rounded-full border-4 border-blue-500/10" />
                <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Analyzing Session Feedback</h2>
              <p className="text-gray-500 max-w-sm leading-relaxed">
                Antigravity AI is evaluating your technical accuracy, communication structure, confidence markers, and project design trade-offs.
              </p>
            </motion.div>
          )}

          {/* DETAILED PERFORMANCE REPORT DASHBOARD */}
          {mode === "report" && report && (
            <motion.div
              key="report"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              {/* Back to landing */}
              <div className="flex items-center justify-between border-b border-gray-150 pb-4 dark:border-gray-800">
                <button
                  onClick={backToDashboard}
                  className="inline-flex items-center text-sm font-semibold text-gray-600 hover:text-gray-900 transition dark:text-gray-400 dark:hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
                </button>

                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Report Summary for {selectedSessionDetails?.target_role || jobRole}
                </h3>
              </div>

              {/* Top Summary Cards */}
              <div className="grid gap-6 md:grid-cols-3">
                {/* Score Circular ring */}
                <Card className="flex flex-col items-center justify-center p-8 bg-gradient-to-b from-white to-gray-50/50">
                  <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Overall Score</h4>
                  <ScoreRing score={report.overall_score || 80} label="Performance Score" />
                </Card>

                {/* Radar spider chart */}
                <Card className="md:col-span-2">
                  <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Skill Dimension Breakdown</h4>
                  <div className="flex items-center justify-center min-h-[300px]">
                    <SkillRadarChart
                      data={[
                        { skill: "Technical Knowledge", score: report.categories?.technical_knowledge || 75 },
                        { skill: "Problem Solving", score: report.categories?.problem_solving || 80 },
                        { skill: "Communication", score: report.categories?.communication || 70 },
                        { skill: "Confidence", score: report.categories?.confidence || 75 },
                        { skill: "Project Knowledge", score: report.categories?.project_knowledge || 85 },
                        { skill: "Answer Quality", score: report.categories?.answer_quality || 80 },
                      ]}
                    />
                  </div>
                </Card>
              </div>

              {/* Feedbacks Grid */}
              <div className="grid gap-6 md:grid-cols-3">
                {/* Strengths Card */}
                <Card className="border-green-150 bg-green-500/5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10 text-green-600 dark:bg-green-950/40 dark:text-green-400">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <h4 className="mt-4 text-base font-bold text-green-800 dark:text-green-400">Strengths</h4>
                  <ul className="mt-4 space-y-3">
                    {(report.strengths || [
                      "Good understanding of fundamental technical concepts",
                      "Clear explanation of project goals and implementation",
                      "Methodical approach to problem-solving questions"
                    ]).map((str: string, i: number) => (
                      <li key={i} className="text-sm text-gray-700 leading-relaxed flex items-start gap-2.5 dark:text-gray-300">
                        <span className="text-green-500 mt-1 shrink-0">•</span>
                        <span>{str}</span>
                      </li>
                    ))}
                  </ul>
                </Card>

                {/* Areas to Improve */}
                <Card className="border-orange-150 bg-orange-500/5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <h4 className="mt-4 text-base font-bold text-orange-800 dark:text-orange-400">Areas to Improve</h4>
                  <ul className="mt-4 space-y-3">
                    {(report.improvements || [
                      "Elaborate more on design tradeoffs rather than just the final solution",
                      "Try to structure behavioral answers using the STAR method",
                      "Provide more database normalization and indexing detail"
                    ]).map((imp: string, i: number) => (
                      <li key={i} className="text-sm text-gray-700 leading-relaxed flex items-start gap-2.5 dark:text-gray-300">
                        <span className="text-orange-500 mt-1 shrink-0">•</span>
                        <span>{imp}</span>
                      </li>
                    ))}
                  </ul>
                </Card>

                {/* Recommended Practice */}
                <Card className="border-blue-150 bg-blue-500/5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <h4 className="mt-4 text-base font-bold text-blue-800 dark:text-blue-400">Recommended Practice</h4>
                  <ul className="mt-4 space-y-3">
                    {(report.practice || [
                      "Practice standard Data Structures and Algorithms (DSA) questions",
                      "Practice Database Management Systems (DBMS) queries and concepts",
                      "Practice mock Behavioral interviews to build structural responses"
                    ]).map((prac: string, i: number) => (
                      <li key={i} className="text-sm text-gray-700 leading-relaxed flex items-start gap-2.5 dark:text-gray-300">
                        <span className="text-blue-500 mt-1 shrink-0">•</span>
                        <span>{prac}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>

              {/* Question-by-Question breakdown logs */}
              <Card title="Question Breakdown Review" description="Deconstruct each conversation exchange, score rating, and model sample response.">
                <div className="mt-6 space-y-6">
                  {questions.map((q, idx) => {
                    const ansItem: AnswerDetail = selectedSessionDetails?.restoredAnswers?.[idx] || selectedSessionDetails?.answers?.[idx] || {};
                    const score = ansItem.feedback?.score || 0;
                    
                    return (
                      <div
                        key={idx}
                        className="rounded-2xl border border-gray-150 bg-gray-50/50 p-6 space-y-4 dark:border-gray-800 dark:bg-gray-900/20"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-150 pb-3 dark:border-gray-800">
                          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                            Exchange {idx + 1} — {q.category} ({q.subcategory})
                          </span>
                          <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold ${
                            score >= 8
                              ? "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400"
                              : score >= 5
                              ? "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400"
                              : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                          }`}>
                            Score: {score}/10
                          </span>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Question Asked</p>
                          <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white leading-relaxed">
                            {q.question}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Your Submitted Response</p>
                          <p className="mt-1 text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-mono whitespace-pre-wrap">
                            {ansItem.answer || "No response provided."}
                          </p>
                        </div>

                        {ansItem.feedback && (
                          <div className="grid gap-4 md:grid-cols-2 border-t border-gray-150 pt-4 dark:border-gray-800">
                            <div>
                              <p className="text-xs font-semibold text-blue-500 uppercase tracking-widest flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" /> Coach Feedback
                              </p>
                              <p className="mt-1.5 text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                                {ansItem.feedback.feedback}
                              </p>
                            </div>

                            {ansItem.feedback.sample_answer && (
                              <div className="rounded-xl border border-green-200/50 bg-green-500/5 p-3 dark:border-green-900/30">
                                <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-widest">
                                  Model Sample Response
                                </p>
                                <p className="mt-1 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                                  {ansItem.feedback.sample_answer}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Practice Again / Restart CTAs */}
              <div className="flex justify-between items-center pt-4">
                <Button variant="secondary" onClick={backToDashboard} size="lg">
                  Back to Dashboard
                </Button>
                <Button
                  onClick={startSession}
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl"
                >
                  <Sparkles className="h-4 w-4 mr-2" /> Start Another Session
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
