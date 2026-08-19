import { supabase } from "./supabase";

export const getUserProfile = async (uid: string) => {
  const { data, error } = await supabase.from("users").select("*").eq("id", uid).maybeSingle();
  if (error) throw error;
  return data;
};

export const createUserProfile = async (uid: string, email: string, name: string) => {
  const { data, error } = await supabase.from("users").insert({
    id: uid,
    email: email,
    full_name: name,
    onboarding_complete: false
  }).select().single();
  if (error) throw error;
  return data;
};

export const updateUserProfile = async (uid: string, profileData: any) => {
  const { error } = await supabase.from("users").update(profileData).eq("id", uid);
  if (error) throw error;
};

export const saveExamSession = async (sessionData: any) => {
  const { data, error } = await supabase.from("exam_sessions").insert([sessionData]).select();
  if (error) throw error;
  return data[0].id;
};

export const getUserHistory = async (uid: string) => {
  const { data, error } = await supabase.from("exam_sessions").select("*").eq("user_id", uid);
  if (error) throw error;
  return data;
};
