"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart } from "ai";
import { ArrowUp, Bot, Square, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sources } from "@/components/chat/sources";
import { ToolCard } from "@/components/chat/tool-card";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types";

const SUGGESTIONS = ["How do I request a refund?", "Where is my order SA-1001?", "Show my account details", "Talk to a human agent"];

const textOf = (m: ChatMessage) => m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
const isEmpty = (m: ChatMessage) => m.parts.every((p) => p.type !== "text" && !isToolUIPart(p)) || (!textOf(m) && !m.parts.some(isToolUIPart));

export function Chat({ id, initialMessages }: { id: string; initialMessages: ChatMessage[] }) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const isNew = useRef(initialMessages.length === 0); // first reply creates the conversation → refresh the sidebar once

  const { messages, sendMessage, status, stop, error, clearError } = useChat<ChatMessage>({
    id,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      // Server owns history: send only the newest message.
      prepareSendMessagesRequest: ({ id, messages }) => ({ body: { id, message: messages[messages.length - 1] } }),
    }),
    onFinish: () => {
      if (!isNew.current) return;
      isNew.current = false;
      router.refresh(); // show the new conversation in the sidebar (the URL is already /chat/<id>, so nothing to rewrite)
    },
  });

  const busy = status === "submitted" || status === "streaming";
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" }); // braces: an effect must not return a value
  }, [messages, status]);

  function submit(text = input) {
    if (!text.trim() || busy) return;
    clearError();
    sendMessage({ text: text.trim() });
    setInput("");
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center gap-6 pt-[12vh] text-center">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">How can we help today?</h1>
                <p className="mt-2 text-sm text-muted-foreground">Ask about orders, billing, or your account.</p>
              </div>
              <div className="grid w-full max-w-lg gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => submit(s)} className="rounded-xl border px-4 py-3 text-left text-sm transition-colors hover:bg-muted">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className={cn("flex gap-3", m.role === "user" && "justify-end")}>
              {m.role === "assistant" && (
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"><Bot className="h-4 w-4" /></div>
              )}
              <div className={cn("space-y-2", m.role === "user" ? "max-w-[85%]" : "min-w-0 flex-1 pt-0.5")}>
                {isEmpty(m) && <span className="text-sm text-muted-foreground">Thinking…</span>}
                {m.parts.map((p, i) =>
                  p.type === "text" ? (
                    p.text && <div key={i} className={cn("whitespace-pre-wrap text-[15px] leading-relaxed", m.role === "user" && "rounded-2xl bg-muted px-4 py-2.5")}>{p.text}</div>
                  ) : isToolUIPart(p) ? (
                    <ToolCard key={i} part={p} />
                  ) : null,
                )}
                {m.role === "assistant" && <Sources text={textOf(m)} sources={m.metadata?.sources} />}
              </div>
            </div>
          ))}

                    {error && (
            <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <span>{parseError(error)}</span>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border bg-background p-2 shadow-sm focus-within:border-primary">
          <Textarea
            rows={1}
            autoFocus
            value={input}
            placeholder="Message SupportAI"
            aria-label="Message"
            className="max-h-40 min-h-[36px] px-2 py-2"
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
            }}
          />
          {busy ? (
            <Button size="icon" onClick={stop} aria-label="Stop generating"><Square className="h-4 w-4" /></Button>
          ) : (
            <Button size="icon" onClick={() => submit()} disabled={!input.trim()} aria-label="Send message"><ArrowUp className="h-4 w-4" /></Button>
          )}
        </div>
      </div>
    </div>
  );
}

/** The API returns { error: { message } }; useChat surfaces it as the Error message. */
function parseError(err: Error): string {
  try {
    return JSON.parse(err.message)?.error?.message ?? err.message;
  } catch {
    return err.message || "Something went wrong. Please try again.";
  }
}
