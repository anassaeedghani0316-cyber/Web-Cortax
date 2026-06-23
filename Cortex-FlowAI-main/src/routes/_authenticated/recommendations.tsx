import { createFileRoute } from "@tanstack/react-router";
import { Lightbulb, Sparkles, Loader2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useTransactions } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/recommendations")({
  head: () => ({ meta: [{ title: "Recommendations · Cortex Flow" }] }),
  component: RecommendationsPage,
});

function RecommendationsPage() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const { data: txns = [] } = useTransactions();
  const { data: recs = [] } = useQuery({
    queryKey: ["recommendations"],
    queryFn: async () => {
      const { data } = await supabase.from("recommendations").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function generate() {
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const proposals = buildRecommendations(txns);
      if (proposals.length === 0) {
        toast.info("Add some transactions or upload data to generate recommendations.");
        return;
      }
      const { error } = await supabase.from("recommendations").insert(
        proposals.map((p) => ({ ...p, user_id: u.user!.id }))
      );
      if (error) throw error;
      toast.success(`Generated ${proposals.length} new recommendations`);
      qc.invalidateQueries({ queryKey: ["recommendations"] });
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <div className="animate-fade-up space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold sm:text-4xl">Personalized Recommendations</h1>
            <p className="mt-1 text-sm text-muted-foreground">AI-curated steps to improve your financial health.</p>
          </div>
          <button
            onClick={generate}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg gradient-violet px-4 py-2.5 text-sm font-semibold text-white glow-violet disabled:opacity-50"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            Generate new
          </button>
        </div>

        {recs.length === 0 ? (
          <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-glass p-16 text-center backdrop-blur">
            <div className="mb-3 grid h-12 w-12 place-items-center rounded-xl bg-violet/15">
              <Lightbulb className="text-violet" size={20} />
            </div>
            <h3 className="font-display text-lg font-semibold">No recommendations yet</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Upload financial data and click "Generate new" to get personalized insights.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {recs.map((r: any) => <RecCard key={r.id} rec={r} onApply={() => toast.success("Marked as applied")} />)}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function RecCard({ rec, onApply }: { rec: any; onApply: () => void }) {
  const priorityStyles: Record<string, string> = {
    high: "border-rose/40 bg-rose/10 text-rose",
    medium: "border-amber/40 bg-amber/10 text-amber",
    low: "border-emerald/40 bg-emerald/10 text-emerald",
  };
  return (
    <div className="rounded-2xl border border-border bg-glass p-5 backdrop-blur-xl glass-hover">
      <div className="mb-3 flex items-center justify-between">
        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${priorityStyles[rec.priority] ?? priorityStyles.medium}`}>
          {rec.priority}
        </span>
        <span className="text-xs text-muted-foreground">{rec.category}</span>
      </div>
      <h3 className="font-display text-lg font-semibold">{rec.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{rec.body}</p>
      <button onClick={onApply} className="mt-4 rounded-lg border border-border bg-glass px-3 py-1.5 text-xs font-medium glass-hover">
        Apply this
      </button>
    </div>
  );
}

function buildRecommendations(txns: any[]) {
  const out: { title: string; body: string; priority: "low" | "medium" | "high"; category: string }[] = [];
  if (!txns.length) return out;
  const now = new Date();
  const thisMonth = txns.filter((t) => new Date(t.occurred_on).getMonth() === now.getMonth());
  const income = thisMonth.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const expenses = thisMonth.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const savings = income - expenses;
  const rate = income ? (savings / income) * 100 : 0;

  const catMap = new Map<string, number>();
  for (const t of thisMonth) if (t.type === "expense") catMap.set(t.category, (catMap.get(t.category) ?? 0) + Number(t.amount));
  const top = [...catMap.entries()].sort((a, b) => b[1] - a[1])[0];

  if (rate < 20 && income > 0) {
    out.push({
      title: "Boost your savings rate",
      body: `You're currently saving ${rate.toFixed(0)}% of your income. Aim for at least 20% by trimming flexible spending categories.`,
      priority: "high", category: "Savings",
    });
  }
  if (top && top[1] > expenses * 0.35) {
    out.push({
      title: `Watch your ${top[0]} spending`,
      body: `${top[0]} accounts for over a third of your expenses this month. Setting a soft monthly cap could free up meaningful cash.`,
      priority: "medium", category: top[0],
    });
  }
  out.push({
    title: "Automate the basics",
    body: "Set up automatic transfers on payday so saving happens before discretionary spending starts.",
    priority: "low", category: "Habits",
  });
  return out;
}
