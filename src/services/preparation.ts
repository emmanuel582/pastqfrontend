export type Preparation = { enabled: boolean; activeEnvironment: string | null };
export type SavedEnvironment = { id: string; name: string; organization: string; materials: any[] };
const empty: Preparation = { enabled: false, activeEnvironment: null };
const text = (value: unknown): string => typeof value === 'string' ? value.trim() : value && typeof value === 'object' ? text((value as any).name) : '';

/** Use the material's own taxonomy. Publishers stay distinct within each exam. */
export function environmentFor(material: any): Omit<SavedEnvironment, 'materials'> {
  const meta = material.libraryMeta || {};
  const organization = text(material.organization) || text(meta.organization) || text(material.university);
  const exam = text(material.exam) || text(meta.exam) || text(material.examType);
  const name = exam || text(material.title) || text(material.name) || 'Your material';
  // Personal uploads without an exam retain their individual identity and document structure.
  const identity = exam ? [text(material.organization?.id) || organization, exam].join(':') : `material:${material.id}`;
  return { id: identity.toLowerCase(), name, organization };
}
export function savedEnvironments(materials: any[]): SavedEnvironment[] {
  const groups = new Map<string, SavedEnvironment>();
  for (const material of materials) {
    if (!material.questions?.length) continue;
    const environment = environmentFor(material);
    if (!groups.has(environment.id)) groups.set(environment.id, { ...environment, materials: [] });
    groups.get(environment.id)!.materials.push(material);
  }
  return [...groups.values()];
}
export function publisherName(material: any): string {
  return text(material.publisher) || text(material.libraryMeta?.publisher) || text(material.manufacturer) || (material.sourceSessionId ? 'Your upload' : 'Saved material');
}
export function readPreparation(owner: string): Preparation {
  if (!owner) return { ...empty };
  try {
    const raw = JSON.parse(localStorage.getItem(`pastq-preparation:${owner}`) || 'null');
    return { enabled: raw?.enabled === true, activeEnvironment: typeof raw?.activeEnvironment === 'string' ? raw.activeEnvironment : null };
  } catch { return { ...empty }; }
}
export function savePreparation(owner: string, value: Preparation): void {
  if (owner) try { localStorage.setItem(`pastq-preparation:${owner}`, JSON.stringify(value)); } catch { /* Current session remains usable. */ }
}
