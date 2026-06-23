import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Brain, BarChart3, MessageSquare, Sparkles, ShieldCheck, Zap } from "lucide-react";
import { Brand } from "@/components/brand";
import { AuroraBackground } from "@/components/aurora-background";
import contexFlowLogo from "@/assets/contex-flow-logo.webp.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cortex Flow — Turn Data Into Financial Wisdom" },
      { name: "description", content: "AI-powered personal finance: upload statements, chat with your data, and get personalized recommendations in plain English." },
      { property: "og:title", content: "Cortex Flow — Turn Data Into Financial Wisdom" },
      { property: "og:description", content: "Upload statements, chat with your data, get insights." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="grain relative min-h-screen overflow-hidden">
      <AuroraBackground />
      <div className="relative z-10">
        <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <Brand />
          <div className="flex items-center gap-3">
            <Link to="/auth" className="text-sm font-medium text-muted-foreground hover:text-foreground">Sign in</Link>
            <Link to="/auth" className="rounded-lg gradient-violet px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 glow-violet">
              Get started
            </Link>
          </div>
        </header>

        <section className="mx-auto max-w-6xl px-6 pt-16 pb-20 text-center md:pt-28">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-violet/30 bg-violet/10 px-3 py-1 text-xs font-medium text-violet backdrop-blur">
            <Sparkles size={12} /> Powered by Text-to-SQL + RAG
          </div>
          <img
            src={contexFlowLogo.url}
            alt="Contex Flow"
            className="mx-auto mb-6 h-auto w-48 md:w-64 object-contain drop-shadow-[0_0_30px_rgba(139,92,246,0.4)]"
          />
          <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
            Turn data into <span className="gradient-text">financial wisdom</span>.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Upload your statements, ask anything in plain English, and get clear, AI-driven insights about where your money actually goes.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-xl gradient-violet px-6 py-3 text-sm font-semibold text-white transition hover:translate-y-[-2px] glow-violet"
            >
              Start free <ArrowRight size={16} />
            </Link>
            <Link to="/auth" className="rounded-xl border border-border bg-glass px-6 py-3 text-sm font-semibold backdrop-blur glass-hover">
              See it in action
            </Link>
          </div>

          {/* Hero card */}
          <div className="mx-auto mt-16 max-w-4xl rounded-2xl border border-border bg-glass p-2 shadow-[0_30px_80px_-30px_rgba(139,92,246,0.5)] backdrop-blur-2xl">
            <div className="rounded-xl bg-background/60 p-6">
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { icon: BarChart3, label: "Net cash flow", value: "+$4,318", color: "text-emerald" },
                  { icon: MessageSquare, label: "AI insights", value: "12 new", color: "text-violet" },
                  { icon: Brain, label: "Data points analyzed", value: "8,442", color: "text-cyan" },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg border border-border bg-glass p-4 text-left">
                    <s.icon className={`${s.color} mb-2`} size={18} />
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</div>
                    <div className="font-mono text-2xl font-semibold">{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-24 md:grid-cols-3">
          {[
            { icon: Brain, title: "Ask anything", body: "Plain-English questions get real answers from your financial data using Text-to-SQL." },
            { icon: ShieldCheck, title: "Private by default", body: "Your data stays yours. Encrypted in transit, isolated per account, never sold." },
            { icon: Zap, title: "Instant insights", body: "Auto-generated breakdowns of spending, savings rate, and cash flow trends." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-glass p-6 backdrop-blur glass-hover">
              <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg bg-violet/15 text-violet">
                <f.icon size={20} />
              </div>
              <h3 className="font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </section>

        <section className="mt-16">
          <div className="mx-auto flex max-w-3xl items-start gap-4 rounded-2xl border border-emerald/30 bg-emerald/5 p-5 backdrop-blur-xl">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald/15 text-emerald">
              <ShieldCheck size={20} />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wider text-emerald">Security &amp; Privacy</div>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Your data is protected with bank-level encryption, secure authentication, and automatic session management — built with Supabase security standards.
              </p>
            </div>
          </div>
        </section>

        <footer className="mt-16 border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Cortex Flow. Built by CS students at CUST, Islamabad.
        </footer>
      </div>
    </div>
  );
}
