import { randomUUID } from "node:crypto";

type Handler = (req: Request) => Promise<Response>;

/** Calls the chat route like the browser does and parses the UI-message SSE stream. */
export async function postChat(POST: Handler, text: string, id: string = randomUUID(), raw?: unknown) {
  const body = raw ?? { id, message: { parts: [{ type: "text", text }] } };
  const res = await POST(new Request("http://localhost/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: typeof body === "string" ? body : JSON.stringify(body) }));
  const rawText = await res.text();
  const events = rawText.split("\n").filter((l) => l.startsWith("data: ") && l !== "data: [DONE]").map((l) => JSON.parse(l.slice(6)));
  return {
    id, status: res.status, raw: rawText, events,
    json: res.headers.get("content-type")?.includes("application/json") ? JSON.parse(rawText) : null,
    text: events.filter((e) => e.type === "text-delta").map((e) => e.delta).join(""),
    toolCalls: events.filter((e) => e.type === "tool-input-available"),
    toolResults: events.filter((e) => e.type === "tool-output-available"),
    sources: (events.find((e) => e.type === "start" && e.messageMetadata)?.messageMetadata?.sources ?? []) as { title: string; score: number }[],
  };
}
