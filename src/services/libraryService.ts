import localforage from "localforage";

localforage.config({
  name: "PastQLibrary",
  storeName: "downloaded_bundles",
});

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");

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
  const res = await fetch(`${API_URL}${path}`);
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
  await localforage.setItem(normalized.id, normalized);
  return normalized;
};

export const getOfflineLibrary = async () => {
  const bundles: any[] = [];
  await localforage.iterate((value) => {
    const b = normalizeBundle(value);
    if (b) bundles.push(b);
  });
  return bundles.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
};

export const getOfflineBundle = async (bundleId: string) => {
  const raw = await localforage.getItem(bundleId);
  return normalizeBundle(raw);
};

export const removeOfflineBundle = async (bundleId: string) => {
  await localforage.removeItem(bundleId);
};
