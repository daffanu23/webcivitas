import type { APIRoute } from 'astro';
import { getSupabaseServer } from '../../../lib/supabase';

export const GET: APIRoute = async ({ cookies }) => {
  const supabase = getSupabaseServer(cookies);
  
  // PERUBAHAN: Gunakan getUser() untuk validasi super aman ke pusat!
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  // Cek apakah ada artikel draft milik user ini
  const { data, error } = await supabase
    .from('articles')
    .select('id, title, slug, updated_at, content')
    .eq('author_id', user.id) // Gunakan user.id secara langsung
    .eq('status', 'draft')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return new Response(JSON.stringify({ data: null }), { status: 200 });
  }

  return new Response(JSON.stringify({ data }), { status: 200 });
};