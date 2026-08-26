import type { APIRoute } from 'astro';
import { getSupabaseServer } from '../../../lib/supabase';

export const GET: APIRoute = async ({ cookies }) => {
    try {
        const supabase = getSupabaseServer(cookies);
        
        // Cek autentikasi
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Cek apakah admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            return new Response(JSON.stringify({ error: 'Forbidden' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Ambil data artikel pending
        const { data, error } = await supabase
            .from('articles')
            .select(`
                id, title, slug, created_at, cover_url, content, status,
                profiles!author_id ( full_name ),
                article_categories ( category_id, categories ( name, slug ) )
            `)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        return new Response(JSON.stringify(data), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
