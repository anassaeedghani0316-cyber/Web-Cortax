import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, RadialBarChart, RadialBar, PolarAngleAxis,
} from "recharts";
import { AppShell } from "@/components/app-shell";
import { useTransactions, formatCurrency } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/analysis")({
  head: () => ({ meta: [{ title: "Financial Analysis · Cortex Flow" }] }),
  component: AnalysisPage,
});

function AnalysisPage() {
  const { data: txns = [] } = useTransactions();
  const stats = useMemo(() => analyze(txns), [txns]);

  return (
    <AppShell>
      <div className="animate-fade-up space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold sm:text-4xl">Financial Analysis</h1>
            <p className="mt-1 text-sm text-muted-foreground">Deep dive into your spending patterns and trends.</p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Spending Trend" subtitle="Daily expenses over 30 days">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={stats.trend}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="day" stroke="#aab0d6" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#aab0d6" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip content={<GlassTip />} />
                <Line type="monotone" dataKey="amount" stroke="#8b5cf6" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Category Breakdown" subtitle="This month">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stats.categories} layout="vertical">
                <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
                <XAxis type="number" stroke="#aab0d6" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" stroke="#aab0d6" fontSize={11} width={90} tickLine={false} axisLine={false} />
                <Tooltip content={<GlassTip />} />
                <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Income vs Expense" subtitle="Last 6 months">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stats.monthly}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="month" stroke="#aab0d6" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#aab0d6" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip content={<GlassTip />} />
                <Bar dataKey="income" fill="#3ddc97" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill="#fb7185" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Savings Rate" subtitle="Goal: 20% of income">
            <div className="relative">
              <ResponsiveContainer width="100%" height={240}>
                <RadialBarChart innerRadius="65%" outerRadius="100%" data={[{ name: "rate", value: stats.savingsRate, fill: "#8b5cf6" }]} startAngle={210} endAngle={-30}>
                  <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                  <RadialBar background={{ fill: "rgba(255,255,255,0.06)" } as any} dataKey="value" cornerRadius={20} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <div className="font-mono text-4xl font-bold gradient-text">{stats.savingsRate.toFixed(0)}%</div>
                <div className="mt-1 text-xs text-muted-foreground">of income saved</div>
              </div>
            </div>
          </Card>
        </div>

        <div className="rounded-2xl border border-violet/30 bg-gradient-to-br from-violet/15 via-indigo/10 to-transparent p-6 backdrop-blur-xl">
          <h2 className="font-display text-lg font-semibold">Analysis summary</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {stats.totalSpent === 0
              ? "No data yet. Upload a bank statement or add a few transactions to generate a full analysis."
              : `You spent ${formatCurrency(stats.totalSpent)} across ${stats.txCount} transactions in the last 30 days. Your top spending category is ${stats.topCategory ?? "—"}, accounting for ${stats.topShare.toFixed(0)}% of expenses. Your current savings rate is ${stats.savingsRate.toFixed(0)}% — ${stats.savingsRate >= 20 ? "above the recommended benchmark." : "below the 20% benchmark planners typically recommend."}`}
          </p>
        </div>
      </div>
    </AppShell>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-glass p-5 backdrop-blur-xl">
      <div className="mb-3">
        <h3 className="font-display text-base font-semibold">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function GlassTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover/95 px-3 py-2 text-xs backdrop-blur-xl">
      {label && <div className="mb-1 font-semibold">{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="capitalize text-muted-foreground">{p.name}:</span>
          <span className="font-mono">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

function analyze(txns: any[]) {
  const now = new Date();
  const thirty = new Date(); thirty.setDate(thirty.getDate() - 30);
  const recent = txns.filter((t) => new Date(t.occurred_on) >= thirty);
  const trendMap = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    trendMap.set(d.toISOString().slice(5, 10), 0);
  }
  let totalSpent = 0, totalIncome = 0;
  const catMap = new Map<string, number>();
  for (const t of recent) {
    const key = t.occurred_on.slice(5, 10);
    const amt = Number(t.amount);
    if (t.type === "expense") {
      totalSpent += amt;
      trendMap.set(key, (trendMap.get(key) ?? 0) + amt);
      catMap.set(t.category, (catMap.get(t.category) ?? 0) + amt);
    } else totalIncome += amt;
  }
  const categories = Array.from(catMap, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);
  const topCategory = categories[0]?.name;
  const topShare = totalSpent ? ((categories[0]?.value ?? 0) / totalSpent) * 100 : 0;
  const savingsRate = totalIncome ? Math.max(0, ((totalIncome - totalSpent) / totalIncome) * 100) : 0;
  const trend = Array.from(trendMap, ([day, amount]) => ({ day, amount }));

  // monthly
  const monthly: { month: string; income: number; expenses: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    let mi = 0, me = 0;
    for (const t of txns) {
      const td = new Date(t.occurred_on);
      if (td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear()) {
        if (t.type === "income") mi += Number(t.amount); else me += Number(t.amount);
      }
    }
    monthly.push({ month: d.toLocaleDateString("en", { month: "short" }), income: mi, expenses: me });
  }

  return { trend, categories, monthly, totalSpent, txCount: recent.length, topCategory, topShare, savingsRate };
}
