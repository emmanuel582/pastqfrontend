import { useEffect, useRef, useState } from 'react';

/** Screen history lets Android/browser Back work without an on-screen back button. */
export function useAppNavigation<Screen extends string, Tab extends string>(initialScreen: Screen, initialTab: Tab) {
  const [screen, setScreen] = useState(initialScreen);
  const [tab, setTab] = useState(initialTab);
  const session = useRef(crypto.randomUUID());
  const started = useRef(false);
  const restoring = useRef(false);
  const current = useRef({ screen, tab });

  useEffect(() => {
    function restore(event: PopStateEvent) {
      const route = event.state?.pastq;
      if (!route || route.session !== session.current || typeof route.screen !== 'string' || typeof route.tab !== 'string') return;
      if (current.current.screen === route.screen && current.current.tab === route.tab) return;
      restoring.current = true;
      current.current = { screen: route.screen, tab: route.tab };
      setScreen(route.screen); setTab(route.tab);
    }
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);

  useEffect(() => {
    const route = { screen, tab, session: session.current };
    if (!started.current) {
      started.current = true;
      window.history.replaceState({ ...window.history.state, pastq: route }, '');
    } else if (restoring.current) {
      restoring.current = false;
    } else if (current.current.screen !== screen || current.current.tab !== tab) {
      window.history.pushState({ ...window.history.state, pastq: route }, '');
    }
    current.current = { screen, tab };
  }, [screen, tab]);

  return { screen, setScreen, tab, setTab };
}
