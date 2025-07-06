"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

// Backend URL - should match the auth service
const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
        credentials: "include",
      });

      const data = await res.json();

      if (data.success) {
        // Store token in localStorage for future requests
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        router.push("/");
      } else {
        setMessage(data.message || "Login failed.");
      }
    } catch (error) {
      console.error("Login error:", error);
      setMessage("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };



  const goToSignup = () => {
    router.push("/signup");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white shadow-md rounded-lg p-8 max-w-sm w-full">
        <h2 className="text-2xl font-bold mb-6 text-center">
          Sign in to your account
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              name="email"
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <input
              name="password"
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-semibold py-2 px-4 rounded-md shadow"
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        

        <button
          hidden
          className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-md shadow"
        >
          <svg className="h-5 w-5" viewBox="0 0 48 48">
            <g>
              <path
                fill="#4285F4"
                d="M43.6 20.5h-1.9V20H24v8h11.3c-1.2 3.2-4.3 5.5-8.3 5.5-5 0-9-4-9-9s4-9 9-9c2.3 0 4.3.8 5.9 2.2l6.4-6.4C36.1 7.6 30.4 5 24 5 12.9 5 4 13.9 4 25s8.9 20 20 20c11.1 0 20-8.9 20-20 0-1.3-.1-2.7-.4-4z"
              />
              <path
                fill="#34A853"
                d="M6.3 14.7l6.6 4.8C14.2 16.2 18.7 13 24 13c2.3 0 4.3.8 5.9 2.2l6.4-6.4C36.1 7.6 30.4 5 24 5 15.2 5 7.7 10.5 6.3 14.7z"
              />
              <path
                fill="#FBBC05"
                d="M24 45c6.4 0 12.1-2.1 16.6-5.7l-7.7-6.3c-2.2 1.5-5 2.4-8 2.4-4 0-7.5-2.3-8.7-5.5l-6.7 5.2C7.9 41.3 15.3 45 24 45z"
              />
              <path
                fill="#EA4335"
                d="M43.6 20.5h-1.9V20H24v8h11.3c-1.2 3.2-4.3 5.5-8.3 5.5-5 0-9-4-9-9s4-9 9-9c2.3 0 4.3.8 5.9 2.2l6.4-6.4C36.1 7.6 30.4 5 24 5 12.9 5 4 13.9 4 25s8.9 20 20 20c11.1 0 20-8.9 20-20 0-1.3-.1-2.7-.4-4z"
              />
            </g>
          </svg>
          Google sign-in disabled
        </button>

        {message && (
          <div
            className={`mt-4 p-3 rounded-md text-center ${
              message.includes("success")
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {message}
          </div>
        )}

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Don't have an account?{" "}
            <button
              onClick={goToSignup}
              className="text-blue-500 hover:text-blue-600 font-medium"
            >
              Sign up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
