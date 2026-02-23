// Kita tinggalkan @supabase/supabase-js, dan full gunakan @supabase/ssr
import { createBrowserClient, createServerClient } from '@supabase/ssr';

// 1. BROWSER CLIENT (Otomatis menggunakan PKCE Flow agar URL pakai ?code=)
export const supabase = createBrowserClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY
);

// 2. SERVER CLIENT (Untuk Astro SSR)
export const getSupabaseServer = (cookies: any) => {
  return createServerClient(
    // Pindahkan env ke dalam fungsi agar tidak terjadi Error 406 (API Key hilang)
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(key) {
          return cookies.get(key)?.value;
        },
        set(key, value, options) {
          cookies.set(key, value, { ...options, path: '/' });
        },
        remove(key, options) {
          cookies.delete(key, { ...options, path: '/' });
        },
      },
    }
  );
};