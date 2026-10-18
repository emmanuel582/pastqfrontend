import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Bell, Bookmark, BookOpen, Check, History, ChevronRight, Monitor, Moon, Sun } from 'lucide-react';
import ContentSkeleton from '../ContentSkeleton';
import ReadyImage from '../ReadyImage';
import ScholarMascot from '../ScholarMascot';
import { type StudyTheme } from '../../../utils/theme';
import { getReminders, saveReminders, enableReminders, testReminder, reminderPortrait, currentDeviceId, notificationSupport, deviceTimezone, syncStudyHistory, type ReminderSettings, type ReminderSnapshot } from '../../../services/reminders';

type History = { id?: string; score?: number; total_questions?: number; graded_total?: number; total?: number; completed_at?: string; created_at?: string; title?: string };
const label = (theme: StudyTheme) => theme === 'system' ? 'System' : theme === 'light' ? 'Light' : 'Dark';
function progressData(sessions: History[]) {
  return sessions.flatMap(session => {
    const total = Number(session.graded_total ?? session.total_questions ?? session.total), score = Number(session.score), at = Date.parse(session.completed_at || session.created_at || '');
    return total > 0 && Number.isFinite(score) && score >= 0 && score <= total && Number.isFinite(at) ? [{ score: Math.round(score / total * 100), at }] : [];
  }).sort((a, b) => a.at - b.at);
}
export function PreferencesScreen({ ownerId, name, email, avatar, sessions, theme, onTheme, onReminders, onNotifications, onProgress, onSavedQuestions, onStudy = onProgress, preparationEnabled = false, onPreparation }: { ownerId: string; name: string; email: string; avatar: string; sessions: History[]; theme: StudyTheme; onTheme: () => void; onReminders: () => void; onNotifications?: () => void; onProgress: () => void; onSavedQuestions?: () => void; onStudy?: () => void; preparationEnabled?: boolean; onPreparation?: (enabled: boolean) => void }) {
  const data = progressData(sessions), recent = data.slice(-10), average = data.length ? Math.round(data.reduce((sum, item) => sum + item.score, 0) / data.length) : null;
  const [reminders, setReminders] = useState<ReminderSnapshot | null>(null);
  const [remindersLoading, setRemindersLoading] = useState(true);
  useEffect(() => { let active = true; setRemindersLoading(true); getReminders(ownerId).then(value => { if (active) setReminders(value); }).catch(() => {}).finally(() => { if (active) setRemindersLoading(false); }); return () => { active = false; }; }, [ownerId]);
  const initials = (name || 'Student').split(/\s+/).map(word => word[0]).slice(0, 2).join('').toUpperCase();
  const reminderLabel = !reminders ? 'Manage reminders' : reminders.settings.enabled ? reminders.settings.pausedUntil && Date.parse(reminders.settings.pausedUntil) > Date.now() ? 'Paused' : `${reminders.settings.mode === 'smart' ? 'Smart timing' : 'Daily'} · ${reminders.preview.targetTime}` : 'Off';
  return <main className="study-app student-preferences">
    <header className="study-topbar student-preferences-header"><h1>Preferences</h1></header>
    <div className="student-preferences-content">
      <div className="student-identity">{avatar ? <ReadyImage src={avatar} alt="" fallback={<span className="student-initials">{initials}</span>} /> : <span className="student-initials" aria-hidden="true">{initials}</span>}<div><strong>{name || 'Student'}</strong><span>{email}</span></div></div>
      <div className="student-settings-list student-practice-links"><button onClick={onProgress}><span className="student-setting-icon"><History size={20} /></span><span><strong>Past sessions</strong></span><ChevronRight size={19} /></button>{onSavedQuestions && <button onClick={onSavedQuestions}><span className="student-setting-icon"><Bookmark size={20} /></span><span><strong>Saved questions</strong></span><ChevronRight size={19} /></button>}</div>
      {sessions.length > 0 ? <section className="student-progress" aria-labelledby="student-progress-title"><div className="student-section-heading"><h2 id="student-progress-title">Your progress</h2></div>
        <dl className="student-stats"><div><dt>Sessions</dt><dd>{sessions.length}</dd></div><div><dt>Average</dt><dd>{average === null ? '—' : `${average}%`}</dd></div><div><dt>Best</dt><dd>{data.length ? `${Math.max(...data.map(item => item.score))}%` : '—'}</dd></div></dl>
        {recent.length ? <div className="student-chart"><svg viewBox="0 0 560 180" role="img" aria-label={`Scores from your last ${recent.length} graded sessions. Latest score ${recent[recent.length - 1].score} percent.`}>
          {[0, 50, 100].map(value => <g key={value}><line x1="32" x2="540" y1={150 - value * 1.25} y2={150 - value * 1.25} /><text x="24" y={154 - value * 1.25} textAnchor="end">{value}</text></g>)}
          <polyline points={recent.map((item, index) => `${recent.length === 1 ? 286 : 42 + index * 488 / (recent.length - 1)},${150 - item.score * 1.25}`).join(' ')} />
          {recent.map((item, index) => <circle key={`${item.at}-${index}`} cx={recent.length === 1 ? 286 : 42 + index * 488 / (recent.length - 1)} cy={150 - item.score * 1.25} r={index === recent.length - 1 ? 4 : 3}><title>{`${new Date(item.at).toLocaleDateString()} · ${item.score}%`}</title></circle>)}
        </svg><div className="student-chart-dates"><span>{new Date(recent[0].at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span><span>{new Date(recent[recent.length - 1].at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span></div></div> : <div className="student-chart-empty">Complete a session to see your progress.</div>}
      </section> : <section className="student-first-progress"><ScholarMascot state="study" /><h2>Start with one paper.</h2><button className="study-primary" onClick={onStudy}>Find a paper<ArrowRight size={16} /></button></section>}
      <div className="student-settings-list">{onNotifications && <button onClick={onNotifications}><span className="student-setting-icon"><Bell size={20} /></span><span><strong>Notifications</strong><small>Your messages from PastQ</small></span><ChevronRight size={19} /></button>}<button onClick={onTheme}><span className="student-setting-icon">{theme === 'dark' ? <Moon size={20} /> : theme === 'light' ? <Sun size={20} /> : <Monitor size={20} />}</span><span><strong>Theme</strong><small>{label(theme)}</small></span><ChevronRight size={19} /></button><button onClick={onReminders}><span className="student-setting-icon"><Bell size={20} /></span><span><strong>Study reminders</strong><small>{!remindersLoading ? reminderLabel : <span className="skeleton-block skeleton-inline" aria-label="Loading reminder status" />}</small></span><ChevronRight size={19} /></button></div>
      {onPreparation && <div className="preparation-preference"><span className="student-setting-icon"><BookOpen size={20} /></span><div><strong>Preparation environment</strong><small>Open your downloaded exams first.</small></div><button className="student-switch" type="button" role="switch" aria-label="Preparation environment" aria-checked={preparationEnabled} onClick={() => onPreparation(!preparationEnabled)}><span /></button></div>}
    </div>
  </main>;
}
export function ThemeScreen({ theme, onTheme, onBack }: { theme: StudyTheme; onTheme: (theme: StudyTheme) => void; onBack: () => void }) {
  return <main className="study-app student-preferences"><header className="study-topbar student-preferences-header"><button className="icon-button" aria-label="Back to Preferences" onClick={onBack}><ArrowLeft size={20} /></button><h1>Theme</h1></header><div className="student-preferences-content"><div className="theme-choices" role="radiogroup" aria-label="Colour theme" onKeyDown={event => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault(); const modes: StudyTheme[] = ['system', 'light', 'dark'], direction = ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1;
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (modes.indexOf(theme) + direction + modes.length) % modes.length;
    onTheme(modes[index]); event.currentTarget.querySelectorAll<HTMLButtonElement>('button')[index]?.focus();
  }}>{(['system', 'light', 'dark'] as const).map(mode => <button key={mode} role="radio" tabIndex={theme === mode ? 0 : -1} aria-checked={theme === mode} className={`theme-choice theme-choice-${mode} ${theme === mode ? 'selected' : ''}`} onClick={() => onTheme(mode)}><span className={`theme-preview theme-preview-${mode}`} aria-hidden="true">{mode === 'system' ? <Monitor size={34} strokeWidth={1.3} /> : <><span className="preview-heading" /><span className="preview-line" /><span className="preview-paper"><i /><i /><b /></span></>}</span><span className="theme-choice-label"><strong>{label(mode)}</strong><span className="theme-radio">{theme === mode && <Check size={13} />}</span></span></button>)}</div>{theme === 'system' && <p className="student-setting-note">Follows your device.</p>}</div></main>;
}
export function RemindersScreen({ ownerId, sessions, onBack }: { ownerId: string; sessions: History[]; onBack: () => void }) {
  const [snapshot, setSnapshot] = useState<ReminderSnapshot | null>(null), [draft, setDraft] = useState<ReminderSettings | null>(null);
  const [error, setError] = useState(''), [status, setStatus] = useState(''), [busy, setBusy] = useState(false), [device, setDevice] = useState<string | null>(null), [revision, retry] = useState(0);
  useEffect(() => { let active = true; setError(''); (async () => {
    const [value, id] = await Promise.all([getReminders(ownerId), currentDeviceId()]);
    if (!active) return; setSnapshot(value); setDevice(id); setDraft({ ...value.settings, timezone: !value.settings.enabled && !value.push.devices.length ? deviceTimezone() : value.settings.timezone });
    try {
      await syncStudyHistory(sessions, ownerId); const updated = await getReminders(ownerId);
      if (active) setSnapshot(previous => previous ? { ...previous, preview: updated.preview, activityCount: updated.activityCount } : previous);
    } catch { /* Settings stay usable while the account-scoped activity queue retries later. */ }
  })().catch(err => { if (active) setError(err.message || 'Could not load reminders.'); }); return () => { active = false; }; }, [ownerId, revision]);
  const support = notificationSupport(), connected = Boolean(device && snapshot?.push.devices.includes(device));
  const paused = draft?.enabled && draft.pausedUntil && Date.parse(draft.pausedUntil) > Date.now();
  async function run(action: () => Promise<ReminderSnapshot>, message: string, keepDraft = false) {
    if (busy) return; setBusy(true); setError(''); setStatus('');
    try { const value = await action(); setSnapshot(value); setDraft(previous => keepDraft && previous ? { ...previous, enabled: value.settings.enabled, pausedUntil: value.settings.pausedUntil } : value.settings); setDevice(await currentDeviceId()); setStatus(message); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not save reminders. Please try again.'); }
    finally { setBusy(false); }
  }
  function change<K extends keyof ReminderSettings>(key: K, value: ReminderSettings[K]) { setDraft(previous => previous ? { ...previous, [key]: value } : previous); setStatus(''); }
  return <main className="study-app student-preferences"><header className="study-topbar student-preferences-header"><button className="icon-button" aria-label="Back to Preferences" onClick={onBack}><ArrowLeft size={20} /></button><h1>Study reminders</h1></header><div className="student-preferences-content reminder-settings">
    {snapshot && draft ? <>
      <div className="reminder-enable"><div><strong>{paused ? 'Reminders paused' : 'Study reminders'}</strong><span>{paused ? `Until ${new Date(draft.pausedUntil!).toLocaleDateString()}` : 'Skips days you’ve practised.'}</span></div><button className="student-switch" type="button" role="switch" aria-label="Study reminders" aria-checked={snapshot.settings.enabled} disabled={busy || (!snapshot.settings.enabled && (!snapshot.push.configured || Boolean(support)))} onClick={() => void run(() => snapshot.settings.enabled ? saveReminders({ ...snapshot.settings, enabled: false }, ownerId) : enableReminders(snapshot, draft), snapshot.settings.enabled ? 'Reminders are off.' : 'Study reminders are on.', snapshot.settings.enabled)}><span /></button></div>
      {support && <p className="student-setting-note">{support}</p>}
      {!snapshot.push.configured && <p className="student-setting-note">Reminders are unavailable. Try again later.</p>}
      {snapshot.settings.enabled && !connected && !support && snapshot.push.configured && <button className="study-secondary" disabled={busy} onClick={() => void run(() => enableReminders(snapshot, draft), 'This device is connected.')}>Enable on this device</button>}
      <div className="reminder-preview" aria-label="Reminder preview"><ReadyImage src={reminderPortrait(draft.personalized ? snapshot.preview.mood : 'welcome')} alt="" fallback={<ReadyImage src="/pastq-icon-192.png" alt="" />} /><div><span>PastQ · Scholar</span><strong>{draft.personalized ? snapshot.preview.title : 'A study moment with Scholar'}</strong><p>{draft.personalized ? snapshot.preview.body : 'Come back for a short practice session.'}</p></div></div>
      {snapshot.settings.enabled && connected && !support && <button className="text-button reminder-test" disabled={busy} onClick={() => void run(() => testReminder(ownerId), 'Test reminder sent to this device.', true)}>Send test reminder</button>}
      <fieldset className="reminder-fieldset" disabled={busy}><legend>Timing</legend><div className="reminder-timing" role="group" aria-label="Reminder timing"><button type="button" aria-pressed={draft.mode === 'smart'} onClick={() => change('mode', 'smart')}>Smart</button><button type="button" aria-pressed={draft.mode === 'scheduled'} onClick={() => change('mode', 'scheduled')}>Choose a time</button></div>{draft.mode === 'scheduled' ? <label className="reminder-field"><span>Reminder time</span><input type="time" value={draft.time} onChange={event => change('time', event.target.value)} required /></label> : <p className="student-setting-note">{`Around ${snapshot.preview.targetTime}.`}</p>}
        <div className="reminder-days" role="group" aria-label="Study days">{['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, order) => { const index = (order + 1) % 7; return <button type="button" key={day} aria-label={day} aria-pressed={draft.days.includes(index)} onClick={() => { const next = draft.days.includes(index) ? draft.days.filter(value => value !== index) : [...draft.days, index]; if (next.length) change('days', next); }}>{day.slice(0, 1)}</button>; })}</div>
      </fieldset>
      <fieldset className="reminder-fieldset" disabled={busy}><legend>Quiet hours</legend><div className="reminder-time-pair"><label className="reminder-field"><span>From</span><input type="time" value={draft.quietStart} onChange={event => change('quietStart', event.target.value)} required /></label><label className="reminder-field"><span>Until</span><input type="time" value={draft.quietEnd} onChange={event => change('quietEnd', event.target.value)} required /></label></div><div className="reminder-zone"><span>{draft.timezone.replace(/_/g, ' ')}</span>{draft.timezone !== deviceTimezone() && <button className="text-button" type="button" onClick={() => change('timezone', deviceTimezone())}>Use device time</button>}</div></fieldset>
      <label className="reminder-personalized"><input type="checkbox" checked={draft.personalized} disabled={busy} onChange={event => change('personalized', event.target.checked)} /><span>Include study details in reminders</span></label>
      <button className="study-primary reminder-save" disabled={busy || JSON.stringify(draft) === JSON.stringify(snapshot.settings)} onClick={() => void run(() => saveReminders(draft, ownerId), 'Reminder settings saved.')}>{busy ? 'Saving…' : 'Save changes'}</button>
      {snapshot.settings.enabled && <button className="text-button reminder-pause" disabled={busy} onClick={() => void run(() => saveReminders({ ...snapshot.settings, pausedUntil: paused ? null : new Date(Date.now() + 7 * 86400000).toISOString() }, ownerId), paused ? 'Reminders resumed.' : 'Reminders paused for 7 days.', true)}>{paused ? 'Resume reminders' : 'Pause for 7 days'}</button>}
      {status && <p className="student-setting-note" role="status">{status}</p>}
    </> : !error && <ContentSkeleton kind="reminders" label="Loading reminders" />}
    {error && <div className="reminder-error" role="alert"><p>{error}</p>{!snapshot && <button className="text-button" onClick={() => retry(value => value + 1)}>Try again</button>}</div>}
  </div></main>;
}
