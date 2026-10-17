import localforage from "localforage";
import { apiUrl } from "./api";
import { UTME_BUNDLE_ID, isLegacyUtmeBundle } from "../utils/utme";
import { bundleNeedsImageRepair } from '../utils/bundleMedia';

localforage.config({
  name: "PastQLibrary",
  storeName: "downloaded_bundles",
});


export interface CatalogUniversity {
  id: string;
  slug: string;
  name: string;
  shortName?: string | null;
  type?: "university" | "polytechnic" | "college" | "school" | "exam_board" | "professional_body" | "publisher" | "other";
  country?: string | null;
  confidence?: number;
  examTypes: CatalogExamType[];
}

export interface CatalogExamType {
  id: string;
  slug: string;
  name: string;
  kind?: string;
  manufacturers: CatalogManufacturer[];
  materials?: CatalogManufacturer[];
}

export interface CatalogManufacturer {
  id: string;
  slug: string;
  name: string;
  title?: string;
  icon?: string;
  bundleId: string;
  manufacturerSource?: string;
  yearMin?: number | null;
  yearMax?: number | null;
  questionCount?: number;
  subjects?: string[];
  streams?: string[];
  groupingStatus?: "grouped" | "ungrouped";
  groupConfidence?: number;
  educationLevel?: string | null;
  faculty?: string | null;
  department?: string | null;
  programme?: string | null;
  courseCode?: string | null;
}

export interface LibraryCatalog {
  schemaVersion?: number;
  organizations?: CatalogUniversity[];
  universities: CatalogUniversity[];
  ungrouped?: CatalogManufacturer[];
  updatedAt?: string | null;
}

function normalizeBundle(raw: any) {
  if (!raw || typeof raw !== "object") return null;

  let parsedDesc = null;
  if (typeof raw.description === "string" && raw.description.startsWith("{")) {
    try {
      parsedDesc = JSON.parse(raw.description);
    } catch (e) {}
  }

  const questions = Array.isArray(raw.questions)
    ? raw.questions
    : Array.isArray(raw.data?.questions)
      ? raw.data.questions
      : Array.isArray(parsedDesc?.questions)
        ? parsedDesc.questions
        : [];

  return {
    ...raw,
    ...parsedDesc,
    id: raw.id || raw.bundle_id || crypto.randomUUID(),
    title: raw.title || raw.name || "Untitled Material",
    updatedAt: raw.updatedAt || raw.updated_at || null,
    icon: raw.icon || "📚",
    questions,
    groups: raw.groups || parsedDesc?.groups || [],
    university: raw.university,
    examType: raw.examType,
    manufacturer: raw.manufacturer,
    manufacturerSource: raw.manufacturerSource,
  };
}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(apiUrl(path));
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

async function getGlobalLibraryFromApi() {
  const data = await apiGet<{ bundles?: any[]; materials?: any[] }>("/api/library/bundles");
  const list = data.bundles || data.materials || [];
  return list.map(normalizeBundle).filter(Boolean);
}

export const getGlobalCatalog = async (): Promise<LibraryCatalog> => {
  return apiGet<LibraryCatalog>("/api/library/catalog");
};

export const getGlobalLibrary = async () => {
  return getGlobalLibraryFromApi();
};

export const getBundleFromApi = async (bundleId: string) => {
  const raw = await apiGet<any>(`/api/library/bundles/${bundleId}`);
  const bundle = normalizeBundle(raw);
  if (!bundle) throw new Error("Invalid bundle");
  return bundle;
};

export const downloadBundle = async (bundleId: string) => {
  const bundle = await getBundleFromApi(bundleId);
  if (!bundle) throw new Error("Bundle not found");
  await localforage.setItem(bundle.id, bundle);
  return bundle;
};

export const saveBundle = async (bundle: any) => {
  const normalized = normalizeBundle(bundle);
  if (!normalized) throw new Error("Invalid bundle");
  const key = normalized.sourceSessionId && normalized.ownerId ? `private:${normalized.ownerId}:${normalized.id}` : normalized.id;
  await localforage.setItem(key, normalized);
  return normalized;
};

/** Restore incomplete public downloads before an exam, including equal-count updates. */
export const ensureBundleImages = async (bundle: any, onRepair?: () => void) => {
  if (bundle?.sourceSessionId || !bundleNeedsImageRepair(bundle)) return bundle;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new Error('Connect once to restore the images in this saved material.');
  onRepair?.();
  try {
    const complete = await getBundleFromApi(bundle.id);
    if (bundleNeedsImageRepair(complete)) throw new Error('Incomplete image download');
    return await saveBundle(complete);
  } catch { throw new Error('Could not restore the question images. Check your connection and try again.'); }
};

export const getOfflineLibrary = async (ownerId?: string) => {
  const bundles: any[] = [];
  await localforage.iterate((value) => {
    const b = normalizeBundle(value);
    // Older extraction previews were cached before review with no account scope.
    // They are drafts, not saved library materials, and must not cross accounts.
    if (b && !b.sourceSessionId && !b.approvedAt && !b.manufacturer && !b.organization && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(b.id)) return;
    if (b && (!b.sourceSessionId || b.ownerId === ownerId)) bundles.push(b);
  });
  const hasCompleteUtme = bundles.some(bundle => bundle.id === UTME_BUNDLE_ID && bundle.kind === 'utme-bank'
    && bundle.questions.length === bundle.sourceAudit?.questions && !bundleNeedsImageRepair(bundle));
  return bundles.filter(bundle => !hasCompleteUtme || !isLegacyUtmeBundle(bundle.id))
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
};

export const getOfflineBundle = async (bundleId: string, ownerId?: string) => {
  if (isLegacyUtmeBundle(bundleId)) {
    const combined = normalizeBundle(await localforage.getItem(UTME_BUNDLE_ID));
    if (combined?.kind === 'utme-bank' && combined.questions.length === combined.sourceAudit?.questions && !bundleNeedsImageRepair(combined)) return combined;
  }
  const raw = (ownerId && await localforage.getItem(`private:${ownerId}:${bundleId}`)) || await localforage.getItem(bundleId);
  if ((raw as any)?.sourceSessionId && (raw as any)?.ownerId !== ownerId) return null;
  return normalizeBundle(raw);
};

export const removeOfflineBundle = async (bundleId: string) => {
  await localforage.removeItem(bundleId);
};
