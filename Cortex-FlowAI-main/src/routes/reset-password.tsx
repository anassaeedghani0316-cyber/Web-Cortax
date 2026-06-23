import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Brand } from "@/components/brand";
import { AuroraBackground } from "@/components/aurora-background";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password · Cortex Flow" }] }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash.includes("type=recovery") || hash.includes("access_token")) setReady(true);
    else setReady(true);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) return toast.error("Passwords don't match");
    if (password.length < 6) return toast.error("Min 6 characters");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated. Sign in.");
    navigate({ to: "/auth" });
  }

  return (
    <div className="grain relative flex min-h-screen items-center justify-center px-4">
      <AuroraBackground />
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-6 flex justify-center"><Brand size="lg" /></div>
        <div className="rounded-2xl border border-border bg-glass p-7 backdrop-blur-2xl">
          <h1 className="font-display text-2xl font-bold">Set a new password</h1>
          <p className="mt-1 text-sm text-muted-foreground">Choose a strong password you haven't used before.</p>
          {ready && (
            <form onSubmit={submit} className="mt-6 space-y-3">
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm focus:border-violet focus:outline-none" />
              <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm password" className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm focus:border-violet focus:outline-none" />
              <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg gradient-violet px-4 py-2.5 text-sm font-semibold text-white glow-violet">
                {loading && <Loader2 size={14} className="animate-spin" />} Update password
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
