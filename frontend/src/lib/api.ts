const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export interface Application {
  id: number;
  company_name: string;
  role: string;
  applied_date: string;
  status: string;
  notes: string;
  ai_suggestions: string[];
}

export interface ResumeAnalysis {
  id: number;
  filename: string;
  ats_score: number;
  quality_score: number;
  extracted_data: Record<string, unknown>;
  analysis: Record<string, unknown>;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, err.detail || "Request failed");
  }

  return res.json();
}

export const api = {
  signup: (data: { email: string; password: string; name: string }) =>
    request<{ access_token: string }>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    request<{ access_token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  me: (token: string) =>
    request<{ id: number; email: string; role: string; name: string }>(
      "/auth/me",
      {},
      token
    ),

  getProfile: (token: string) =>
    request<Record<string, unknown>>("/profile", {}, token),
  updateProfile: (token: string, data: Record<string, unknown>) =>
    request("/profile", { method: "PUT", body: JSON.stringify(data) }, token),

  uploadResume: (token: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<ResumeAnalysis>("/resume/upload", { method: "POST", body: form }, token);
  },

  listResumes: (token: string) =>
    request<Array<{ ats_score: number; quality_score: number; [key: string]: unknown }>>("/resume/list", {}, token),
  getResume: (token: string, id: number) =>
    request(`/resume/${id}`, {}, token),
  buildResume: (token: string, data: Record<string, unknown>) =>
    request("/resume/build", { method: "POST", body: JSON.stringify(data) }, token),
  matchJob: (token: string, data: { job_description: string; resume_id?: number }) =>
    request("/resume/match", { method: "POST", body: JSON.stringify(data) }, token),

  generateInterview: (token: string, data: { target_role?: string; resume_id?: number }) =>
    request("/interview/generate", { method: "POST", body: JSON.stringify(data) }, token),
  evaluateAnswer: (token: string, data: { session_id: number; question_index: number; answer: string }) =>
    request("/interview/evaluate", { method: "POST", body: JSON.stringify(data) }, token),
  moreInterviewQuestions: (token: string, data: { session_id: number }) =>
    request("/interview/more", { method: "POST", body: JSON.stringify(data) }, token),
  listInterviewSessions: (token: string) =>
    request("/interview/sessions", {}, token),


  voiceChat: (token: string, data: { message: string; conversation_id?: number }) =>
    request("/voice/chat", { method: "POST", body: JSON.stringify(data) }, token),
  listConversations: (token: string) =>
    request("/voice/conversations", {}, token),
  getConversation: (token: string, id: number) =>
    request(`/voice/conversations/${id}`, {}, token),

  analyzeGithub: (token: string, username?: string) =>
    request(`/github/analyze?username=${username || ""}`, { method: "POST" }, token),

  assessSkills: (token: string) =>
    request("/skills/assess", { method: "POST" }, token),
  skillHistory: (token: string) =>
    request("/skills/history", {}, token),

  listApplications: (token: string) =>
    request<Application[]>("/applications", {}, token),
  createApplication: (token: string, data: { company_name: string; role: string; notes?: string }) =>
    request("/applications", { method: "POST", body: JSON.stringify(data) }, token),
  updateApplication: (token: string, id: number, data: { status?: string; notes?: string }) =>
    request(`/applications/${id}`, { method: "PUT", body: JSON.stringify(data) }, token),
  deleteApplication: (token: string, id: number) =>
    request(`/applications/${id}`, { method: "DELETE" }, token),

  adminDashboard: (token: string) =>
    request<Record<string, unknown>>("/admin/dashboard", {}, token),
  adminStudents: (token: string) =>
    request<Array<Record<string, unknown>>>("/admin/students", {}, token),
};
