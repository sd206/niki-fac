"use client";

import { useAuth } from "@/lib/useAuth";
import { signInWithApple, signInWithGoogle } from "@/lib/firebase";
import Link from "next/link";

const benefits = [
  "Organize Family Life",
  "Manage Finances",
  "Secure Documents",
  "AI Family Assistant",
];

export default function WelcomePage() {
  const { user, loading } = useAuth();

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-indigo-50 px-6 py-16">
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-4xl font-bold text-primary">Niki</h1>
        <p className="mt-2 text-2xl font-semibold text-gray-800">
          Your Family Operating System
        </p>

        <ul className="mt-8 space-y-2 text-left">
          {benefits.map((b) => (
            <li key={b} className="rounded-card bg-white p-3 shadow-sm">
              {b}
            </li>
          ))}
        </ul>

        <div className="mt-10 space-y-3">
          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : user ? (
            <div className="space-y-3">
              <Link
                href="/home"
                className="block rounded-card bg-primary px-4 py-3 font-semibold text-white"
              >
                Go to Dashboard
              </Link>
              <Link
                href="/family/create"
                className="block rounded-card border border-primary px-4 py-3 font-semibold text-primary"
              >
                Create Family
              </Link>
              <Link
                href="/family/join"
                className="block rounded-card border border-primary px-4 py-3 font-semibold text-primary"
              >
                Join Family
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                onClick={() => signInWithGoogle()}
                className="w-full rounded-card bg-primary px-4 py-3 font-semibold text-white"
              >
                Continue with Google
              </button>
              <button
                onClick={() => signInWithApple()}
                className="w-full rounded-card bg-black px-4 py-3 font-semibold text-white"
              >
                Continue with Apple
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
