import type { APIRoute } from 'astro';
import { getSupabaseServer } from '../lib/supabase';

export const GET: APIRoute = async ({ request, cookies, redirect }) => {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/';

  if (code) {
    const supabase = getSupabaseServer(cookies);
    // Tukar kode dari Google menjadi Session Token, lalu simpan otomatis ke Cookies!
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      return redirect(next);
    }
    console.error('Error Auth Callback:', error);
  }

  // Kalau gagal atau tidak ada kode, kembalikan ke halaman login
  return redirect('/login?error=auth_failed');
};