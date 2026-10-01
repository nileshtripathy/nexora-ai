"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;

export function TicketStatusSelect({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function change(next: string) {
    const previous = value;
    setValue(next); setBusy(true); setError("");
    try {
      const res = await fetch(`/api/admin/tickets/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: next }) });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error?.message ?? "Update failed");
      router.refresh();
    } catch (e) {
      setValue(previous); // roll back the optimistic change
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <select aria-label="Ticket status" value={value} disabled={busy} onChange={(e) => change(e.target.value)} className="h-8 rounded-md border bg-background px-2 text-xs disabled:opacity-50">
        {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ").toLowerCase()}</option>)}
      </select>
      {error && <p role="alert" className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
