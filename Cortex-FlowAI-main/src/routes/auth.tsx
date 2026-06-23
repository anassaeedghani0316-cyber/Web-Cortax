import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, Loader2, Mail, Lock, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Brand } from "@/components/brand";
import { AuroraBackground } from "@/components/aurora-background";

type Mode = "signin" | "signup" | "forgot";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · Cortex Flow" },
      { name: "description", content: "Sign in or create your Cortex Flow account." },
    ],
  }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate({ to: "/dashboard" });
      } else if (mode === "signup") {
        if (password !== confirm) throw new Error("Passwords don't match");
        if (password.length < 6) throw new Error("Password must be at least 6 characters");
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name }, emailRedirectTo: window.location.origin + "/dashboard" },
        });
        if (error) throw error;
        toast.success("Account created — welcome!");
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/reset-password",
        });
        if (error) throw error;
        toast.success("Check your inbox for the reset link.");
        setMode("signin");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function googleSignIn() {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/dashboard" });
    if (result.error) {
      toast.error("Google sign-in failed");
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  }

  const pwdStrength = (() => {
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();

  return (
    <div className="grain relative flex min-h-screen items-center justify-center px-4 py-10">
      <AuroraBackground />
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Link to="/"><Brand size="lg" /></Link>
        </div>
        <p className="mb-8 text-center text-sm text-muted-foreground">
          Turning data into financial wisdom
        </p>

        <div className="rounded-2xl border border-border bg-glass p-7 backdrop-blur-2xl shadow-[0_30px_80px_-30px_rgba(139,92,246,0.4)]">
          <h1 className="font-display text-2xl font-bold">
            {mode === "signin" && "Welcome back"}
            {mode === "signup" && "Create your account"}
            {mode === "forgot" && "Reset password"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin" && "Sign in to your Cortex dashboard"}
            {mode === "signup" && "Start turning your data into insights"}
            {mode === "forgot" && "We'll email you a reset link"}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <Field icon={UserIcon} placeholder="Full name" value={name} onChange={setName} required />
            )}
            <Field icon={Mail} type="email" placeholder="Email address" value={email} onChange={setEmail} required />
            {mode === "forgot" && (
              <p className="-mt-2 text-xs text-muted-foreground">
                Didn't receive the OTP? Please check your spam or junk folder.
              </p>
            )}
            {mode !== "forgot" && (
              <div className="relative">
                <Field
                  icon={Lock}
                  type={showPwd ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={setPassword}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Toggle password"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            )}
            {mode === "signup" && (
              <>
                <Field icon={Lock} type={showPwd ? "text" : "password"} placeholder="Confirm password" value={confirm} onChange={setConfirm} required />
                {password && (
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition ${
                          i <= pwdStrength
                            ? pwdStrength < 2
                              ? "bg-rose"
                              : pwdStrength < 4
                              ? "bg-amber"
                              : "bg-emerald"
                            : "bg-white/10"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            <button
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg gradient-violet px-4 py-2.5 text-sm font-semibold text-white transition hover:translate-y-[-1px] hover:opacity-95 disabled:opacity-60 glow-violet"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {mode === "signin" && "Sign in"}
              {mode === "signup" && "Create account"}
              {mode === "forgot" && "Send reset link"}
            </button>
          </form>

          {mode !== "forgot" && (
            <>
              <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
              </div>
              <button
                onClick={googleSignIn}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-glass px-4 py-2.5 text-sm font-medium transition hover:bg-glass-hover"
              >
                <GoogleIcon /> Continue with Google
              </button>
            </>
          )}

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" && (
              <>
                <button onClick={() => setMode("forgot")} className="text-violet hover:underline">Forgot password?</button>
                <div className="mt-2">
                  New here?{" "}
                  <button onClick={() => setMode("signup")} className="font-medium text-foreground hover:text-violet">Create account</button>
                </div>
              </>
            )}
            {mode === "signup" && (
              <>Already have an account?{" "}
                <button onClick={() => setMode("signin")} className="font-medium text-foreground hover:text-violet">Sign in</button>
              </>
            )}
            {mode === "forgot" && (
              <button onClick={() => setMode("signin")} className="text-violet hover:underline">Back to sign in</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  icon: Icon, type = "text", placeholder, value, onChange, required,
}: {
  icon: typeof Mail; type?: string; placeholder: string; value: string; onChange: (v: string) => void; required?: boolean;
}) {
  return (
    <div className="relative">
      <Icon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg border border-border bg-input px-9 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-violet focus:outline-none focus:ring-2 focus:ring-violet/30"
      />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8a12 12 0 1 1 0-24 12 12 0 0 1 8.5 3.5l5.7-5.7A20 20 0 1 0 24 44a20 20 0 0 0 19.6-16 20 20 0 0 0 0-7.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13a12 12 0 0 1 8.5 3.5l5.7-5.7A20 20 0 0 0 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.3 0 10.1-2 13.7-5.3l-6.3-5.3c-2 1.4-4.6 2.3-7.4 2.3-5.2 0-9.7-3.3-11.3-8L6 32.4A20 20 0 0 0 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.3 5.3C40 36 44 30.5 44 24a20 20 0 0 0-.4-3.5z"/>
    </svg>
  );
}
