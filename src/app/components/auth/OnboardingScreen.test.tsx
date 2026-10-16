// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import OnboardingScreen from './OnboardingScreen';
import { completeOnboarding } from '../../../services/onboarding';

vi.mock('../../../services/onboarding', () => ({ completeOnboarding: vi.fn() }));
vi.mock('../ScholarMascot', () => ({ default: () => <div data-mascot="scholar" /> }));
let root: Root, container: HTMLDivElement;
const onComplete = vi.fn();
beforeEach(() => {
  vi.clearAllMocks(); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  vi.mocked(completeOnboarding).mockImplementation(async (undergraduate, focus) => ({ undergraduate, focus, completedAt: '2026-10-16T00:00:00Z' }));
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
async function mount(undergraduate: boolean | null = null) { await act(async () => root.render(<OnboardingScreen name="Ada Okafor" undergraduate={undergraduate} onComplete={onComplete} />)); }
function button(name: string) { const found = [...container.querySelectorAll('button')].find(b => b.textContent?.includes(name)); if (!found) throw Error('Missing button '+name); return found; }
async function click(name: string) { await act(async () => button(name).click()); }
async function search(value: string) { const input = container.querySelector('input')!; await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); }); }

describe('short personalized onboarding', () => {
  it('welcomes the account owner with study paths, not a yes/no question', async () => {
    await mount(); expect(container.textContent).toContain('Welcome, Ada.');
    expect(button('Undergraduate')).toBeDefined(); expect(button('Other learner')).toBeDefined();
    expect(container.querySelector('input[type="radio"]')).toBeNull(); expect(container.querySelector('[data-mascot="scholar"]')).not.toBeNull();
    expect(completeOnboarding).not.toHaveBeenCalled();
  });
  it('finishes an undergraduate after one university choice', async () => {
    await mount(); await click('Undergraduate'); await search('UNILAG');
    expect(container.textContent).not.toMatch(/daily|subjects|course|level|Yes|No\b/);
    expect(container.textContent).toContain('University of Lagos');
    await click('University of Lagos'); await click('Let’s go');
    expect(completeOnboarding).toHaveBeenCalledWith(true, expect.objectContaining({ kind: 'school', name: expect.stringMatching(/^University of Lagos/) }));
    expect(onComplete).toHaveBeenCalledOnce();
  });
  it('lets other learners pick an exam, without admission questions', async () => {
    await mount(); await click('Other learner'); await click('Exam'); await search('IELTS Academic'); await click('IELTS Academic'); await click('Let’s go');
    expect(completeOnboarding).toHaveBeenCalledWith(false, expect.objectContaining({ kind: 'exam', id: 'ielts-academic' }));
  });
  it('allows exploration and clears a school selection when switching to exams', async () => {
    await mount(false); await search('UNILAG'); await click('University of Lagos');
    expect(button('Let’s go').disabled).toBe(false); await click('Exam'); expect(button('Let’s go').disabled).toBe(true);
    await click('Explore without choosing'); expect(completeOnboarding).toHaveBeenCalledWith(false, null);
  });
  it('keeps the selection on failure and prevents duplicate saves', async () => {
    let reject!: (error: Error) => void;
    vi.mocked(completeOnboarding).mockReturnValueOnce(new Promise((_, fail) => { reject = fail; }));
    await mount(true); await search('UNILAG'); await click('University of Lagos');
    const submit = button('Let’s go');
    await act(async () => { submit.click(); submit.click(); });
    expect(completeOnboarding).toHaveBeenCalledTimes(1);
    await act(async () => reject(Error('Connection interrupted.')));
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Connection interrupted.');
    expect(onComplete).not.toHaveBeenCalled(); expect(button('University of Lagos').getAttribute('aria-pressed')).toBe('true');
    await click('Let’s go'); expect(onComplete).toHaveBeenCalledOnce();
  });
});
