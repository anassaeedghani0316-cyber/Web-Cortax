import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Save, AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/finance";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings · Cortex Flow" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const router = useRouter();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [newPwd, setNewPwd] = useState("");
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifWeekly, setNotifWeekly] = useState(true);

  useEffect(() => { if (profile?.name) setName(profile.name); }, [profile?.name]);

  async function saveProfile() {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ name }).eq("id", profile.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
    qc.invalidateQueries({ queryKey: ["profile"] });
    qc.invalidateQueries({ queryKey: ["me-profile"] });
  }

  async function changePassword() {
    if (newPwd.length < 6) return toast.error("Password must be at least 6 characters");
    const { error } = await supabase.auth.updateUser({ password: newPwd });
    if (error) return toast.error(error.message);
    setNewPwd("");
    toast.success("Password updated");
  }

  async function deleteAccount() {
    if (!confirm("Delete account permanently? This cannot be undone.")) return;
    if (!profile) return;
    await supabase.from("profiles").delete().eq("id", profile.id);
    await supabase.auth.signOut();
    router.navigate({ to: "/" });
    toast.success("Account data removed. Goodbye!");
  }

  return (
    <AppShell>
      <div className="animate-fade-up max-w-3xl space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your account and preferences.</p>
        </div>

        <Card title="Profile">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-2xl gradient-violet text-xl font-bold text-white glow-violet">
              {(name || profile?.email || "U").slice(0, 1).toUpperCase()}
            </div>
            <div className="text-sm">
              <div className="text-muted-foreground">Signed in as</div>
              <div className="font-medium">{profile?.email}</div>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            <Label>Full name</Label>
            <Input value={name} onChange={setName} />
            <button onClick={saveProfile} disabled={saving} className="inline-flex items-center gap-2 rounded-lg gradient-violet px-4 py-2 text-sm font-semibold text-white">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
            </button>
          </div>
        </Card>

        <Card title="Change password">
          <Label>New password</Label>
          <Input type="password" value={newPwd} onChange={setNewPwd} placeholder="At least 6 characters" />
          <button onClick={changePassword} className="mt-3 rounded-lg border border-border bg-glass px-4 py-2 text-sm font-semibold glass-hover">
            Update password
          </button>
        </Card>

        <Card title="Notifications">
          <Toggle label="Email summaries" value={notifEmail} onChange={setNotifEmail} />
          <Toggle label="Weekly insights digest" value={notifWeekly} onChange={setNotifWeekly} />
        </Card>

        <div className="rounded-2xl border border-rose/30 bg-rose/5 p-6">
          <div className="flex items-center gap-2 text-rose">
            <AlertTriangle size={16} /> <h2 className="font-display font-semibold">Danger zone</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Permanently delete your account and all associated data.</p>
          <button onClick={deleteAccount} className="mt-4 rounded-lg border border-rose/40 bg-rose/10 px-4 py-2 text-sm font-semibold text-rose hover:bg-rose/20">
            Delete account
          </button>
        </div>
      </div>
    </AppShell>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-glass p-6 backdrop-blur-xl">
      <h2 className="mb-4 font-display text-lg font-semibold">{title}</h2>
      {children}
    </div>
  );
}
function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">{children}</label>;
}
function Input({ value, onChange, type = "text", placeholder }: { value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="mt-1.5 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:border-violet focus:outline-none focus:ring-2 focus:ring-violet/30"
    />
  );
}
function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)} className="flex w-full items-center justify-between border-b border-border/40 py-3 text-sm last:border-0">
      <span>{label}</span>
      <span className={`relative h-5 w-9 rounded-full transition ${value ? "gradient-violet" : "bg-white/10"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${value ? "left-[18px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}
