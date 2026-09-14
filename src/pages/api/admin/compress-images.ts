// API route: POST /api/admin/compress-images
// Endpoint khusus admin untuk scan gambar lama di Supabase Storage
// yang belum terkompresi
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

    // 2. Definisikan bucket yang perlu diproses
    const bucketConfigs = [
        {
            bucket: 'news-images',
            table: 'articles',
            urlColumn: 'cover_url',
            maxSizeMB: 0.3,
            maxDimension: 1280,
        },
        {
            bucket: 'magazine_covers',
            table: 'magazines',
            urlColumn: 'cover_url',
            maxSizeMB: 0.35,
            maxDimension: 1400,
        },
        {
            bucket: 'avatars',
            table: 'profiles',
            urlColumn: 'avatar_url',
            maxSizeMB: 0.2,
            maxDimension: 500,
        },
    ];

    const filesToCompress: any[] = [];
    let totalAlreadyOptimized = 0;
    let totalErrors = 0;

    for (const config of bucketConfigs) {
        try {
            // 3. List semua file di bucket (root level)
            const { data: files, error: listError } = await supabase.storage
                .from(config.bucket)
                .list('', { limit: 500, sortBy: { column: 'created_at', order: 'asc' } });

            if (listError || !files) continue;

            // Filter: hanya file gambar yang BUKAN webp
            const needsCompression = files.filter(f => {
                const name = f.name.toLowerCase();
                return (name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || name.endsWith('.gif'));
            });

            const alreadyWebp = files.filter(f => f.name.toLowerCase().endsWith('.webp'));
            totalAlreadyOptimized += alreadyWebp.length;

            // Juga cek subfolder covers/
            const { data: subfiles } = await supabase.storage
                .from(config.bucket)
                .list('covers', { limit: 500 });

            const subNeedsCompression = (subfiles || []).filter(f => {
                const name = f.name.toLowerCase();
                return (name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || name.endsWith('.gif'));
            });

            const subAlreadyWebp = (subfiles || []).filter(f => f.name.toLowerCase().endsWith('.webp'));
            totalAlreadyOptimized += subAlreadyWebp.length;

            for (const file of needsCompression) {
                const { data: urlData } = supabase.storage.from(config.bucket).getPublicUrl(file.name);
                filesToCompress.push({
                    bucket: config.bucket,
                    path: file.name,
                    publicUrl: urlData.publicUrl,
                    maxSizeMB: config.maxSizeMB,
                    maxDimension: config.maxDimension,
                });
            }

            for (const file of subNeedsCompression) {
                const fullPath = `covers/${file.name}`;
                const { data: urlData } = supabase.storage.from(config.bucket).getPublicUrl(fullPath);
                filesToCompress.push({
                    bucket: config.bucket,
                    path: fullPath,
                    publicUrl: urlData.publicUrl,
                    maxSizeMB: config.maxSizeMB,
                    maxDimension: config.maxDimension,
                });
            }

        } catch (err: any) {
            totalErrors++;
        }
    }

    return new Response(JSON.stringify({
        summary: {
            needsCompression: filesToCompress.length,
            alreadyOptimized: totalAlreadyOptimized,
            errors: totalErrors,
        },
        files: filesToCompress,
    }, null, 2), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
}
