/**
 * API base URL helper.
 * - Local: leave VITE_API_URL empty → uses Vite proxy `/api` → localhost:3000
 * - Production (Vercel): set VITE_API_URL to your Render backend URL
 *   e.g. https://pastq-backend.onrender.com
 */
const RAW = (import.meta.env.VITE_API_URL || "").trim().replace(/\/$/, "");

export const API_BASE = RAW;

export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${p}`;
}
