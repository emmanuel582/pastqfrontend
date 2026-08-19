import { supabase } from "./supabase";
import { apiUrl } from "./api";

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
    await supabase.auth.setSession(data.session);
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
    await supabase.auth.setSession(data.session);
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
  try {
    await fetch(apiUrl("/api/auth/logout"), { method: "POST" });
  } catch {
    // Still clear local session even if backend logout fails
  }
  await supabase.auth.signOut();
};

export const listenToAuth = (callback: (user: any) => void) => {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user || null);
  });
  return () => {
    data.subscription.unsubscribe();
  };
};
