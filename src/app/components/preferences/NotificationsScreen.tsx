import { useEffect, useState } from 'react';
import { ArrowLeft, Bell, Check, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { getNotificationInbox, readNotification, notificationImage, type InboxSnapshot } from '../../../services/reminders';
import './notifications.css';

export default function NotificationsScreen({ ownerId, onBack, onOpen }: { ownerId: string; onBack: () => void; onOpen: (path: string) => void }) {
  const [snapshot, setSnapshot] = useState<InboxSnapshot | null>(null), [offset, setOffset] = useState(0), [version, setVersion] = useState(0), [error, setError] = useState(''), [busy, setBusy] = useState('');
  useEffect(() => {
    const refresh = () => { if (!document.hidden) setVersion(value => value + 1); };
    const timer = setInterval(refresh, 15000); window.addEventListener('focus', refresh); window.addEventListener('online', refresh); document.addEventListener('visibilitychange', refresh);
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); window.removeEventListener('online', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, []);
  useEffect(() => { let active = true; setError(''); setSnapshot(null); getNotificationInbox(offset, ownerId).then(value => { if (active) setSnapshot(value); }).catch(e => { if (active) setError(e.message); }); return () => { active = false; }; }, [ownerId, offset]);
  useEffect(() => { let active = true; if (!version) return; getNotificationInbox(offset, ownerId).then(value => { if (active) { setSnapshot(value); setError(''); } }).catch(e => { if (active) setError(e.message); }); return () => { active = false; }; }, [ownerId, offset, version]);
  async function mark(id: string) { setBusy(id); try { await readNotification(id, ownerId); setVersion(value => value + 1); } catch (e) { setError(e instanceof Error ? e.message : 'Could not mark this notification as read.'); } finally { setBusy(''); } }
  return <main className="study-app student-preferences"><header className="study-topbar student-preferences-header"><button className="icon-button" aria-label="Back to Preferences" onClick={onBack}><ArrowLeft size={20} /></button><h1>Notifications</h1><button className="icon-button" aria-label="Refresh notifications" onClick={() => setVersion(value => value + 1)}><RefreshCw size={18} /></button></header><div className="student-preferences-content student-inbox">
    {error && <p className="inbox-error" role="alert">{error}</p>}{!snapshot && !error ? <p role="status">Loading notifications…</p> : snapshot && <><p className="inbox-count">{snapshot.unread} unread · {snapshot.total} notifications</p>{snapshot.items.length ? snapshot.items.map(item => <article className={`student-message ${item.read_at ? '' : 'unread'}`} key={item.id}>
      <div className="student-message-meta"><Bell size={16} /><span>PastQ</span><time dateTime={item.sent_at}>{new Date(item.sent_at).toLocaleString()}</time></div>{item.imageId && <img src={notificationImage(item.imageId)} alt="Notification image" loading="lazy" />}<h2>{item.title}</h2><p>{item.body}</p><div className="student-message-actions">{item.deepLink !== '/?inbox=1' && <button className="text-button" onClick={() => { void mark(item.id); onOpen(item.deepLink); }}>Open in PastQ<ChevronRight size={15} /></button>}{!item.read_at ? <button className="text-button" disabled={busy === item.id} onClick={() => mark(item.id)}><Check size={15} />{busy === item.id ? 'Saving…' : 'Mark as read'}</button> : <small>Read</small>}</div>
    </article>) : <section className="student-inbox-empty"><Bell size={30} /><h2>You’re all caught up.</h2><p>Messages from PastQ will appear here.</p></section>}<div className="inbox-pagination"><button className="text-button" disabled={!offset} onClick={() => setOffset(Math.max(0, offset - 20))}><ChevronLeft size={16} />Previous</button><span>{snapshot.total ? `${offset + 1}–${Math.min(offset + 20, snapshot.total)}` : 0} of {snapshot.total}</span><button className="text-button" disabled={offset + 20 >= snapshot.total} onClick={() => setOffset(offset + 20)}>Next<ChevronRight size={16} /></button></div></>}
  </div></main>;
}
