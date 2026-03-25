import type { APIRoute } from 'astro';
import { getSupabaseServer } from '../../../lib/supabase';

// 1. Tambahkan fungsi GET agar bekerja saat link <a> diklik
export const GET: APIRoute = async ({ cookies, redirect }) => {
  const supabase = getSupabaseServer(cookies);
  
  // Hapus sesi di Supabase & hapus Cookies di browser secara otomatis
  await supabase.auth.signOut(); 
  
  // Kembalikan user ke Beranda
  return redirect('/');
};

// 2. Tetap pertahankan POST untuk berjaga-jaga jika di masa depan Anda memakai <form>
export const POST: APIRoute = async ({ cookies, redirect }) => {
  const supabase = getSupabaseServer(cookies);
  await supabase.auth.signOut(); 
  return redirect('/');
};