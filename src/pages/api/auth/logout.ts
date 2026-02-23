import type { APIRoute } from 'astro';
import { getSupabaseServer } from '../../../lib/supabase';

export const POST: APIRoute = async ({ cookies, redirect }) => {
  const supabase = getSupabaseServer(cookies);
  // Hapus sesi di Supabase & hapus Cookies di browser secara otomatis
  await supabase.auth.signOut(); 
  
  // Kembalikan user ke Beranda
  return redirect('/');
};