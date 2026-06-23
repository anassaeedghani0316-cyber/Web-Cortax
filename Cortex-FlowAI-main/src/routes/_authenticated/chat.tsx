import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Send, Loader2, Copy, Sparkles, Brain, MoreHorizontal, Pencil, Trash2, Check, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const TITLES_KEY = "chatSessionTitles";
function loadTitles(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(TITLES_KEY) ?? "{}"); } catch { return {}; }
}
function saveTitles(t: Record<string, string>) {
  if (typeof window !== "undefined") localStorage.setItem(TITLES_KEY, JSON.stringify(t));
}

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({ meta: [{ title: "AI Chat · Cortex Flow" }] }),
  component: ChatPage,
});

const N8N_WEBHOOK = "https://uzair-saeed.app.n8n.cloud/webhook/50a83257-03e4-499f-a40a-a2ad151b2715/chat";

type Msg = { id: string; role: "user" | "assistant"; content: string; created_at: string };

function getSessionId() {
  if (typeof window === "undefined") return "default";
  let s = sessionStorage.getItem("chatSessionId");
  if (!s) {
    s = crypto.randomUUID();
    sessionStorage.setItem("chatSessionId", s);
  }
  return s;
}

function ChatPage() {
  const qc = useQueryClient();
  const [sessionId, setSessionId] = useState(() => (typeof window !== "undefined" ? getSessionId() : "default"));
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages = [] } = useQuery({
    queryKey: ["chat", sessionId],
    queryFn: async () => {
      const { data } = await supabase
        .from("chat_history")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });
      return (data ?? []) as Msg[];
    },
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["chat-sessions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("chat_history")
        .select("session_id, content, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      const seen = new Set<string>();
      const out: { session_id: string; preview: string; created_at: string }[] = [];
      for (const row of data ?? []) {
        if (seen.has(row.session_id)) continue;
        seen.add(row.session_id);
        out.push({ session_id: row.session_id, preview: row.content.slice(0, 60), created_at: row.created_at });
      }
      return out;
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;

    await supabase.from("chat_history").insert({
      user_id: u.user.id, session_id: sessionId, role: "user", content: text,
    });
    qc.invalidateQueries({ queryKey: ["chat", sessionId] });

    try {
      const res = await fetch(N8N_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatInput: text, sessionId }),
      });
      const data = await res.json();
      const reply = data.output ?? data.text ?? data.message ?? "I couldn't generate a response just now. Please try again.";
      await supabase.from("chat_history").insert({
        user_id: u.user.id, session_id: sessionId, role: "assistant", content: reply,
      });
      qc.invalidateQueries({ queryKey: ["chat", sessionId] });
      qc.invalidateQueries({ queryKey: ["chat-sessions"] });
    } catch (e) {
      toast.error("Couldn't reach the AI service");
    } finally {
      setSending(false);
    }
  }

  function newChat() {
    const s = crypto.randomUUID();
    sessionStorage.setItem("chatSessionId", s);
    setSessionId(s);
  }

  const [titles, setTitles] = useState<Record<string, string>>(() => loadTitles());
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    if (!menuOpenFor) return;
    const close = () => setMenuOpenFor(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menuOpenFor]);

  function startRename(id: string, current: string) {
    setMenuOpenFor(null);
    setRenamingId(id);
    setRenameValue(current);
  }
  function commitRename(id: string) {
    const name = renameValue.trim();
    const next = { ...titles };
    if (name) next[id] = name; else delete next[id];
    setTitles(next);
    saveTitles(next);
    setRenamingId(null);
  }
  async function deleteSession(id: string) {
    if (!confirm("Delete this chat? This cannot be undone.")) return;
    setMenuOpenFor(null);
    const { error } = await supabase.from("chat_history").delete().eq("session_id", id);
    if (error) { toast.error("Couldn't delete chat"); return; }
    const next = { ...titles };
    delete next[id];
    setTitles(next);
    saveTitles(next);
    qc.invalidateQueries({ queryKey: ["chat-sessions"] });
    if (id === sessionId) newChat();
    toast.success("Chat deleted");
  }

  return (
    <AppShell>
      <div className="animate-fade-up grid h-[calc(100vh-9rem)] grid-cols-1 gap-4 md:h-[calc(100vh-7rem)] lg:grid-cols-[260px_1fr]">
        {/* Sessions — desktop only */}
        <aside className="hidden flex-col rounded-2xl glass p-4 lg:flex">
          <button
            onClick={newChat}
            className="mb-4 rounded-lg gradient-violet px-3 py-2 text-sm font-semibold text-white btn-glow"
          >
            + New chat
          </button>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">History</div>
          <div className="flex-1 space-y-1 overflow-auto">
            {sessions.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-xs text-muted-foreground">
                No previous chats
              </div>
            ) : (
              sessions.map((s) => {
                const title = titles[s.session_id] ?? (s.preview || "New conversation");
                const isActive = s.session_id === sessionId;
                const isRenaming = renamingId === s.session_id;
                return (
                  <div
                    key={s.session_id}
                    className={`group/item relative rounded-lg border px-3 py-2 text-xs transition ${
                      isActive ? "border-violet/50 bg-violet/10" : "border-transparent hover:border-border hover:bg-white/[0.05]"
                    }`}
                  >
                    {isRenaming ? (
                      <div className="flex items-center gap-1">
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitRename(s.session_id);
                            if (e.key === "Escape") setRenamingId(null);
                          }}
                          className="min-w-0 flex-1 rounded border border-violet/40 bg-background/60 px-2 py-1 text-xs focus:outline-none"
                        />
                        <button onClick={() => commitRename(s.session_id)} className="rounded p-1 text-emerald hover:bg-emerald/10" aria-label="Save">
                          <Check size={12} />
                        </button>
                        <button onClick={() => setRenamingId(null)} className="rounded p-1 text-muted-foreground hover:bg-white/10" aria-label="Cancel">
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => setSessionId(s.session_id)}
                          className="block w-full pr-7 text-left"
                        >
                          <div className="truncate font-medium text-foreground">{title}</div>
                          <div className="text-[10px] text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</div>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpenFor(menuOpenFor === s.session_id ? null : s.session_id);
                          }}
                          className="absolute right-1.5 top-1.5 rounded p-1 text-muted-foreground opacity-0 transition hover:bg-white/10 hover:text-foreground group-hover/item:opacity-100"
                          aria-label="Chat options"
                        >
                          <MoreHorizontal size={14} />
                        </button>
                        {menuOpenFor === s.session_id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-1.5 top-8 z-10 w-32 overflow-hidden rounded-lg border border-border bg-popover/95 shadow-lg backdrop-blur-xl"
                          >
                            <button
                              onClick={() => startRename(s.session_id, title)}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-white/[0.06]"
                            >
                              <Pencil size={12} /> Rename
                            </button>
                            <button
                              onClick={() => deleteSession(s.session_id)}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-rose hover:bg-rose/10"
                            >
                              <Trash2 size={12} /> Delete
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Chat */}
        <section className="flex min-h-0 flex-col rounded-2xl glass">
          <header className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3 md:px-5 md:py-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg gradient-violet glow-violet">
                <Brain size={18} className="text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate font-display text-base font-bold md:text-lg">AI Chat Assistant</h1>
                <p className="hidden text-xs text-muted-foreground sm:block">Ask anything about your finances</p>
              </div>
            </div>
            <button onClick={newChat} className="shrink-0 rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs lg:hidden">
              + New
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-5 overflow-auto px-3 py-4 md:px-5 md:py-6">
            {messages.length === 0 && !sending && (
              <div className="flex h-full flex-col items-center justify-center px-2 text-center">
                <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl gradient-violet glow-violet">
                  <Sparkles className="text-white" size={24} />
                </div>
                <h2 className="font-display text-lg font-semibold md:text-xl">How can I help with your finances today?</h2>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  Try asking: "How much did I spend on dining last month?" or "What's my biggest expense category?"
                </p>
                <div className="mt-6 grid w-full max-w-md gap-2 sm:grid-cols-2">
                  {[
                    "Show my spending by category",
                    "Am I saving enough?",
                    "Where can I cut back?",
                    "Summarize last month",
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => setInput(q)}
                      className="rounded-lg glass px-3 py-2 text-left text-xs glass-hover"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => (
              <MessageBubble key={m.id} msg={m} />
            ))}
            {sending && (
              <div className="flex items-start gap-3">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg gradient-violet">
                  <Brain size={14} className="text-white" />
                </div>
                <div className="flex items-center gap-1.5 rounded-2xl glass px-4 py-3">
                  <Dot /><Dot delay={0.15} /><Dot delay={0.3} />
                </div>
              </div>
            )}
          </div>

          <footer className="border-t border-white/[0.08] p-3 md:p-4">
            <form
              onSubmit={(e) => { e.preventDefault(); send(); }}
              className="flex items-end gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-2 backdrop-blur-xl focus-within:border-violet/60"
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Ask a question..."
                rows={1}
                className="max-h-32 min-h-[44px] flex-1 resize-none bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none"
              />
              <button
                type="submit"
                disabled={!input.trim() || sending}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl gradient-violet text-white btn-glow disabled:opacity-40"
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
              </button>
            </form>
            <p className="mt-2 text-center text-[10px] text-muted-foreground">
              AI responses are generated and may not always be accurate.
            </p>
          </footer>
        </section>
      </div>
    </AppShell>
  );
}

function MessageBubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex items-start gap-2 md:gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${isUser ? "glass" : "gradient-violet glow-violet"}`}>
        {isUser ? <span className="text-xs font-bold">You</span> : <Brain size={14} className="text-white" />}
      </div>
      <div className={`group min-w-0 max-w-[85%] md:max-w-[80%] ${isUser ? "items-end text-right" : ""}`}>
        <div
          className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser ? "gradient-violet text-white" : "glass"
          }`}
        >
          {msg.content}
        </div>
        <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          {!isUser && (
            <button
              onClick={() => { navigator.clipboard.writeText(msg.content); toast.success("Copied"); }}
              className="opacity-0 transition group-hover:opacity-100"
            >
              <Copy size={11} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Dot({ delay = 0 }: { delay?: number }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-violet"
      style={{ animationDelay: `${delay}s`, animationDuration: "0.9s" }}
    />
  );
}
