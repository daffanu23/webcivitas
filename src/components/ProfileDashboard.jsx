import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User, Calendar, Edit3, Save, X, Trophy, FileText, BarChart2, Type, Award, Camera } from 'lucide-react';
import imageCompression from 'browser-image-compression';

export default function ProfileDashboard({ userId }) {
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);
    const [articles, setArticles] = useState([]);
    
    // State untuk Statistik
    const [stats, setStats] = useState({ totalArticles: 0, totalWords: 0, totalChars: 0, topCategory: '-', categoryCounts: {} });
    const [timeFilter, setTimeFilter] = useState('all_time'); 
    
    // State untuk Edit Profil
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ full_name: '', bio: '', birth_date: '', file: null, previewUrl: '' });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (userId) fetchUserData();
    }, [userId]);

    useEffect(() => {
        if (articles.length > 0) calculateStats(articles, timeFilter);
    }, [articles, timeFilter]);

    const fetchUserData = async () => {
        try {
            const { data: profileData, error: profileErr } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();
            
            if (profileErr) throw profileErr;
            setProfile(profileData);
            setEditForm({
                full_name: profileData.full_name || '',
                bio: profileData.bio || '',
                birth_date: profileData.birth_date || '',
                file: null,
                previewUrl: profileData.avatar_url || ''
            });

            const { data: articlesData, error: articlesErr } = await supabase
                .from('articles')
                .select('id, slug, title, content, created_at, article_categories(categories(name))')
                .eq('author_id', userId) 
                .eq('status', 'published')
                .order('created_at', { ascending: false });
            
            if (!articlesErr && articlesData) {
                setArticles(articlesData);
                calculateStats(articlesData, 'all_time');
            }
        } catch (error) {
            console.error("Gagal mengambil data profil:", error);
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (data, filter) => {
        let filteredData = data;
        
        if (filter === 'this_month') {
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            filteredData = data.filter(item => {
                const date = new Date(item.created_at);
                return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
            });
        }

        let totalWords = 0;
        let totalChars = 0;
        let catCounts = {}; 

        filteredData.forEach(article => {
            const cleanText = (article.content || '').replace(/(<([^>]+)>)/gi, "");
            totalChars += cleanText.length;
            const wordArr = cleanText.trim().split(/\s+/);
            const articleWords = wordArr[0] !== "" ? wordArr.length : 0;
            totalWords += articleWords;

            const catName = article.article_categories?.[0]?.categories?.name || 'Tanpa Kategori';
            catCounts[catName] = (catCounts[catName] || 0) + 1;
        });

        let topCat = '-';
        let maxCount = 0;
        for (const [cat, count] of Object.entries(catCounts)) {
            if (count > maxCount) { maxCount = count; topCat = cat; }
        }

        setStats({
            totalArticles: filteredData.length,
            totalWords: totalWords,
            totalChars: totalChars,
            topCategory: topCat,
            categoryCounts: catCounts
        });
    };

    // Pangkat dihilangkan atas permintaan pengguna

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setEditForm({ ...editForm, file, previewUrl: URL.createObjectURL(file) });
        }
    };

    const saveProfile = async () => {
        setIsSaving(true);
        try {
            let finalAvatarUrl = profile.avatar_url;

            if (editForm.file) {
                // 1. Kompres Gambar
                let fileToUpload = editForm.file;
                try {
                    const options = { maxSizeMB: 0.2, maxWidthOrHeight: 500, useWebWorker: true };
                    fileToUpload = await imageCompression(editForm.file, options);
                } catch (err) {
                    console.error("Gagal kompres gambar profil:", err);
                }

                // 2. Hapus Foto Lama (Jika ada)
                if (profile.avatar_url && profile.avatar_url.includes('avatars/')) {
                    try {
                        const oldFileName = profile.avatar_url.split('avatars/').pop();
                        if (oldFileName) {
                            await supabase.storage.from('avatars').remove([oldFileName]);
                        }
                    } catch (e) {
                        console.error("Gagal menghapus foto lama:", e);
                    }
                }

                // 3. Upload Foto Baru
                const fileExt = editForm.file.name.split('.').pop();
                const fileName = `user-${userId}-${Date.now()}.${fileExt}`;
                
                const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, fileToUpload, { upsert: true });
                if (uploadError) throw uploadError;

                const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
                finalAvatarUrl = data.publicUrl;
            }

            const { error } = await supabase.from('profiles').update({
                full_name: editForm.full_name,
                bio: editForm.bio,
                birth_date: editForm.birth_date,
                avatar_url: finalAvatarUrl
            }).eq('id', userId);

            if (error) throw error;

            setProfile({ ...profile, full_name: editForm.full_name, bio: editForm.bio, birth_date: editForm.birth_date, avatar_url: finalAvatarUrl });
            setIsEditing(false);
            alert("Profil berhasil diperbarui!");

        } catch (error) {
            alert("Gagal menyimpan profil: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return <div className="loading-state">Memuat Profil...</div>;
    if (!profile) return <div className="loading-state">Profil tidak ditemukan.</div>;

    // rank dihapus

    return (
        <div className="profile-dashboard-wrapper">
            
            {/* --- HEADER PROFIL --- */}
            <div className="profile-header-card">
                <div className="profile-cover"></div>
                <div className="profile-info-container">
                    
                    <div className="avatar-section">
                        <div className="avatar-wrapper">
                            <img src={isEditing ? editForm.previewUrl || 'https://placehold.co/150' : profile.avatar_url || 'https://placehold.co/150'} alt="Avatar" />
                            {isEditing && (
                                <label className="avatar-upload-btn">
                                    <Camera size={20} />
                                    <input type="file" accept="image/*" hidden onChange={handleImageChange} />
                                </label>
                            )}
                        </div>
                    </div>

                    <div className="user-details">
                        {isEditing ? (
                            <div className="edit-form-grid">
                                <div className="form-group">
                                    <label>Nama Lengkap</label>
                                    <input type="text" value={editForm.full_name} onChange={e => setEditForm({...editForm, full_name: e.target.value})} className="styled-input" />
                                </div>
                                <div className="form-group">
                                    <label>Tanggal Lahir <small style={{ fontWeight: 'normal', color: 'var(--text-muted)' }}>(Sensus internal)</small></label>
                                    <input type="date" value={editForm.birth_date} onChange={e => setEditForm({...editForm, birth_date: e.target.value})} className="styled-input" />
                                </div>
                                <div className="form-group full-width">
                                    <label>Bio / Moto Hidup</label>
                                    <textarea value={editForm.bio} onChange={e => setEditForm({...editForm, bio: e.target.value})} rows="2" className="styled-input" placeholder="Tulis sesuatu tentang dirimu..."></textarea>
                                </div>
                                <div className="edit-actions full-width">
                                    <button onClick={() => setIsEditing(false)} className="btn-cancel"><X size={16}/> Batal</button>
                                    <button onClick={saveProfile} disabled={isSaving} className="btn-save"><Save size={16}/> {isSaving ? 'Menyimpan...' : 'Simpan Profil'}</button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="name-row">
                                    <h1>{profile.full_name || 'Penulis Tanpa Nama'}</h1>
                                    <span className="badge-role">{profile.role}</span>
                                </div>
                                <p className="bio-text">{profile.bio || 'Belum ada bio. Tuliskan sesuatu agar pembaca lebih mengenalmu!'}</p>
                                
                                {/* meta-row dihapus */}
                                <button onClick={() => setIsEditing(true)} className="btn-edit-profile"><Edit3 size={16}/> Edit Profil</button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* --- STATISTIK KINERJA --- */}
            <div className="stats-section">
                <div className="stats-header">
                    <h2>Statistik Kinerja</h2>
                    <div className="filter-toggle">
                        <button className={timeFilter === 'all_time' ? 'active' : ''} onClick={() => setTimeFilter('all_time')}>Semua Waktu</button>
                        <button className={timeFilter === 'this_month' ? 'active' : ''} onClick={() => setTimeFilter('this_month')}>Bulan Ini</button>
                    </div>
                </div>

                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon" style={{background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6'}}><FileText size={24}/></div>
                        <div className="stat-data">
                            <h3>Total Artikel</h3>
                            <p className="stat-value">{stats.totalArticles}</p>
                            <span className="stat-label">Yang Diterbitkan</span>
                        </div>
                    </div>
                    
                    <div className="stat-card">
                        <div className="stat-icon" style={{background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b'}}><Award size={24}/></div>
                        <div className="stat-data">
                            <h3>Kategori Favorit</h3>
                            <p className="stat-value" style={{fontSize: '1.5rem'}}>{stats.topCategory}</p>
                            <span className="stat-label">Paling sering dibuat</span>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon" style={{background: 'rgba(16, 185, 129, 0.1)', color: '#10b981'}}><Type size={24}/></div>
                        <div className="stat-data">
                            <h3>Total Kata</h3>
                            <p className="stat-value">{stats.totalWords.toLocaleString('id-ID')}</p>
                            <span className="stat-label">Kata ditulis</span>
                        </div>
                    </div>
                </div>

                {articles.length > 0 && (
                    <div className="latest-articles-section" style={{ marginTop: '40px' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '20px' }}>Berita Terbaru</h2>
                        <div className="articles-list" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {articles.slice(0, 5).map(article => (
                                <a key={article.id} href={`/berita/${article.slug || article.id}`} className="latest-article-card" style={{ display: 'flex', padding: '20px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '16px', textDecoration: 'none', color: 'inherit', transition: 'all 0.2s', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.85rem', color: '#dc2626', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
                                            {article.article_categories?.[0]?.categories?.name || 'Berita'}
                                        </div>
                                        <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: '700' }}>{article.title}</h3>
                                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Calendar size={14} />
                                            {new Date(article.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </div>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                .profile-dashboard-wrapper { font-family: 'Poppins', sans-serif; color: var(--text); padding-bottom: 60px; }
                .loading-state { text-align: center; padding: 50px; color: var(--text-muted); }
                
                /* HEADER PROFIL */
                .profile-header-card { background: var(--bg); border: 1px solid var(--border); border-radius: 20px; overflow: hidden; margin-bottom: 40px; box-shadow: 0 5px 20px rgba(0,0,0,0.03); }
                .profile-cover { height: 150px; background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); }
                .profile-info-container { display: flex; padding: 0 40px 40px 40px; gap: 30px; position: relative; }
                
                .avatar-section { margin-top: -60px; }
                .avatar-wrapper { width: 140px; height: 140px; border-radius: 50%; border: 6px solid var(--bg); position: relative; background: var(--bg); box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
                .avatar-wrapper img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
                .avatar-upload-btn { position: absolute; bottom: 5px; right: 5px; background: var(--text); color: var(--bg); width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.2s; border: 2px solid var(--bg); }
                .avatar-upload-btn:hover { transform: scale(1.1); }

                .user-details { flex: 1; padding-top: 20px; }
                .name-row { display: flex; align-items: center; gap: 15px; margin-bottom: 10px; }
                .name-row h1 { margin: 0; font-size: 2rem; font-weight: 700; letter-spacing: -0.5px; }
                .badge-role { background: var(--bg-light); border: 1px solid var(--border); padding: 4px 12px; border-radius: 50px; font-size: 0.8rem; font-weight: 600; text-transform: uppercase; color: var(--text-muted); }
                
                .bio-text { color: var(--text-muted); font-size: 1rem; line-height: 1.6; margin-bottom: 20px; max-width: 800px; }
                
                .meta-row { display: flex; gap: 20px; margin-bottom: 25px; }
                .meta-item { display: flex; align-items: center; gap: 8px; font-size: 0.9rem; color: var(--text); background: var(--bg-light); padding: 8px 16px; border-radius: 8px; border: 1px solid var(--border); }
                
                /* FIX UX: Tombol Edit Profil Dipercantik */
                .btn-edit-profile { 
                    background: var(--bg-light); border: 1px solid var(--border); color: var(--text); 
                    padding: 10px 24px; border-radius: 50px; font-weight: 600; cursor: pointer; 
                    display: inline-flex; align-items: center; gap: 8px; transition: all 0.2s; 
                    box-shadow: 0 4px 10px rgba(0,0,0,0.02);
                }
                .btn-edit-profile:hover { background: var(--text); color: var(--bg); transform: translateY(-2px); box-shadow: 0 6px 15px rgba(0,0,0,0.1); }

                /* EDIT FORM */
                .edit-form-grid { display: flex; flex-direction: column; gap: 20px; background: transparent; padding: 10px 0; }
                .form-group label { display: block; font-size: 0.9rem; font-weight: 600; margin-bottom: 8px; color: var(--text); }
                .styled-input { width: 100%; padding: 14px 18px; border: 1px solid var(--border); border-radius: 12px; background: var(--bg); color: var(--text); font-family: inherit; font-size: 0.95rem; transition: all 0.2s ease; box-shadow: 0 2px 5px rgba(0,0,0,0.02); }
                .styled-input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1); }
                .edit-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 10px; }
                .btn-cancel { background: transparent; border: 1px solid var(--border); padding: 10px 20px; border-radius: 8px; cursor: pointer; color: var(--text); display: flex; align-items: center; gap: 6px; font-weight: 600; }
                .btn-save { background: #dc2626; border: none; padding: 10px 25px; border-radius: 8px; cursor: pointer; color: white; display: flex; align-items: center; gap: 6px; font-weight: 600; }
                .btn-save:hover:not(:disabled) { background: #b91c1c; }
                .btn-save:disabled { opacity: 0.6; }

                /* STATS SECTION */
                .stats-section { margin-top: 40px; }
                .stats-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
                .stats-header h2 { margin: 0; font-size: 1.5rem; font-weight: 700; }
                
                .filter-toggle { display: flex; background: var(--bg-light); border: 1px solid var(--border); border-radius: 50px; overflow: hidden; padding: 4px; }
                .filter-toggle button { background: transparent; border: none; padding: 8px 20px; font-weight: 600; font-size: 0.85rem; color: var(--text-muted); cursor: pointer; border-radius: 50px; transition: all 0.3s; }
                .filter-toggle button.active { background: var(--bg); color: var(--text); box-shadow: 0 2px 10px rgba(0,0,0,0.05); }

                .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
                .stat-card { background: var(--bg); border: 1px solid var(--border); padding: 25px; border-radius: 20px; display: flex; align-items: center; gap: 20px; box-shadow: 0 5px 20px rgba(0,0,0,0.02); transition: transform 0.2s; }
                .stat-card:hover { transform: translateY(-5px); }
                .stat-icon { width: 60px; height: 60px; border-radius: 16px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
                .stat-data h3 { margin: 0 0 5px 0; font-size: 0.9rem; color: var(--text-muted); font-weight: 500; }
                .stat-value { margin: 0; font-size: 2rem; font-weight: 800; color: var(--text); line-height: 1.1; }
                .stat-label { font-size: 0.8rem; color: var(--text-muted); }

                /* BREAKDOWN */
                .category-breakdown-card { background: var(--bg); border: 1px solid var(--border); padding: 30px; border-radius: 20px; }
                .category-breakdown-card h3 { margin: 0 0 20px 0; font-size: 1.2rem; font-weight: 700; }
                .breakdown-list { display: flex; flex-direction: column; gap: 15px; }
                .breakdown-item { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
                .cat-name { width: 150px; font-weight: 600; font-size: 0.9rem; }
                .cat-bar-container { flex: 1; height: 10px; background: var(--bg-light); border-radius: 10px; overflow: hidden; min-width: 100px; }
                .cat-bar { height: 100%; background: #dc2626; border-radius: 10px; transition: width 1s ease-out; }
                .cat-count { width: 100px; text-align: right; font-size: 0.85rem; color: var(--text-muted); font-weight: 500; }

                /* =========================================
                   RESPONSIVE MOBILE 
                   ========================================= */
                @media (max-width: 768px) {
                    /* FIX OVERLAP: Tambah ruang ekstra di paling bawah agar aman dari tombol + FAB */
                    .profile-dashboard-wrapper { padding-bottom: 140px; }

                    .profile-info-container { flex-direction: column; align-items: center; text-align: center; padding: 0 20px 30px 20px; }
                    .name-row { flex-direction: column; gap: 5px; }
                    .meta-row { flex-direction: column; gap: 10px; align-items: stretch; width: 100%; }
                    .meta-item { justify-content: center; }
                    
                    /* FIX UX: Tombol Edit Profil di HP Dibuat Full Width & Menonjol */
                    .btn-edit-profile { 
                        width: 100%; justify-content: center; padding: 14px; font-size: 1rem; 
                        background: var(--text); color: var(--bg); /* Mode Solid di HP */
                    }

                    .edit-form-grid { grid-template-columns: 1fr; }
                    .stats-header { flex-direction: column; gap: 15px; align-items: flex-start; }
                    
                    /* FIX UX: Tata Ulang Grafik Breakdown Kategori */
                    .breakdown-item { 
                        flex-direction: row; 
                        align-items: center; 
                        justify-content: space-between; 
                        gap: 5px;
                    }
                    .cat-name { width: auto; flex: 1; }
                    .cat-count { width: auto; text-align: right; }
                    .cat-bar-container { 
                        width: 100%; flex: none; order: 3; margin-top: 4px; /* Garis turun ke bawah */
                    }
                }
            `}</style>
        </div>
    );
}