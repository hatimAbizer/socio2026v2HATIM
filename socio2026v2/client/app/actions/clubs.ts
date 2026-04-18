"use server";

import { createClient } from "@supabase/supabase-js";

export interface ClubRecord {
  club_id: string;
  club_name: string;
  club_description: string | null;
  club_banner_url: string | null;
  club_web_link: string | null;
  club_registrations: boolean;
  club_campus: string[];
  slug: string | null;
  subtitle: string | null;
  category: string | null;
  type: "club" | "centre" | "cell";
  created_at: string;
}

function getSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase env vars missing");
  return createClient(url, key);
}

export async function deleteClub(clubId: string): Promise<boolean> {
  const supabase = getSupabase();
  const { error } = await supabase.from("clubs").delete().eq("club_id", clubId);
  if (error) {
    console.error("deleteClub error:", error.message);
    return false;
  }
  return true;
}
