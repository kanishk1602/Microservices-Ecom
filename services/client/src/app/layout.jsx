"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Bell, House, ShoppingCart } from "lucide-react";
import { Geist, Geist_Mono } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({ children }) {
  const queryClient = new QueryClient();
  const router = useRouter();

  const handleLogout = useCallback(async () => {
    // Dynamically import Firebase only on the client side
    const { signOut } = await import("firebase/auth");
    const { auth } = await import("../firebase");
    const authInstance = await auth(); // auth is now an async getter function
    if (authInstance) {
      await signOut(authInstance);
    }
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem("user");
    }
    router.replace("/login");
  }, [router]);

  return (
    <html lang="en">
      <QueryClientProvider client={queryClient}>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased max-w-7xl mx-auto px-16 lg:px-0`}
        >
          <nav className="flex justify-between items-center py-4 mb-8">
            <div className="flex items-center gap-4">
              {/* <Image src="/logo.png" alt="logo" width={50} height={50} /> */}
              <Link href="/" className="text-2xl font-black">
                Test Market Place
              </Link>
            </div>
            <div className="flex items-center gap-6">
              <House className="w-5 h-5" />
              <Bell className="w-5 h-5" />
              <ShoppingCart className="w-5 h-5" />
              <Image
                src="/avatar.png"
                alt="avatar"
                width={32}
                height={32}
                className="rounded-full border border-gray-300"
              />
              <button
                onClick={handleLogout}
                className="ml-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md font-semibold shadow"
              >
                Logout
              </button>
            </div>
          </nav>
          {children}
        </body>
      </QueryClientProvider>
    </html>
  );
}
