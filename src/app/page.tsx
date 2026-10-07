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

  useEffect(() => {
    // If already logged in, redirect to dashboard
    const token = getToken();
    if (token) {
      router.replace("/dashboard");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      console.log("Login successful:", data);

      router.push("/dashboard");
    } catch (error) {
      console.error("Login error:", error);
      setLoginMessage("Cannot connect to CRM server.");
    }
  };

  return (
    <div className="login-container">
      <h1 className="login-brand-logo">
        <Image src="/derivion_logo.png" alt="DERIVION" width={150} height={50} />
      </h1>

      <p>Login to your account</p>

      <form id="loginForm" onSubmit={handleSubmit}>
        <input
          type="email"
          id="email"
          placeholder="Email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          id="password"
          placeholder="Password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit">Login</button>
      </form>

      <p id="loginMessage">{loginMessage}</p>
    </div>
  );
}
