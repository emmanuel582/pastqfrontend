// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthScreen } from './AuthScreen';
import { registerUser, loginWithGoogle } from '../../../services/auth';
import { supabase } from '../../../services/supabase';
vi.mock('../../../services/auth', () => ({ registerUser: vi.fn(), loginUser: vi.fn(), loginWithGoogle: vi.fn(), sendPasswordReset: vi.fn() }));
vi.mock('../../../services/supabase', () => ({ supabase: { auth: { getSession: vi.fn(), updateUser: vi.fn(), signOut: vi.fn() } } }));
vi.mock('../ScholarMascot', () => ({ default: () => <div data-mascot="scholar" /> }));
let root: Root, container: HTMLDivElement;
const nav = vi.fn();
beforeEach(() => {
  vi.clearAllMocks(); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.mocked(registerUser).mockResolvedValue({ id: 'ada' });
  vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: { user: { id: 'ada' } } }, error: null } as any);
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
async function mount() { await act(async () => root.render(<AuthScreen mode="signup" nav={nav} />)); }
async function fill(name: string, value: string) { const input = container.querySelector(`input[name="${name}"]`)!; await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); }); }
async function submit() { await act(async () => container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))); }
describe('account creation comes first', () => {
  it('asks only for account details before opening onboarding', async () => {
    await mount(); expect(container.textContent).not.toMatch(/undergraduate|Yes|No\b/); expect(container.querySelectorAll('input')).toHaveLength(3);
    await fill('name','Ada Okafor'); await fill('email','ada@example.com'); await fill('password','password-123'); await submit();
    expect(registerUser).toHaveBeenCalledWith('ada@example.com','password-123','Ada Okafor'); expect(nav).toHaveBeenCalledWith('onboarding');
  });
  it('waits for email confirmation instead of entering unauthenticated onboarding', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: null } as any);
    await mount(); await fill('name','Ada'); await fill('email','ada@example.com'); await fill('password','password-123'); await submit();
    expect(container.textContent).toContain('Confirm your email'); expect(nav).not.toHaveBeenCalled();
  });
  it('allows Google signup without an undergraduate question', async () => {
    await mount(); await act(async () => [...container.querySelectorAll('button')].find(b=>b.textContent==='Continue with Google')!.click());
    expect(loginWithGoogle).toHaveBeenCalledOnce(); expect(registerUser).not.toHaveBeenCalled();
  });
  it('updates a password only after the recovery session and preserves errors for retry', async () => {
    vi.mocked(supabase.auth.updateUser).mockResolvedValueOnce({ error: new Error('Link expired. Request a new reset link.') } as any).mockResolvedValueOnce({ error: null } as any);
    await act(async () => root.render(<AuthScreen mode="recovery" nav={nav} />));
    expect(container.querySelector('input[name="email"]')).toBeNull();
    await fill('password', 'new-password-123'); await submit();
    expect(container.textContent).toContain('Link expired');
    expect((container.querySelector('input[name="password"]') as HTMLInputElement).value).toBe('new-password-123');
    expect(supabase.auth.signOut).not.toHaveBeenCalled();
    await submit(); expect(supabase.auth.updateUser).toHaveBeenLastCalledWith({ password: 'new-password-123' });
    expect(supabase.auth.signOut).toHaveBeenCalledOnce(); expect(container.textContent).toContain('Password updated.');
  });
});
