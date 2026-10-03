import { useEffect, useRef, useState } from 'react';
import { saveBundle } from '../../services/libraryService';
import { getVisionSession, replyVisionFollowUp, resumeVisionSession, type VisionFollowUp, type VisionSession } from '../../services/vision';
import StudyLoading from './StudyLoading';

type QuestionMeta = { groups?: any[]; name?: string; sessionId?: string };
export default function ProcessingScreen({ nav, sessionId, onQuestionsReady }: {
  nav: (screen: 'snap') => void; sessionId: string | null;
  onQuestionsReady: (questions: any[], meta?: QuestionMeta) => void | Promise<void>;
}) {
  const [session, setSession] = useState<VisionSession | null>(null);
  const [connectionError, setConnectionError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState('');
  const callbacks = useRef({ nav, onQuestionsReady });
  callbacks.current = { nav, onQuestionsReady };
  const completed = useRef<string | null>(null);

  useEffect(() => {
    setSession(null); setConnectionError(false); setActionMessage(''); completed.current = null;
    if (!sessionId) return;
    let active = true;
    let pollTimer: ReturnType<typeof setTimeout>;
    let finishTimer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const current = await getVisionSession(sessionId!);
        if (!active) return;
        setSession(current); setConnectionError(false);
        if (['completed', 'completed_with_errors'].includes(current.status) && current.questions?.length) {
          if (completed.current === current.id) return;
          completed.current = current.id;
          try {
            await saveBundle({ id: current.id, title: current.name, name: current.name,
              questions: current.questions, groups: current.groups || [], updatedAt: Date.now(), createdAt: Date.now() });
          } catch { /* Continue to the available questions even if device storage is full. */ }
          if (!active) return;
          const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 2600;
          finishTimer = setTimeout(() => {
            if (active) void callbacks.current.onQuestionsReady(current.questions || [],
              { groups: current.groups, name: current.name, sessionId: current.id });
          }, delay);
          return;
        }
      } catch {
        if (active) setConnectionError(true);
      }
      if (active) pollTimer = setTimeout(poll, 2000);
    }
    void poll();
    return () => { active = false; clearTimeout(pollTimer); clearTimeout(finishTimer); };
  }, [sessionId]);

  async function act(key: string, request: () => Promise<VisionSession | void>) {
    if (busy) return;
    setBusy(key); setActionMessage('');
    try { const updated = await request(); if (updated) setSession(updated); }
    catch { setActionMessage('That didn’t work. Please try again.'); }
    finally { setBusy(null); }
  }
  async function attach(followUp: VisionFollowUp) {
    if (!sessionId || busy) return;
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = () => {
      const image = input.files?.[0];
      if (image) void act(followUp.id, () => replyVisionFollowUp(sessionId,
        { followUpId: followUp.id, action: 'replace_page', image }));
    };
    input.click();
  }
  if (!sessionId) return <StudyLoading state="empty"><button className="study-primary" onClick={() => nav('snap')}>Choose a material</button></StudyLoading>;

  const ready = ['completed', 'completed_with_errors'].includes(session?.status || '') && !!session?.questions?.length;
  const failed = session?.status === 'failed' || (['completed', 'completed_with_errors'].includes(session?.status || '') && !session?.questions?.length);
  const followUps = (session?.followUps || []).filter(item => item.status === 'open');
  const waiting = ['needs_input', 'paused', 'needs_attention'].includes(session?.status || '') || followUps.length > 0;
  const progress = session?.progress;
  const fraction = progress?.total ? Math.max(0, Math.min(99, Math.round(((progress.done || 0) + (progress.skipped || 0)) / progress.total * 100))) : null;
  const state = ready ? 'ready' : connectionError ? 'interrupted' : failed ? 'failed' : waiting ? 'waiting' : 'preparing';
  const message = actionMessage || (connectionError ? 'Reconnecting. Your preparation will continue.'
    : failed ? 'Your material is saved. Try preparing it again.'
    : waiting && !followUps.length ? 'Preparation is paused. Try again when you’re ready.' : undefined);

  return <StudyLoading state={state} name={session?.name} progress={ready ? 100 : fraction} message={message}>
    {followUps.length > 0 && !ready && <div className="loading-followups">{followUps.map(item => {
      const page = session?.pages?.find(p => p.id === item.pageId);
      const unclear = item.type === 'unclear_image';
      const canAttach = ['unclear_image', 'missing_questions', 'missing_question_numbers', 'count_anomaly'].includes(item.type);
      const copy = unclear ? `A clearer photo${page ? ` of page ${page.index + 1}` : ''} will help.`
        : canAttach ? 'You can add another page to complete this material.' : 'This material needs a quick check before continuing.';
      return <div className="loading-followup" key={item.id}><p>{copy}</p><div>
        {canAttach && <button className="study-primary" disabled={!!busy} onClick={() => void attach(item)}>{busy === item.id ? 'Adding…' : unclear ? 'Add clearer photo' : 'Add a page'}</button>}
        {!unclear && <button className="study-secondary" disabled={!!busy} onClick={() => void act(item.id, () => replyVisionFollowUp(sessionId, { followUpId: item.id, action: 'dismiss' }))}>Skip this check</button>}
      </div></div>;
    })}</div>}
    {!ready && (failed || waiting || (progress?.failed || 0) > 0) && <button className="study-primary" disabled={!!busy} onClick={() => void act('resume', () => resumeVisionSession(sessionId))}>{busy === 'resume' ? 'Trying again…' : 'Try again'}</button>}
    {!ready && waiting && !!session?.questions?.length && <button className="study-secondary" disabled={!!busy} onClick={() => void callbacks.current.onQuestionsReady(session!.questions || [], { groups: session!.groups, name: session!.name, sessionId })}>Use ready questions</button>}
  </StudyLoading>;
}
