// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CatalogBrowser } from './CatalogBrowser';
import type { LibraryCatalog } from '../../../services/libraryService';

const material = (id: string, name: string) => ({ id, slug: id, name, title: name, bundleId: id, questionCount: 40, subjects: ['Biology'], streams: ['science'] });
const universityPaper = material('ui-paper', 'UI preparation'), waecPaper = material('waec-paper', 'WAEC CBT'), otherPaper = material('custom-paper', 'My notes');
const catalog: LibraryCatalog = { universities: [], organizations: [
  { id: 'ui', slug: 'ui', name: 'University of Ibadan', type: 'university', examTypes: [{ id: 'post-utme', slug: 'post-utme', name: 'Post-UTME', manufacturers: [universityPaper] }] },
  { id: 'waec', slug: 'waec', name: 'WAEC', type: 'exam_board', examTypes: [{ id: 'waec-cbt', slug: 'waec-cbt', name: 'WAEC CBT', manufacturers: [waecPaper] }] },
], ungrouped: [otherPaper] };
let container: HTMLDivElement, root: Root;
const select = vi.fn();
function categoryButton(name: string) { return [...container.querySelectorAll<HTMLButtonElement>('.category-tile')].find(button => button.textContent === name)!; }
function panel(button: HTMLButtonElement) { return document.getElementById(button.getAttribute('aria-controls')!)!; }
async function click(button: HTMLElement) { await act(async () => button.click()); }
async function render(search = '') { await act(async () => root.render(<CatalogBrowser catalog={catalog} search={search} onSelectManufacturer={select} />)); }
beforeEach(() => { (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true; container = document.createElement('div'); document.body.append(container); root = createRoot(container); select.mockReset(); });
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

describe('Browse category accordions', () => {
  it('keeps downloads scoped to institutions, collections and materials instead of broad categories', async () => {
    const download = vi.fn();
    await act(async () => root.render(<CatalogBrowser catalog={catalog} onSelectManufacturer={select} onDownloadMaterials={download} />));
    const button=(name:string)=>container.querySelector<HTMLElement>(`button[aria-label="${name}"]`)!;
    expect(container.querySelector('.category-header .catalog-download')).toBeNull();
    for (const title of ['Schools & universities', 'Tests & qualifications', 'Professional study', 'Other materials']) expect(button(`Download ${title}`)).toBeNull();
    expect(categoryButton('Schools & universities').getAttribute('aria-expanded')).toBe('false');
    await click(categoryButton('Schools & universities'));
    expect(download).not.toHaveBeenCalled();
    await click(button('Download University of Ibadan'));
    expect(download).toHaveBeenLastCalledWith({title:'University of Ibadan',ids:['ui-paper']});
    expect(container.querySelector('.organization-toggle')?.getAttribute('aria-expanded')).toBe('false');
    await click(container.querySelector('.organization-toggle')!);
    await click(button('Download Post-UTME from University of Ibadan'));
    expect(download).toHaveBeenLastCalledWith({title:'Post-UTME',ids:['ui-paper']});
    await click(button('Download UI preparation'));
    expect(download).toHaveBeenLastCalledWith({title:'UI preparation',ids:['ui-paper']});
    expect(container.querySelector('button button')).toBeNull();
    expect(select).not.toHaveBeenCalled();
  });
  it('opens content immediately inside its category and collapses the previous category', async () => {
    await render();
    const school = categoryButton('Schools & universities'), exams = categoryButton('Tests & qualifications');
    expect(school.getAttribute('aria-expanded')).toBe('false');
    expect(container.querySelector('.organization-toggle')).toBeNull();
    await click(school);
    expect(panel(school).parentElement).toBe(school.closest(".category-group"));
    expect(panel(school).textContent).toContain('University of Ibadan');
    expect(panel(school).textContent).not.toContain('WAEC');
    await click(exams);
    expect(panel(school).hidden).toBe(true);
    expect(panel(exams).hidden).toBe(false);
    expect(panel(exams).textContent).toContain('WAEC');
    await click(exams);
    expect(panel(exams).hidden).toBe(true);
    expect(container.querySelector('.organization-toggle')).toBeNull();
  });
  it('keeps material selection connected to the correct exam and organization', async () => {
    await render(); await click(categoryButton('Tests & qualifications'));
    await click(container.querySelector('.organization-toggle')!);
    await click(container.querySelector('.catalog-material-open')!);
    expect(select).toHaveBeenCalledWith(waecPaper, expect.objectContaining({ id: 'waec-cbt' }), expect.objectContaining({ id: 'waec' }));
  });
  it('reveals search matches and still lets the student close the matching category', async () => {
    await render('waec'); const exams = categoryButton('Tests & qualifications');
    expect(panel(exams).hidden).toBe(false);
    expect(panel(exams).textContent).toContain('WAEC CBT');
    expect(panel(categoryButton('Schools & universities')).hidden).toBe(true);
    await click(exams); expect(panel(exams).hidden).toBe(true);
    await render('ibadan'); expect(panel(categoryButton('Schools & universities')).hidden).toBe(false);
    expect(panel(exams).hidden).toBe(true);
  });
  it('keeps ungrouped material reachable instead of losing it during categorization', async () => {
    await render(); const other = categoryButton('Other materials'); await click(other);
    expect(panel(other).textContent).toContain('My notes'); await click(panel(other).querySelector('.catalog-material-open')!);
    expect(select).toHaveBeenCalledWith(otherPaper, expect.objectContaining({ id: 'ungrouped' }), expect.objectContaining({ id: 'ungrouped' }));
  });
});
