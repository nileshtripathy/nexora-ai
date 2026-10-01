import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

/** Deterministic timestamp (UTC) so server- and client-rendered output always match. */
export const fmtDate = (d: Date | string) => new Date(d).toISOString().replace("T", " ").slice(0, 16) + " UTC";
