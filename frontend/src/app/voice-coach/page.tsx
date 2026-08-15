"use client";

import { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Volume2, Send } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

interface Message {
  role: string;
  content: string;
}

export default function VoiceCoachPage() {
  const { token } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<number | undefined>();
  const [actionPlan, setActionPlan] = useState<string[]>([]);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SR) {
        const rec = new SR();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = "en-IN";
        rec.onresult = (e: SpeechRecognitionEvent) => {
          const transcript = e.results[0][0].transcript;
          setInput(transcript);
          setListening(false);
        };
        rec.onerror = () => setListening(false);
        rec.onend = () => setListening(false);
        recognitionRef.current = rec;
      }
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        setSpeaking(false);
      }
      recognitionRef.current.start();
      setListening(true);
    }
  };

  const speak = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const sendMessage = async (text?: string) => {
    const msg = text || input;
    if (!token || !msg.trim()) return;

    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setInput("");
    setLoading(true);

    try {
      const data = await api.voiceChat(token, { message: msg, conversation_id: conversationId }) as {
        conversation_id: number;
        reply: string;
        action_plan: string[];
      };
      setConversationId(data.conversation_id);
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      setActionPlan(data.action_plan || []);
      speak(data.reply);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I couldn't process that. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <Header title="AI Voice Career Coach" subtitle="Talk to your personal AI career mentor" />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="flex h-[600px] flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto p-2">
              {messages.length === 0 && (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <Mic className="mb-4 h-12 w-12 text-gray-300" />
                  <p className="text-gray-500">Start a conversation with your AI career coach</p>
                  <p className="mt-2 text-sm text-gray-400">Try: &quot;I am applying but not getting shortlisted&quot;</p>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                    m.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white"
                  }`}>
                    {m.content}
                    {m.role === "assistant" && (
                      <button onClick={() => speak(m.content)} className="ml-2 inline-flex opacity-60 hover:opacity-100">
                        <Volume2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-gray-100 px-4 py-3 dark:bg-gray-800">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="mt-4 flex items-center gap-2 border-t border-gray-200 pt-4 dark:border-gray-800">
              <button onClick={toggleListening}
                className={`rounded-xl p-3 transition-colors ${listening ? "bg-red-100 text-red-600 animate-pulse" : "bg-gray-100 text-gray-600 dark:bg-gray-800"}`}>
                {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
              <input value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Type or speak your message..."
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900" />
              <Button onClick={() => sendMessage()} disabled={!input.trim() || loading}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Voice Controls">
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
              <p>🎤 Click the mic button to use voice input</p>
              <p>🔊 Click the speaker icon on messages for text-to-speech</p>
              {speaking ? (
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <p className="font-medium text-blue-600 animate-pulse">Speaking...</p>
                  <Button size="xs" variant="outline" onClick={() => {
                    if (typeof window !== "undefined" && window.speechSynthesis) {
                      window.speechSynthesis.cancel();
                      setSpeaking(false);
                    }
                  }}>
                    Mute AI
                  </Button>
                </div>
              ) : (
                speaking && <p className="font-medium text-blue-600">Speaking...</p>
              )}
            </div>
          </Card>

          {actionPlan.length > 0 && (
            <Card title="Action Plan">
              <ol className="space-y-2">
                {actionPlan.map((step, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700 dark:bg-blue-950">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
