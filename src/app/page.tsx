"use client";

// ============================================================
// DERIVION CRM - LOGIN PAGE
// Ported from index.html + script.js
// ============================================================

import { useState, useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { API_BASE_URL } from "@/lib/config";
import { getToken, isTokenExpired, saveLoginData, refreshAccessToken } from "@/lib/auth";

// "/?session=expired" is set by expireSession(); read without a setState-in-effect (server snapshot: false).
const noSubscribe = () => () => {};
const readSessionExpired = () => new URLSearchParams(window.location.search).get("session") === "expired";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginMessage, setLoginMessage] = useState("");
  const sessionExpired = useSyncExternalStore(noSubscribe, readSessionExpired, () => false);
  const shownMessage = loginMessage || (sessionExpired ? "Your session has expired. Please log in again." : "");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // If user explicitly logged out, clear storage and do not silently auto-login
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("logged_out") === "1") {
        ["jwtToken", "userId", "userName", "userEmail", "userRole"].forEach((k) =>
          localStorage.removeItem(k)
        );
        return;
      }
    }

    // If already logged in with a valid unexpired token, redirect straight to dashboard.
    const token = getToken();
    if (token && !isTokenExpired(token)) {
      router.replace("/dashboard");
      return;
    }
    // Token is missing or expired — attempt silent refresh via the HttpOnly cookie.
    refreshAccessToken().then((refreshed) => {
      if (refreshed) {
        router.replace("/dashboard");
      } else {
        ["jwtToken", "userId", "userName", "userEmail", "userRole"].forEach((k) =>
          localStorage.removeItem(k)
        );
      }
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginMessage("Logging in...");

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setLoginMessage(data.error || "Login failed");
        return;
      }

      // Save JWT token and user information
      saveLoginData({
        token: data.token,
        id: data.id,
        fullName: data.fullName,
        email: data.email,
        role: data.role,
      });

      setLoginMessage("Login successful!");
      router.push("/dashboard");
    } catch (error) {
      console.error("Login error:", error);
      setLoginMessage("Cannot connect to CRM server.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl px-10 py-10">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="flex items-center justify-center w-full py-4 px-6 rounded-xl bg-gradient-to-r from-[#0b1220] to-[#172554] shadow-md border border-slate-800/40">
              <Image
                src="/derivion_logo.png"
                alt="DERIVION"
                width={160}
                height={53}
                className="h-10 w-auto object-contain"
              />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-800 text-center mb-1">Welcome back</h1>
          <p className="text-sm text-gray-500 text-center mb-8">Login to your CRM account</p>

          <form id="loginForm" onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">
                Email
              </label>
              <input
                type="email"
                id="email"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">
                Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              <button
  type="button"
  onClick={() => setShowPassword(!showPassword)}
  className="absolute right-3 top-1/2 translate-y-0.5 text-gray-500 hover:text-blue-600"
  aria-label={showPassword ? "Hide password" : "Show password"}
  title={showPassword ? "Hide password" : "Show password"}
>
  {showPassword ? (
    <svg xmlns="http://www.w3.org/2000/svg" width="21" height="21"
      viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6a2 2 0 002.8 2.8" />
      <path d="M9.9 5.2A11 11 0 0112 5c5 0 9 4 10 7-.4 1.2-1.2 2.3-2.2 3.2" />
      <path d="M6.2 6.2C3.8 7.6 2.5 9.4 2 12c1 3 5 7 10 7 1 0 2-.2 2.9-.5" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" width="21" height="21"
      viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )}
</button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold text-base py-3 rounded-lg transition-colors duration-200 mt-2"
            >
              {isLoading ? "Logging in..." : "Login"}
            </button>
          </form>

          {shownMessage && (
            <p
              id="loginMessage"
              className={`mt-4 text-sm text-center font-medium ${
                shownMessage.includes("success") ? "text-green-600" : "text-red-500"
              }`}
            >
              {shownMessage}
            </p>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          DERIVION CRM &copy; 2026
        </p>
      </div>
    </div>
  );
}
