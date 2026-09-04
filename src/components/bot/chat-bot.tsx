"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Bot, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { botDataAnswer } from "@/lib/actions/bot";
import {
  matchIntent,
  DATA_SUGGESTIONS,
  HELP_SUGGESTIONS,
  FALLBACK,
} from "@/lib/bot/intents";

type Msg = { role: "user" | "bot"; text: string };

const WELCOME: Msg = {
  role: "bot",
  text: "Hi! I'm the Stackceipt assistant. Ask me how something works, or — once you're signed in — about your spend and renewals.",
};

function orgSlugFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/app\/([^/]+)/);
  return m ? (m[1] ?? null) : null;
}

export function ChatBot() {
  const pathname = usePathname();
  const orgSlug = orgSlugFromPath(pathname);
  const inApp = Boolean(orgSlug);

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setIsOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  // Keep the transcript scrolled to the latest message.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || thinking) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: question }]);

    const match = matchIntent(question);

    if (!match) {
      setMessages((prev) => [...prev, { role: "bot", text: FALLBACK }]);
      return;
    }
    if (match.kind === "text") {
      setMessages((prev) => [...prev, { role: "bot", text: match.answer }]);
      return;
    }

    // Live-data question.
    if (!orgSlug) {
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "Open your workspace (sign in or the live demo) and I can answer that from your real numbers." },
      ]);
      return;
    }
    setThinking(true);
    try {
      const answer = await botDataAnswer(match.metric, orgSlug);
      setMessages((prev) => [...prev, { role: "bot", text: answer }]);
    } catch {
      setMessages((prev) => [...prev, { role: "bot", text: "Sorry — I couldn't reach your workspace data just now. Please try again." }]);
    } finally {
      setThinking(false);
    }
  }

  const suggestions = inApp ? DATA_SUGGESTIONS : HELP_SUGGESTIONS;

  return (
    <div ref={containerRef} className="fixed bottom-5 right-4 z-50 sm:bottom-6 sm:right-6">
      {isOpen && (
        <section
          role="dialog"
          aria-modal="false"
          aria-labelledby="chatbot-title"
          className="absolute bottom-[calc(100%+12px)] right-0 flex h-[min(70vh,560px)] w-[calc(100vw-32px)] max-w-[380px] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-[0_18px_50px_-24px_rgba(0,0,0,0.35)]"
        >
          <div className="flex items-start justify-between border-b border-border px-5 py-4">
            <div>
              <h2 id="chatbot-title" className="flex items-center gap-2 text-base font-semibold tracking-tight">
                <Bot className="size-4" /> Stackceipt assistant
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">Answers, no waiting. No AI, no data leaves your workspace.</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="-mr-2 -mt-2 size-8"
              aria-label="Close assistant"
              onClick={() => setIsOpen(false)}
            >
              <X />
            </Button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user"
                    ? "ml-auto w-fit max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground"
                    : "mr-auto w-fit max-w-[90%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-secondary px-3.5 py-2 text-sm leading-6 text-foreground"
                }
              >
                {m.text}
              </div>
            ))}
            {thinking && (
              <div className="mr-auto w-fit rounded-2xl rounded-bl-sm bg-secondary px-3.5 py-2 text-sm text-muted-foreground">
                Checking your workspace…
              </div>
            )}
          </div>

          <div className="border-t border-border px-4 py-3">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  disabled={thinking}
                  className="rounded-full border border-border bg-transparent px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void send(input);
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question…"
                aria-label="Ask the assistant a question"
                className="h-9 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              />
              <Button type="submit" size="icon" className="size-9 shrink-0" aria-label="Send" disabled={thinking || !input.trim()}>
                <Send className="size-4" />
              </Button>
            </form>
          </div>
        </section>
      )}

      <Button
        type="button"
        size="lg"
        className="h-11 gap-2 rounded-lg px-4 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.55)]"
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close assistant" : "Open assistant"}
        onClick={() => setIsOpen((open) => !open)}
      >
        {isOpen ? <X /> : <Bot />}
        {isOpen ? "Close" : "Ask"}
      </Button>
    </div>
  );
}
