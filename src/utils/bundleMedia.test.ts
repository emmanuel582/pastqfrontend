import { describe, expect, it } from 'vitest';
import { bundleNeedsImageRepair } from './bundleMedia';
const key = 'a'.repeat(64);
const complete = { id: 'original-bank', sourceAudit: { imageReferences: 1 }, questions: [{ question: '[Illustration] Identify this cell.', questionHtml: `<img src="pastq-asset:${key}">`, optionsHtml: [] }], assets: { [key]: { mime: 'image/png', data: 'YWJj' } } };
describe('downloaded diagram completeness', () => {
  it('recognizes complete images and ordinary text-only materials', () => {
    expect(bundleNeedsImageRepair(complete)).toBe(false);
    expect(bundleNeedsImageRepair({ questions: [{ question: 'What is a cell?' }] })).toBe(false);
  });
  it('detects missing assets or removed rich content even at an unchanged question count', () => {
    expect(bundleNeedsImageRepair({ ...complete, assets: {} })).toBe(true);
    expect(bundleNeedsImageRepair({ ...complete, questions: [{ question: '[Illustration] Identify this cell.' }] })).toBe(true);
    expect(bundleNeedsImageRepair({ ...complete, questions: [{ question: 'Identify this cell.', questionHtml: '<div>Identify this cell.</div>' }] })).toBe(true);
  });
  it('checks answer and explanation images too and does not accept incomplete canonical UTME downloads', () => {
    expect(bundleNeedsImageRepair({ questions: [{ question: 'Choose the diagram.', optionsHtml: [`<img src="pastq-asset:${key}">`] }] })).toBe(true);
    expect(bundleNeedsImageRepair({ id:'utme-testdriller-2027', questions:[{question:'A question'}] })).toBe(true);
  });
  it('checks theory answer images and keeps explicitly flagged source defects from causing a repair loop', () => {
    expect(bundleNeedsImageRepair({questions:[{question:'Explain this.',answerHtml:`<img src="pastq-asset:${key}">`}]})).toBe(true);
    expect(bundleNeedsImageRepair({sourceAudit:{imageReferences:0},questions:[{question:'[Illustration] from source',questionHtml:'Source diagram unavailable.',missingAssets:[{reason:'empty_source_image'}]}]})).toBe(false);
  });
});
