import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ovrlwgslzqvdofgkfcxl.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92cmx3Z3NsenF2ZG9mZ2tmY3hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwMzU5OTQsImV4cCI6MjEwMTYxMTk5NH0.1mcIfa4B40A6A4sGmJyxB6a3i0ApjzWYteB68K2k8tQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
