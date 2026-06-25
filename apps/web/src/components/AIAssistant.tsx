"use client";

import { useCurrentFamily, useInsights, useSendChat } from "@/lib/queries";
import type { ConversationMessage } from "@niki/shared-types";
import { useEffect, useRef, useState } from "react";

const SUGGESTED_QUERIES = [
  "What events do we have this week?",
  "How much have we spent on food?",
  "What tasks are overdue?",
  "What are our savings goals?",
];

export function AIAssistant() {
  const { family } = useCurrentFamily();
  const sendChat = useSendChat();
  const { data: insights = [] } = useInsights(family?.familyId);

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function send(query: string) {
    if (!query.trim() || !family) return;
    const userMsg: ConversationMessage = {
      role: "user",
      content: query,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    try {
      const result = await sendChat.mutateAsync({
        familyId: family.familyId,
        query,
        conversationId,
      });
      setConversationId(result.conversationId);
      setMessages((prev) => [...prev, result.message]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          createdAt: new Date().toISOString(),
        },
      ]);
    }
  }

  if (!family) return null;

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition hover:scale-105"
          aria-label="Open AI Assistant"
        >
          <span className="text-2xl">N</span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-0 right-0 z-50 flex h-[600px] max-h-screen w-full flex-col border-l border-t border-gray-200 bg-white shadow-2xl sm:w-96">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">N</div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Niki Assistant</p>
                <p className="text-xs text-gray-500">Powered by your family data</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
            </button>
          </div>

          {/* Insights */}
          {insights.length > 0 && messages.length === 0 && (
            <div className="border-b border-gray-100 p-3">
              <p className="mb-2 text-xs font-semibold text-gray-500">INSIGHTS</p>
              <div className="space-y-1.5">
                {insights.slice(0, 4).map((ins, i) => (
                  <div
                    key={i}
                    className={`rounded-card px-2.5 py-2 text-xs ${
                      ins.severity === "warning" ? "bg-warning/10 text-warning" :
                      ins.severity === "positive" ? "bg-success/10 text-success" :
                      "bg-gray-50 text-gray-600"
                    }`}
                  >
                    <span className="font-medium">{ins.title}</span>
                    <span className="ml-1">{ins.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-center text-sm text-gray-500">
                  Ask me anything about your family schedule, tasks, finances, and more.
                </p>
                <div className="space-y-1.5">
                  {SUGGESTED_QUERIES.map((q) => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      className="block w-full rounded-card border border-gray-200 px-3 py-2 text-left text-sm text-gray-700 hover:border-primary hover:bg-primary/5"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-card px-3 py-2 text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-white"
                      : "bg-gray-100 text-gray-900"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {msg.citations.map((c, ci) => (
                        <span
                          key={ci}
                          className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-medium"
                        >
                          {c.type}: {c.title.slice(0, 30)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {sendChat.isPending && (
              <div className="flex justify-start">
                <div className="rounded-card bg-gray-100 px-3 py-2 text-sm text-gray-500">
                  Thinking...
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 p-3">
            <form
              onSubmit={(e) => { e.preventDefault(); send(input); }}
              className="flex gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Niki..."
                className="flex-1 rounded-card border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
              <button
                type="submit"
                disabled={!input.trim() || sendChat.isPending}
                className="rounded-card bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
