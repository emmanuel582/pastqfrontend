// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import AppWelcome from './AppWelcome';
let root: Root, container: HTMLDivElement;
const onSignup = vi.fn(), onLogin = vi.fn();
beforeEach(async () => {
  vi.clearAllMocks(); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  await act(async () => root.render(<AppWelcome onSignup={onSignup} onLogin={onLogin} />));
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
describe('app welcome', () => {
  it('opens signup and login directly without marketing or extra steps', async () => {
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(container.querySelectorAll('h2,p')).toHaveLength(0);
    for (const label of ['Create account', 'Sign in']) await act(async () => [...container.querySelectorAll('button')].find(button => button.textContent === label)!.click());
    expect(onSignup).toHaveBeenCalledOnce(); expect(onLogin).toHaveBeenCalledOnce();
  });
  it('replays only the hand without replacing or shifting the body image', async () => {
    const body = container.querySelector('image[mask]'); const hand = container.querySelector('.welcome-wave-hand');
    await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Wave with Scholar"]')!.click());
    expect(container.querySelector('image[mask]')).toBe(body);
    expect(container.querySelector('.welcome-wave-hand')).not.toBe(hand);
  });
  it('keeps account actions available if the illustration cannot load', async () => {
    await act(async () => container.querySelector('image[mask]')!.dispatchEvent(new Event('error')));
    expect(container.querySelector('.welcome-scholar-fallback')).not.toBeNull();
    await act(async () => [...container.querySelectorAll('button')].find(button => button.textContent === 'Create account')!.click());
    expect(onSignup).toHaveBeenCalledOnce();
  });
});
