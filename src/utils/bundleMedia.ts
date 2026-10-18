import { UTME_BUNDLE_ID } from './utme';

/** A saved question count alone cannot establish that its diagrams were saved. */
export function bundleNeedsImageRepair(bundle: any): boolean {
  if (!Array.isArray(bundle?.questions) || !bundle.questions.length) return false;
  let references = 0;
  for (const question of bundle.questions) {
    const fields = [question.questionHtml, ...(question.optionsHtml || []), question.explanationHtml, question.answerHtml];
    if (String(question.question || '').includes('[Illustration]') && !/<img\b/i.test(question.questionHtml || '') && !question.missingAssets?.length && !question.figures?.some((figure: any) => figure.url)) return true;
    for (const html of fields) {
      for (const match of String(html || '').matchAll(/pastq-asset:([a-f0-9]{64})/g)) {
        references++;
        const asset = bundle.assets?.[match[1]];
        if (!asset || !/^image\/(png|jpeg|gif|webp)$/.test(asset.mime) || !/^[A-Za-z0-9+/=\s]+$/.test(asset.data || '')) return true;
      }
    }
  }
  const expected = bundle.sourceAudit?.imageReferences;
  if (typeof expected === 'number' && expected !== references) return true;
  // The original complete UTME bank includes diagrams; older text-only copies
  // must be upgraded even when they contain the same number of questions.
  if (bundle.id === UTME_BUNDLE_ID && (!Number.isInteger(expected) || expected <= 0 || !references)) return true;
  return false;
}
