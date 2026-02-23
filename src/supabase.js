import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 환경변수가 없으면 데모 모드 (Supabase 미연결)
export const IS_DEMO = !supabaseUrl || supabaseUrl.includes("여기에");

export const supabase = IS_DEMO
  ? null
  : createClient(supabaseUrl, supabaseAnonKey);
