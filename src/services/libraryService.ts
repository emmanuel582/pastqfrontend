import localforage from "localforage";
import { supabase } from "./supabase";

localforage.config({
  name: "PastQLibrary",
  storeName: "downloaded_bundles",
});

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");
const LIBRARY_SOURCE = (import.meta.env.VITE_LIBRARY_SOURCE || "api").toLowerCase();

export interface CatalogUniversity {
  id: string;
  slug: string;
  name: string;
  examTypes: CatalogExamType[];
}

export interface CatalogExamType {
  id: string;
  slug: string;
  name: string;
  manufacturers: CatalogManufacturer[];
}

export interface CatalogManufacturer {
  id: string;
  slug: string;
  name: string;
  bundleId: string;
  manufacturerSource?: string;
  yearMin?: number | null;
  yearMax?: number | null;
  questionCount?: number;
  subjects?: string[];
}

export interface LibraryCatalog {
  universities: CatalogUniversity[];
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

async function getGlobalLibraryFromSupabase() {
  const { data, error } = await supabase.from("library_bundles").select("*");
  if (error) throw error;
  return (data || []).map(normalizeBundle).filter(Boolean);
}

async function getGlobalLibraryFromApi() {
  const data = await apiGet<{ bundles?: any[]; materials?: any[] }>("/api/library/bundles");
  const list = data.bundles || data.materials || [];
  return list.map(normalizeBundle).filter(Boolean);
}

export const getGlobalCatalog = async (): Promise<LibraryCatalog> => {
  try {
    return await apiGet<LibraryCatalog>("/api/library/catalog");
  } catch (err) {
    console.warn("[library] catalog API failed, building flat fallback", err);
    const bundles = await getGlobalLibrary();
    return {
      universities: [
        {
          id: "general",
          slug: "general",
          name: "All Materials",
          examTypes: [
            {
              id: "all",
              slug: "all",
              name: "Past Questions",
              manufacturers: bundles.map((b: any) => ({
                id: b.id,
                slug: b.id,
                name: b.title || b.name,
                bundleId: b.id,
                questionCount: b.questions?.length || b.question_count || 0,
                subjects: [...new Set((b.questions || []).map((q: any) => q.subject).filter(Boolean))],
              })),
            },
          ],
        },
      ],
    };
  }
};

export const getGlobalLibrary = async () => {
  if (LIBRARY_SOURCE === "supabase") {
    return getGlobalLibraryFromSupabase();
  }
  try {
    return await getGlobalLibraryFromApi();
  } catch (err) {
    console.warn("[library] API failed, falling back to Supabase", err);
    try {
      return await getGlobalLibraryFromSupabase();
    } catch {
      return [];
    }
  }
};

export const getBundleFromApi = async (bundleId: string) => {
  const raw = await apiGet<any>(`/api/library/bundles/${bundleId}`);
  const bundle = normalizeBundle(raw);
  if (!bundle) throw new Error("Invalid bundle");
  return bundle;
};

export const downloadBundle = async (bundleId: string) => {
  let bundle;
  if (LIBRARY_SOURCE === "supabase") {
    const { data, error } = await supabase.from("library_bundles").select("*").eq("id", bundleId).single();
    if (error) throw error;
    bundle = normalizeBundle(data);
  } else {
    try {
      bundle = await getBundleFromApi(bundleId);
    } catch {
      const { data, error } = await supabase.from("library_bundles").select("*").eq("id", bundleId).single();
      if (error) throw error;
      bundle = normalizeBundle(data);
    }
  }
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
