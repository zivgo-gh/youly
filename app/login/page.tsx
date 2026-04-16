"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  const supabase = createSupabaseBrowserClient();

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const signInWithApple = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-emerald-600">
      {/* Header */}
      <div className="px-6 pt-14 pb-8 text-center">
        <div className="text-white text-4xl font-black tracking-tight uppercase mb-2">
          Youly
        </div>
        <p className="text-emerald-100 text-base font-medium">
          Your personal weight loss coach
        </p>
      </div>

      {/* White card */}
      <div className="flex-1 bg-white rounded-t-3xl px-6 pt-8 pb-10 flex flex-col">
        {/* Privacy badge */}
        <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3 mb-8">
          <span className="text-emerald-600 text-xl mt-0.5">🔒</span>
          <div>
            <p className="text-sm font-semibold text-emerald-800">
              Your health data stays on your device
            </p>
            <p className="text-xs text-emerald-600 mt-0.5">
              We never sell or share your personal information.
            </p>
          </div>
        </div>

        <p className="text-center text-gray-500 text-sm mb-6">
          Sign in to get started
        </p>

        {/* Google button */}
        <button
          onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl border border-gray-200 bg-white text-gray-700 font-semibold text-sm mb-3 active:bg-gray-50 transition-colors shadow-sm"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        {/* Apple button */}
        <button
          onClick={signInWithApple}
          className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl bg-black text-white font-semibold text-sm mb-8 active:bg-gray-900 transition-colors"
        >
          <AppleIcon />
          Continue with Apple
        </button>

        <p className="text-center text-xs text-gray-400 leading-relaxed">
          By continuing, you agree to our{" "}
          <a href="/consent" className="underline text-gray-500">
            Terms of Use and Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}
