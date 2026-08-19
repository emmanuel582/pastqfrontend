import { apiUrl } from "./api";

export type VisionFollowUp = {
  id: string;
  type: string;
  status: string;
  message: string;
  pageId?: string | null;
  meta?: Record<string, unknown>;
};

export type VisionGroup = {
  year: string;
  paper: string;
  questionIds: number[];
  count: number;
};

export type VisionSession = {
  id: string;
  name: string;
  icon?: string;
  status: string;
  progress?: {
    total: number;
    done: number;
    failed: number;
    needsInput: number;
    skipped: number;
    pending?: number;
  };
  groups?: VisionGroup[];
  followUps?: VisionFollowUp[];
  questions?: any[];
  memory?: {
    activeYear?: string | null;
    activePaper?: string | null;
    countsByGroup?: Record<string, number>;
  };
  pages?: Array<{
    id: string;
    index: number;
    status: string;
    retryCount?: number;
    pageType?: string | null;
    error?: string | null;
  }>;
  cost?: Record<string, number>;
};

export async function createVisionSession(payload: {
  name?: string;
  icon?: string;
  subjectHint?: string;
}): Promise<VisionSession> {
  const res = await fetch(apiUrl("/api/vision/sessions"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(body || `Failed to create session (${res.status})`);
  }
  return res.json();
}

export async function uploadSessionPages(sessionId: string, files: File[]): Promise<VisionSession> {
  const form = new FormData();
  for (const f of files) form.append("images", f);
  const res = await fetch(apiUrl(`/api/vision/sessions/${sessionId}/pages`), {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error("Failed to upload pages");
  return res.json();
}

export async function uploadSessionPdf(sessionId: string, file: File): Promise<void> {
  const form = new FormData();
  form.append("pdf", file);
  const res = await fetch(apiUrl(`/api/vision/sessions/${sessionId}/pdf`), {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error("Failed to upload PDF");
}

export async function getVisionSession(sessionId: string): Promise<VisionSession> {
  const res = await fetch(apiUrl(`/api/vision/sessions/${sessionId}`));
  if (!res.ok) throw new Error("Session not found");
  return res.json();
}

export async function resumeVisionSession(sessionId: string): Promise<VisionSession> {
  const res = await fetch(apiUrl(`/api/vision/sessions/${sessionId}/resume`), {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to resume");
  return res.json();
}

export async function replyVisionFollowUp(
  sessionId: string,
  opts: {
    followUpId?: string;
    message?: string;
    action?: string;
    year?: string;
    paper?: string;
    image?: File | null;
  }
): Promise<VisionSession> {
  const form = new FormData();
  if (opts.followUpId) form.append("followUpId", opts.followUpId);
  if (opts.message) form.append("message", opts.message);
  if (opts.action) form.append("action", opts.action);
  if (opts.year) form.append("year", opts.year);
  if (opts.paper) form.append("paper", opts.paper);
  if (opts.image) form.append("image", opts.image);

  const res = await fetch(apiUrl(`/api/vision/sessions/${sessionId}/reply`), {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error("Failed to reply");
  return res.json();
}

/** Sort phone photos for stable page order (name, then lastModified). */
export function sortUploadFiles(files: File[]): File[] {
  return [...files].sort((a, b) => {
    const byName = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
    if (byName !== 0) return byName;
    return (a.lastModified || 0) - (b.lastModified || 0);
  });
}
