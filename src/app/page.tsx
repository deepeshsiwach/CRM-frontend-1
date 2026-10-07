"use client";

// ============================================================
// DERIVION CRM - LOGIN PAGE
// Ported from index.html + script.js
// ============================================================

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { API_BASE_URL } from "@/lib/config";
import { getToken, saveLoginData } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginMessage, setLoginMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // If already logged in, redirect to dashboard
    const token = getToken();
    if (token) {
      router.replace("/dashboard");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginMessage("Logging in...");

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
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
            <Image src="/derivion_logo.png" alt="DERIVION" width={150} height={50} priority />
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">
                Password
              </label>
              <input
                type="password"
                id="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold text-base py-3 rounded-lg transition-colors duration-200 mt-2"
            >
              {isLoading ? "Logging in..." : "Login"}
            </button>
          </form>

          {loginMessage && (
            <p
              id="loginMessage"
              className={`mt-4 text-sm text-center font-medium ${
                loginMessage.includes("success") ? "text-green-600" : "text-red-500"
              }`}
            >
              {loginMessage}
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
