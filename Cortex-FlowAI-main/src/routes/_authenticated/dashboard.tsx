import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import {
  TrendingUp, TrendingDown, PiggyBank, Activity, ArrowUpRight, Upload, Sparkles, FileText,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { AppShell } from "@/components/app-shell";
import { useProfile, useTransactions, formatCurrency, type Transaction } from "@/lib/finance";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · Cortex Flow" }] }),
  component: DashboardPage,
});

const CATEGORY_COLORS = ["#8b5cf6", "#22d3ee", "#3ddc97", "#fbbf24", "#fb7185", "#5b6cf2"];

function DashboardPage() {
  const { data: profile } = useProfile();
  const { data: txns = [], isLoading } = useTransactions();
  const { data: recentDocs = [] } = useQuery({
    queryKey: ["recent-docs"],
    queryFn: async () => {
      const { data } = await supabase.from("financial_documents").select("*").order("upload_date", { ascending: false }).limit(3);
      return data ?? [];
    },
  });

  // Auto-reset at start of each calendar month: only show transactions UPLOADED this month.
  // Older uploads stay in the database but are filtered out of the dashboard view.
  const currentMonthTxns = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    return txns.filter((t) => new Date(t.created_at).getTime() >= startOfMonth);
  }, [txns]);

  const { kpis, monthly, categoryBreakdown } = useMemo(() => computeStats(currentMonthTxns), [currentMonthTxns]);

  return (
    <AppShell>
      <div className="animate-fade-up space-y-6">
        {/* Header */}
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-bold sm:text-4xl">
              {greeting()}, {profile?.name?.split(" ")[0] ?? "there"} 👋
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Get insights, analyze your finances and plan a better future with AI.
            </p>
          </div>
          <Link
            to="/documents"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg gradient-violet px-4 py-2.5 text-sm font-semibold text-white glow-violet transition hover:translate-y-[-1px]"
          >
            <Upload size={16} /> Upload Document
          </Link>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Total Income" amount={kpis.income} delta={kpis.incomeDelta} icon={TrendingUp} color="emerald" />
          <KpiCard label="Total Expenses" amount={kpis.expenses} delta={kpis.expensesDelta} icon={TrendingDown} color="rose" invert />
          <KpiCard label="Savings" amount={kpis.savings} delta={kpis.savingsDelta} icon={PiggyBank} color="cyan" />
          <KpiCard label="Cash Flow" amount={kpis.cashflow} delta={kpis.cashflowDelta} icon={Activity} color="violet" />
        </div>

        {/* Charts row */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-glass p-5 backdrop-blur-xl lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-semibold">Monthly Overview</h3>
                <p className="text-xs text-muted-foreground">Income vs expenses, last 6 months</p>
              </div>
              <div className="rounded-md border border-border bg-glass px-3 py-1 text-xs text-muted-foreground">Last 6 months</div>
            </div>
            <div className="h-72">
              <ResponsiveContainer>
                <LineChart data={monthly}>
                  <defs>
                    <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3ddc97" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="#3ddc97" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="month" stroke="#aab0d6" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#aab0d6" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<GlassTooltip />} />
                  <Line type="monotone" dataKey="income" stroke="#3ddc97" strokeWidth={2.5} dot={{ r: 3, fill: "#3ddc97" }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="expenses" stroke="#fb7185" strokeWidth={2.5} dot={{ r: 3, fill: "#fb7185" }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-glass p-5 backdrop-blur-xl">
            <h3 className="font-display text-lg font-semibold">Expense Breakdown</h3>
            <p className="text-xs text-muted-foreground">By category</p>
            <div className="relative mt-2 h-56">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={categoryBreakdown} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={3} stroke="none">
                    {categoryBreakdown.map((_, i) => (
                      <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<GlassTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-xs text-muted-foreground">Total</div>
                <div className="font-mono text-xl font-bold">{formatCurrency(kpis.expenses)}</div>
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              {categoryBreakdown.slice(0, 5).map((c, i) => (
                <div key={c.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                    <span className="text-muted-foreground">{c.name}</span>
                  </div>
                  <span className="font-mono">{formatCurrency(c.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI insight + Recent docs */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="relative overflow-hidden rounded-2xl border border-violet/30 bg-gradient-to-br from-violet/15 via-indigo/10 to-transparent p-6 backdrop-blur-xl lg:col-span-2">
            <div className="absolute left-0 top-0 h-full w-1 gradient-violet" />
            <div className="flex items-start gap-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg gradient-violet glow-violet">
                <Sparkles size={18} className="text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wider text-violet">AI insight</div>
                <p className="mt-1 text-sm leading-relaxed">
                  {generateInsight(kpis, categoryBreakdown)}
                </p>
                <Link to="/recommendations" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-violet hover:gap-2 transition-all">
                  View recommendations <ArrowUpRight size={14} />
                </Link>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-glass p-5 backdrop-blur-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-base font-semibold">Recent Documents</h3>
              <Link to="/documents" className="text-xs text-violet hover:underline">View all</Link>
            </div>
            {recentDocs.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
                No documents yet
              </div>
            ) : (
              <ul className="space-y-2">
                {recentDocs.map((d: any) => (
                  <li key={d.id} className="flex items-center gap-3 rounded-lg border border-border bg-glass/50 p-2.5 glass-hover">
                    <FileText size={16} className="text-violet" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{d.file_name}</div>
                      <div className="text-xs text-muted-foreground">{new Date(d.upload_date).toLocaleDateString()}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {isLoading && txns.length === 0 && (
          <div className="rounded-xl border border-border bg-glass p-4 text-sm text-muted-foreground">
            <span className="shimmer-text">Loading your financial data...</span>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function KpiCard({
  label, amount, delta, icon: Icon, color, invert = false,
}: {
  label: string; amount: number; delta: number; icon: typeof Activity; color: string; invert?: boolean;
}) {
  const positive = invert ? delta < 0 : delta > 0;
  const colorMap: Record<string, string> = {
    emerald: "text-emerald bg-emerald/10",
    rose: "text-rose bg-rose/10",
    cyan: "text-cyan bg-cyan/10",
    violet: "text-violet bg-violet/10",
  };
  const display = useCountUp(amount);
  return (
    <div className="group rounded-2xl glass p-5 glass-hover">
      <div className="flex items-center justify-between">
        <div className={`grid h-10 w-10 place-items-center rounded-lg ${colorMap[color]}`}>
          <Icon size={18} />
        </div>
        <span className={`font-mono text-xs ${positive ? "text-emerald" : "text-rose"}`}>
          {delta >= 0 ? "+" : ""}{delta.toFixed(1)}%
        </span>
      </div>
      <div className="mt-4 text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-2xl font-bold animate-count">{formatCurrency(display)}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">vs last month</div>
    </div>
  );
}

function useCountUp(target: number, duration = 900) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const from = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(from + (target - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

function GlassTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover/95 px-3 py-2 text-xs backdrop-blur-xl shadow-card">
      {label && <div className="mb-1 font-semibold">{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.payload.fill }} />
          <span className="text-muted-foreground capitalize">{p.name}:</span>
          <span className="font-mono font-semibold">{typeof p.value === "number" ? formatCurrency(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

function computeStats(txns: Transaction[]) {
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
  const lastYear = thisMonth === 0 ? thisYear - 1 : thisYear;

  let income = 0, expenses = 0, lastIncome = 0, lastExpenses = 0;
  const catMap = new Map<string, number>();

  for (const t of txns) {
    const d = new Date(t.occurred_on);
    const amt = Number(t.amount);
    if (d.getMonth() === thisMonth && d.getFullYear() === thisYear) {
      if (t.type === "income") income += amt; else { expenses += amt; catMap.set(t.category, (catMap.get(t.category) ?? 0) + amt); }
    } else if (d.getMonth() === lastMonth && d.getFullYear() === lastYear) {
      if (t.type === "income") lastIncome += amt; else lastExpenses += amt;
    }
  }

  const savings = income - expenses;
  const lastSavings = lastIncome - lastExpenses;

  const pct = (cur: number, prev: number) => (prev === 0 ? (cur > 0 ? 100 : 0) : ((cur - prev) / Math.abs(prev)) * 100);

  // last 6 months trend
  const monthly: { month: string; income: number; expenses: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(thisYear, thisMonth - i, 1);
    const label = d.toLocaleDateString("en", { month: "short" });
    let mi = 0, me = 0;
    for (const t of txns) {
      const td = new Date(t.occurred_on);
      if (td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear()) {
        if (t.type === "income") mi += Number(t.amount); else me += Number(t.amount);
      }
    }
    monthly.push({ month: label, income: mi, expenses: me });
  }

  const categoryBreakdown = Array.from(catMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  return {
    kpis: {
      income, expenses, savings, cashflow: savings,
      incomeDelta: pct(income, lastIncome),
      expensesDelta: pct(expenses, lastExpenses),
      savingsDelta: pct(savings, lastSavings),
      cashflowDelta: pct(savings, lastSavings),
    },
    monthly,
    categoryBreakdown,
  };
}

function generateInsight(kpis: ReturnType<typeof computeStats>["kpis"], cats: { name: string; value: number }[]) {
  if (kpis.income === 0 && kpis.expenses === 0) {
    return "Upload your first bank statement or add a few transactions to unlock AI-powered insights about your spending patterns.";
  }
  const top = cats[0];
  const savingsRate = kpis.income > 0 ? (kpis.savings / kpis.income) * 100 : 0;
  if (kpis.expensesDelta > 10 && top) {
    return `Your spending is up ${kpis.expensesDelta.toFixed(0)}% this month, driven mostly by ${top.name}. Consider setting a soft cap for that category to keep more of your income.`;
  }
  if (savingsRate > 20) {
    return `Strong month — you're saving ${savingsRate.toFixed(0)}% of your income. That's well above the 15% benchmark most planners recommend.`;
  }
  return `You've spent ${formatCurrency(kpis.expenses)} so far this month. Top category is ${top?.name ?? "—"}. Ask the AI chat for a deeper breakdown.`;
}
