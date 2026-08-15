"use client";

import Link from "next/link";
import { Sparkles, FileSearch, Mic, Target, ArrowRight, CheckCircle, Cpu } from "lucide-react";
import { Button } from "@/components/ui/Button";

const features = [
  { icon: FileSearch, title: "AI Resume Analyzer", desc: "Upload PDF/DOC resumes and get ATS scores, skill analysis, and improvement tips." },
  { icon: Mic, title: "Voice Career Coach", desc: "Talk to your AI coach for personalized career advice and 30-day action plans." },
  { icon: Target, title: "Skill Gap Prediction", desc: "Know your job readiness across DSA, Frontend, Backend, and System Design." },
  { icon: Cpu, title: "GPU-Accelerated AI Compute", desc: "Fast, scalable AI inference for resume analysis, interview prep, and voice tasks." },
];

const highlights = [
  "ATS-optimized resume builder",
  "Job description matching",
  "AI interview preparation",
  "GitHub profile analysis",
  "Application tracker with AI suggestions",
  "GPU-ready AI processing for fast analysis",
  "College placement dashboard",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900 dark:text-white">Resume Shortlist</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login"><Button variant="ghost">Sign In</Button></Link>
          <Link href="/signup"><Button>Get Started</Button></Link>
        </div>
      </nav>

      <section className="mx-auto max-w-7xl px-6 py-20 text-center">
        <div className="animate-fade-in">
          <span className="inline-block rounded-full bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-400">
            AI-Powered Placement Assistant
          </span>
          <h1 className="mt-6 text-5xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl">
            Your GPU-Powered<br /><span className="gradient-text">Resume Shortlist</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 dark:text-gray-400">
            Improve resumes, prepare for interviews, identify skill gaps, and receive personalized AI career guidance with GPU-accelerated compute for faster results.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="lg">Start Free <ArrowRight className="h-4 w-4" /></Button>
            </Link>
            <Link href="/login"><Button variant="secondary" size="lg">Sign In</Button></Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="glass-card animate-slide-up p-8">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/50">
                <Icon className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="glass-card p-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Everything you need for placement success</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {highlights.map((item) => (
              <div key={item} className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 shrink-0 text-green-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-200 py-8 text-center text-sm text-gray-500 dark:border-gray-800">
        Resume Shortlist — Intelligent Placement Assistant &copy; 2026
      </footer>
    </div>
  );
}
