"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "./api";

interface User {
  id: number;
  email: string;
  role: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("token");
    if (saved) {
      api.me(saved)
        .then((u) => {
          setToken(saved);
          setUser(u);
        })
        .catch(() => localStorage.removeItem("token"))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const { access_token } = await api.login({ email, password });
    localStorage.setItem("token", access_token);
    setToken(access_token);
    setUser(await api.me(access_token));
  };

  const signup = async (email: string, password: string, name: string) => {
    const { access_token } = await api.signup({ email, password, name });
    localStorage.setItem("token", access_token);
    setToken(access_token);
    setUser(await api.me(access_token));
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
