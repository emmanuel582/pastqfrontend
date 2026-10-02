import { useId, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, Check, Eye, EyeOff } from 'lucide-react';
import { loginUser, registerUser, loginWithGoogle, sendPasswordReset } from '../../../services/auth';
import { StudyArt } from '../library/CatalogBrowser';

type Destination = 'splash' | 'home' | 'login' | 'signup' | 'forgot-password';
interface Props { mode: 'login' | 'signup' | 'reset'; nav: (screen: Destination) => void }

function GoogleMark() {
  return <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><path d="M19.6 10.23c0-.68-.06-1.36-.18-2H10v3.79h5.4c-.23 1.22-.95 2.25-2.01 2.94v2.44h3.26c1.9-1.75 3-4.32 3-7.17z" fill="#4285F4" /><path d="M10 20c2.7 0 4.96-.9 6.61-2.43l-3.26-2.44c-.9.6-2.05.96-3.35.96-2.58 0-4.77-1.74-5.55-4.08H1.1v2.52A10 10 0 0 0 10 20z" fill="#34A853" /><path d="M4.45 12.01A5.97 5.97 0 0 1 4.14 10c0-.7.12-1.37.31-2.01V5.47H1.1A10 10 0 0 0 0 10c0 1.61.39 3.14 1.1 4.53l3.35-2.52z" fill="#FBBC05" /><path d="M10 3.92c1.45 0 2.76.5 3.78 1.48l2.83-2.83A9.97 9.97 0 0 0 10 0 10 10 0 0 0 1.1 5.47l3.35 2.52c.78-2.34 2.97-4.07 5.55-4.07z" fill="#EA4335" /></svg>;
}

export function AuthScreen({ mode, nav }: Props) {
  const id = useId();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState<'email' | 'google' | null>(null);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const submitting = useRef(false);
  const signup = mode === 'signup', reset = mode === 'reset';
  const busy = pending !== null;

  async function authenticate(method: 'email' | 'google') {
    if (submitting.current) return;
    submitting.current = true;
    setError(''); setPending(method);
    try {
      if (method === 'google') { await loginWithGoogle(); return; }
      if (reset) { await sendPasswordReset(email.trim()); setSent(true); }
      else {
        if (signup) await registerUser(email.trim(), password, name.trim());
        else await loginUser(email.trim(), password);
        nav('home');
      }
    } catch (err) {
      setError(err instanceof TypeError || err instanceof SyntaxError ? 'We couldn’t connect. Please try again.' : err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally { setPending(null); submitting.current = false; }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (signup && !name.trim()) { setError('Please enter your name.'); return; }
    void authenticate('email');
  }

  return <main className="study-app auth-screen">
    <header className="auth-topbar">
      <span className="wordmark">past<span>q</span></span>
    </header>
    <div className="auth-layout">
      <aside className="auth-story" aria-label="Your study space">
        <span className="eyebrow">YOUR QUIET ADVANTAGE</span>
        <h2>A little practice.<br />A brighter future.</h2>
        <p>Your papers, practice and progress. Together.</p>
        <StudyArt type="exam_board" />
        <span className="auth-story-foot">One question at a time.</span>
      </aside>
      <section className="auth-form-area" aria-labelledby={`${id}-title`}>
        <header className="auth-heading">
          <span className="eyebrow">YOUR STUDY ROOM</span>
          <h1 id={`${id}-title`}>{sent ? 'Check your inbox.' : reset ? 'Forgot password?' : signup ? 'Create your account.' : 'Welcome back.'}</h1>
          <p>{sent ? <>A reset link is on its way to <strong>{email.trim()}</strong>.</> : reset ? 'We’ll send you a link to reset your password.' : signup ? 'Make room for your next win.' : 'Pick up where you left off.'}</p>
        </header>
        {sent ? <div className="auth-reset-success" role="status"><Check size={28} /><p>Check your spam folder if you don’t see it.</p></div> : <>
          {!reset && <><button type="button" className="auth-google" onClick={() => void authenticate('google')} disabled={busy}><GoogleMark />{pending === 'google' ? 'Connecting…' : 'Continue with Google'}</button><div className="auth-divider"><span />or use your email<span /></div></>}
          <form className="auth-form" onSubmit={submit} aria-busy={busy}>
            {signup && <label className="auth-field" htmlFor={`${id}-name`}><span>Full name</span><input id={`${id}-name`} name="name" autoComplete="name" placeholder="Your full name" value={name} onChange={event => setName(event.target.value)} required disabled={busy} /></label>}
            <label className="auth-field" htmlFor={`${id}-email`}><span>Email address</span><input id={`${id}-email`} name="email" type="email" autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} placeholder="you@example.com" value={email} onChange={event => setEmail(event.target.value)} required disabled={busy} /></label>
            {!reset && <label className="auth-field" htmlFor={`${id}-password`}><span>Password</span><span className="auth-password"><input id={`${id}-password`} name="password" aria-label="Password" type={showPassword ? 'text' : 'password'} autoComplete={signup ? 'new-password' : 'current-password'} placeholder={signup ? 'Create a password' : 'Your password'} value={password} onChange={event => setPassword(event.target.value)} required minLength={signup ? 6 : undefined} disabled={busy} /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)} disabled={busy}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span>{signup && <small>At least 6 characters.</small>}</label>}
            {!signup && !reset && <button type="button" className="auth-forgot" onClick={() => nav('forgot-password')} disabled={busy}>Forgot password?</button>}
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button type="submit" className="study-primary auth-submit" disabled={busy}>{pending === 'email' ? reset ? 'Sending link…' : signup ? 'Creating account…' : 'Signing in…' : reset ? 'Send reset link' : signup ? 'Create account' : 'Sign in'}{!busy && <ArrowRight size={17} />}</button>
          </form>
          {!reset && <p className="auth-switch">{signup ? 'Already have an account?' : 'New to PastQ?'} <button onClick={() => nav(signup ? 'login' : 'signup')} disabled={busy}>{signup ? 'Sign in' : 'Create an account'}</button></p>}
        </>}
      </section>
    </div>
  </main>;
}
