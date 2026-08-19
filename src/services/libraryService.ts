import localforage from "localforage";
import { supabase } from "./supabase";

// Single offline store for extracted + downloaded bundles
localforage.config({
  name: "PastQLibrary",
  storeName: "downloaded_bundles",
});

function normalizeBundle(raw: any) {
  if (!raw || typeof raw !== "object") return null;
  const questions = Array.isArray(raw.questions)
    ? raw.questions
    : Array.isArray(raw.data?.questions)
      ? raw.data.questions
      : [];
  return {
    ...raw,
    id: raw.id || raw.bundle_id || crypto.randomUUID(),
    title: raw.title || raw.name || "Untitled Material",
    icon: raw.icon || "📚",
    questions,
    groups: raw.groups || [],
  };
}

export const getGlobalLibrary = async () => {
  const { data, error } = await supabase.from("library_bundles").select("*");
  if (error) throw error;
  return (data || []).map(normalizeBundle).filter(Boolean);
};

export const downloadBundle = async (bundleId: string) => {
  const { data, error } = await supabase.from("library_bundles").select("*").eq("id", bundleId).single();
  if (error) throw error;
  if (!data) throw new Error("Bundle not found");

  const bundle = normalizeBundle(data);
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
