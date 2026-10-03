// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyTheme, followTheme, readTheme, THEME_STORAGE_KEY } from './theme';

let dark: boolean;
let listeners: Set<() => void>;
beforeEach(() => {
  localStorage.clear(); dark = false; listeners = new Set();
  vi.stubGlobal('matchMedia', vi.fn(() => ({
    get matches() { return dark; }, addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  })));
  delete document.documentElement.dataset.theme;
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function deviceTheme(value: boolean) { dark = value; listeners.forEach(listener => listener()); }

describe('device appearance', () => {
  it('defaults to System and resolves the device theme', () => {
    expect(readTheme()).toBe('system');
    applyTheme(readTheme()); expect(document.documentElement.dataset.theme).toBe('light');
    dark = true; applyTheme('system');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('system');
  });
  it('updates an open app with device changes and cleans up the subscription', () => {
    const stop = followTheme('system');
    deviceTheme(true);
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe('dark');
    deviceTheme(false); expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('system');
    stop(); expect(listeners.size).toBe(0);
    deviceTheme(true); expect(document.documentElement.dataset.theme).toBe('light');
  });
  it('preserves an explicit choice when the system changes', () => {
    const stop = followTheme('dark');
    deviceTheme(false);
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(readTheme()).toBe('dark'); expect(listeners.size).toBe(0); stop();
    dark = true; applyTheme('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(readTheme()).toBe('light');
  });
  it('uses System for invalid settings or unavailable storage', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'invalid'); expect(readTheme()).toBe('system');
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Blocked'); });
    expect(readTheme()).toBe('system'); dark = true;
    expect(() => applyTheme('system')).not.toThrow();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
  it('supports media-query change events in older mobile browsers', () => {
    vi.stubGlobal('matchMedia', () => ({ get matches() { return dark; }, addListener: (listener: () => void) => listeners.add(listener), removeListener: (listener: () => void) => listeners.delete(listener) }));
    const stop = followTheme('system'); deviceTheme(true);
    expect(document.documentElement.dataset.theme).toBe('dark'); stop(); expect(listeners.size).toBe(0);
  });
  it('sets the right appearance before React loads', () => {
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    const startup = html.match(/<script>([\s\S]*?)<\/script>/)![1];
    const boot = new Function('window', 'document', 'localStorage', startup);
    dark = true; boot(window, document, localStorage); expect(document.documentElement.dataset.theme).toBe('dark');
    dark = false; boot(window, document, localStorage); expect(document.documentElement.dataset.theme).toBe('light');
    localStorage.setItem(THEME_STORAGE_KEY, 'dark'); boot(window, document, localStorage);
    expect(document.documentElement.dataset.theme).toBe('dark');
    localStorage.setItem(THEME_STORAGE_KEY, 'system'); boot(window, document, localStorage);
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});
