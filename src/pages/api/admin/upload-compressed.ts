// API route: POST /api/admin/upload-compressed
// Endpoint untuk upload file gambar yang sudah dikompres
// dan mengganti referensi URL di database
import { getSupabaseServer } from '../../../lib/supabase';

export const prerender = false;

export async function POST({ cookies, request }: { cookies: any; request: Request }) {
    const supabase = getSupabaseServer(cookies);

    // 1. Verifikasi user adalah admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || profile.role !== 'admin') {
        return new Response(JSON.stringify({ error: 'Forbidden: Admin only' }), { status: 403 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const bucket = formData.get('bucket') as string;
        const oldPath = formData.get('oldPath') as string;
        const newPath = formData.get('newPath') as string;

        if (!file || !bucket || !oldPath || !newPath) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
        }

        // 2. Upload file baru (webp) ke storage
        const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(newPath, file, {
                contentType: 'image/webp',
                upsert: true
            });

        if (uploadError) {
            return new Response(JSON.stringify({ error: 'Upload failed: ' + uploadError.message }), { status: 500 });
        }

        // 3. Dapatkan public URL baru
        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(newPath);
        const newPublicUrl = urlData.publicUrl;

        // 4. Dapatkan public URL lama
        const { data: oldUrlData } = supabase.storage.from(bucket).getPublicUrl(oldPath);
        const oldPublicUrl = oldUrlData.publicUrl;

        // 5. Update referensi URL di database
        const tableConfigs: Record<string, { table: string; column: string }[]> = {
            'news-images': [
                { table: 'articles', column: 'cover_url' },
                { table: 'ig_promos', column: 'image_url' },
            ],
            'magazine_covers': [
                { table: 'magazines', column: 'cover_url' },
            ],
            'avatars': [
                { table: 'profiles', column: 'avatar_url' },
            ],
        };

        const configs = tableConfigs[bucket] || [];
        let dbUpdated = false;

        for (const cfg of configs) {
            const { error: dbError, count } = await supabase
                .from(cfg.table)
                .update({ [cfg.column]: newPublicUrl })
                .eq(cfg.column, oldPublicUrl);

            if (!dbError && count && count > 0) {
                dbUpdated = true;
            }
        }

        // 6. Hapus file lama (opsional, bisa ditunda)
        if (oldPath !== newPath) {
            try {
                await supabase.storage.from(bucket).remove([oldPath]);
            } catch (delErr) {
                // Non-fatal: file lama gagal dihapus
                console.warn('Gagal hapus file lama:', delErr);
            }
        }

        return new Response(JSON.stringify({
            success: true,
            newUrl: newPublicUrl,
            dbUpdated,
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
