export const UTME_BUNDLE_ID = 'utme-testdriller-2027';
export const isLegacyUtmeBundle = (id: unknown) => typeof id === 'string' && /^utme2027-(res|lecture)-/.test(id);
