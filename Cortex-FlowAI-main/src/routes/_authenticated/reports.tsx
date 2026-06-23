import { createFileRoute } from "@tanstack/react-router";
import { Download, FileBarChart, Printer } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useTransactions, formatCurrency } from "@/lib/finance";
import { useMemo } from "react";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports · Cortex Flow" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const { data: txns = [] } = useTransactions();
  const r = useMemo(() => buildReport(txns), [txns]);

  return (
    <AppShell>
      <div className="animate-fade-up space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold sm:text-4xl">Financial Report</h1>
            <p className="mt-1 text-sm text-muted-foreground">Monthly summary of your income, expenses and insights.</p>
          </div>
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg gradient-violet px-4 py-2.5 text-sm font-semibold text-white glow-violet">
            <Download size={16} /> Download PDF
          </button>
        </div>

        <div className="rounded-2xl border border-border bg-glass p-8 backdrop-blur-xl print:bg-white print:text-black">
          <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg gradient-violet">
                <FileBarChart className="text-white" size={20} />
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold">Monthly Report</h2>
                <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString("en", { month: "long", year: "numeric" })}</p>
              </div>
            </div>
            <Printer className="text-muted-foreground" size={18} />
          </div>

          <Section title="Income summary">
            <Row label="Total income" value={formatCurrency(r.income)} />
            <Row label="Total expenses" value={formatCurrency(r.expenses)} />
            <Row label="Net cash flow" value={formatCurrency(r.savings)} accent />
            <Row label="Savings rate" value={`${r.rate.toFixed(1)}%`} />
          </Section>

          <Section title="Top spending categories">
            {r.topCats.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet.</p>
            ) : (
              <div className="space-y-2">
                {r.topCats.map((c, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-border bg-glass/50 px-3 py-2 text-sm">
                    <span>{c.name}</span>
                    <span className="font-mono">{formatCurrency(c.value)}</span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="AI summary">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {r.income === 0 && r.expenses === 0
                ? "No transactions yet this period. Upload financial data to generate a meaningful report."
                : `This month you brought in ${formatCurrency(r.income)} and spent ${formatCurrency(r.expenses)}, for a net of ${formatCurrency(r.savings)}. Your savings rate of ${r.rate.toFixed(0)}% is ${r.rate >= 20 ? "ahead" : "behind"} the 20% benchmark. Top category was ${r.topCats[0]?.name ?? "—"}.`}
            </p>
          </Section>
        </div>
      </div>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 last:mb-0">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-violet">{title}</h3>
      {children}
    </div>
  );
}
function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-border/50 py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-mono font-semibold ${accent ? "text-emerald text-lg" : ""}`}>{value}</span>
    </div>
  );
}

function buildReport(txns: any[]) {
  const now = new Date();
  const month = txns.filter((t) => new Date(t.occurred_on).getMonth() === now.getMonth() && new Date(t.occurred_on).getFullYear() === now.getFullYear());
  const income = month.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const expenses = month.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const savings = income - expenses;
  const rate = income ? (savings / income) * 100 : 0;
  const catMap = new Map<string, number>();
  for (const t of month) if (t.type === "expense") catMap.set(t.category, (catMap.get(t.category) ?? 0) + Number(t.amount));
  const topCats = [...catMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, value]) => ({ name, value }));
  return { income, expenses, savings, rate, topCats };
}
