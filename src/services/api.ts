/**
 * API base URL helper.
 * - Local: leave VITE_API_URL empty → uses Vite proxy `/api` → localhost:3000
 * - Production: set VITE_API_URL to the HTTPS Hostinger API origin
 *   e.g. https://api.pastq.example
 */
const RAW = (import.meta.env.VITE_API_URL || "").trim().replace(/\/$/, "");

export const API_BASE = RAW;

export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${p}`;
}
