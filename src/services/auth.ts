import { supabase } from "./supabase";
import { apiUrl } from "./api";
import { offlineOwner, rememberOfflineOwner } from './offlineApp';

export const registerUser = async (email: string, pass: string, name: string) => {
  const response = await fetch(apiUrl("/api/auth/signup"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password: pass, name }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Failed to sign up");
  }

  if (data.session) {
    const { error } = await supabase.auth.setSession(data.session);
    if (error) throw error;
  }

  return data.user;
};

export const loginUser = async (email: string, pass: string) => {
  const response = await fetch(apiUrl("/api/auth/login"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password: pass }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Failed to login");
  }

  if (data.session) {
    const { error } = await supabase.auth.setSession(data.session);
    if (error) throw error;
  }

  return data.user;
};

export const loginWithGoogle = async () => {
  const redirectTo = window.location.origin;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: {
        access_type: "offline",
        prompt: "select_account",
      },
    },
  });
  if (error) throw error;
};

export const logoutUser = async () => {
  rememberOfflineOwner(null);
  try {
    await fetch(apiUrl("/api/auth/logout"), { method: "POST" });
  } catch {
    // Still clear local session even if backend logout fails
  }
  await supabase.auth.signOut();
};

export const sendPasswordReset = async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/`,
  });
  if (error) throw error;
};

export const listenToAuth = (callback: (user: any, event?: string) => void) => {
  let active = true;
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const cached = offlineOwner();
  if (cached) queueMicrotask(() => { if (active) callback(cached, 'OFFLINE_SESSION'); });
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    // Supabase auth callbacks run while its auth lock is held. Profile reads
    // and token-refreshing requests must run after that callback returns.
    const timer = setTimeout(() => {
      timers.delete(timer); if (!active) return;
      if (session?.user) rememberOfflineOwner(session.user);
      if (event === 'SIGNED_OUT') rememberOfflineOwner(null);
      if (!session?.user && event !== 'SIGNED_OUT' && offlineOwner()) return;
      callback(session?.user || null, event);
    }, 0);
    timers.add(timer);
  });
  return () => {
    active = false; timers.forEach(clearTimeout);
    data.subscription.unsubscribe();
  };
};
