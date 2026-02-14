import { createClient } from '@supabase/supabase-js';

// Mengambil kunci rahasia dari file .env (yang sudah kamu buat sebelumnya)
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

// Validasi agar tidak error kalau lupa isi .env
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL atau Key belum disetting di file .env!');
}

// Export client supaya bisa dipakai di halaman manapun
export const supabase = createClient(supabaseUrl, supabaseKey);