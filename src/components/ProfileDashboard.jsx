import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User, Calendar, Edit3, Save, X, Trophy, FileText, BarChart2, Type, Award, Camera } from 'lucide-react';

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
                .select('id, title, content, created_at, article_categories(categories(name))')
                .eq('author_id', userId) 
                .eq('status', 'published'); 
            
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
        let catCounts = {}; // KEMBALI MENGHITUNG ARTIKEL

        filteredData.forEach(article => {
            // Hitung Kata per Artikel
            const cleanText = (article.content || '').replace(/(<([^>]+)>)/gi, "");
            totalChars += cleanText.length;
            const wordArr = cleanText.trim().split(/\s+/);
            const articleWords = wordArr[0] !== "" ? wordArr.length : 0;
            totalWords += articleWords;

            // Masukkan JUMLAH ARTIKEL ke kategorinya
            const catName = article.article_categories?.[0]?.categories?.name || 'Tanpa Kategori';
            catCounts[catName] = (catCounts[catName] || 0) + 1;
        });

        // Cari Kategori Terfavorit (Berdasarkan jumlah artikel)
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

    // LOGIKA PANGKAT / GAMIFICATION (KUSTOMISASI DI SINI)
    const getRank = (wordCount) => {
        if (wordCount < 1000) return { title: "Masih Magang", color: "#64748b" }; 
        if (wordCount < 5000) return { title: "Jurnalis Junior", color: "#10b981" }; 
        if (wordCount < 15000) return { title: "Ampun Senior", color: "#3b82f6" }; 
        return { title: "Sepuh Legend", color: "#f59e0b" }; 
    };

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
                const fileExt = editForm.file.name.split('.').pop();
                const fileName = `user-${userId}-${Date.now()}.${fileExt}`;
                
                const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, editForm.file, { upsert: true });
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

    const rank = getRank(stats.totalWords);

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
                                    <label>Tanggal Lahir</label>
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
                                
                                <div className="meta-row">
                                    <span className="meta-item"><Trophy size={16} color={rank.color}/> Pangkat: <strong style={{color: rank.color}}>{rank.title}</strong></span>
                                    {profile.birth_date && <span className="meta-item"><Calendar size={16}/> Ultah: {new Date(profile.birth_date).toLocaleDateString('id-ID', {day: 'numeric', month: 'long'})}</span>}
                                </div>
                                
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

                {/* 3 KARTU UTAMA */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon" style={{background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6'}}><FileText size={24}/></div>
                        <div className="stat-data">
                            <h3>Total Artikel</h3>
                            <p className="stat-value">{stats.totalArticles}</p>
                            <span className="stat-label">Yang Diterbitkan</span>
                        </div>
                    </div>
                    
                    {/* Kartu Tengah Diganti Menjadi Total Topik/Kategori */}
                    <div className="stat-card">
                        <div className="stat-icon" style={{background: 'rgba(16, 185, 129, 0.1)', color: '#10b981'}}><BarChart2 size={24}/></div>
                        <div className="stat-data">
                            <h3>Kategori Aktif</h3>
                            <p className="stat-value">{Object.keys(stats.categoryCounts).length}</p>
                            <span className="stat-label">Topik Dibahas</span>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon" style={{background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b'}}><Award size={24}/></div>
                        <div className="stat-data">
                            <h3>Spesialisasi</h3>
                            <p className="stat-value" style={{fontSize: '1.5rem'}}>{stats.topCategory}</p>
                            <span className="stat-label">Kategori Terbanyak</span>
                        </div>
                    </div>
                </div>

                {/* --- BREAKDOWN ARTIKEL & TOTAL KATA --- */}
                {Object.keys(stats.categoryCounts).length > 0 && (
                    <div className="category-breakdown-card">
                        <h3>Distribusi Kategori</h3>
                        <div className="breakdown-list">
                            {/* Baris Artikel per Kategori */}
                            {Object.entries(stats.categoryCounts)
                                .sort(([,a], [,b]) => b - a) 
                                .map(([cat, count]) => (
                                <div key={cat} className="breakdown-item">
                                    <span className="cat-name">{cat}</span>
                                    <div className="cat-bar-container">
                                        <div className="cat-bar" style={{ width: stats.totalArticles > 0 ? ((count / stats.totalArticles) * 100) + '%' : '0%' }}></div>
                                    </div>
                                    <span className="cat-count">{count} Artikel</span>
                                </div>
                            ))}

                            {/* --- SPESIAL: TOTAL KATA DI PALING BAWAH --- */}
                            <div className="breakdown-item special-words-row" style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px dashed var(--border)' }}>
                                <span className="cat-name" style={{ color: '#10b981' }}>Total Kata Ditulis</span>
                                <div className="cat-bar-container">
                                    <div className="cat-bar" style={{ width: '100%', background: '#10b981' }}></div>
                                </div>
                                <span className="cat-count" style={{ color: '#10b981', fontWeight: '700' }}>
                                    {stats.totalWords.toLocaleString('id-ID')} Kata
                                </span>
                            </div>

                        </div>
                    </div>
                )}
            </div>

            <style>{`
                .profile-dashboard-wrapper { font-family: 'Poppins', sans-serif; color: var(--text); padding-bottom: 50px; }
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
                
                .meta-row { display: flex; gap: 20px; margin-bottom: 20px; }
                .meta-item { display: flex; align-items: center; gap: 8px; font-size: 0.9rem; color: var(--text); background: var(--bg-light); padding: 8px 16px; border-radius: 8px; border: 1px solid var(--border); }
                
                .btn-edit-profile { background: transparent; border: 1px solid var(--border); color: var(--text); padding: 8px 20px; border-radius: 50px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: all 0.2s; }
                .btn-edit-profile:hover { background: var(--text); color: var(--bg); }

                /* EDIT FORM */
                .edit-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; background: var(--bg-light); padding: 25px; border-radius: 16px; border: 1px dashed var(--border); }
                .form-group.full-width { grid-column: 1 / -1; }
                .form-group label { display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 8px; color: var(--text-muted); }
                .styled-input { width: 100%; padding: 12px 16px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg); color: var(--text); font-family: inherit; transition: border-color 0.2s; }
                .styled-input:focus { outline: none; border-color: var(--text); }
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
                .stat-icon { width: 60px; height: 60px; border-radius: 16px; display: flex; align-items: center; justify-content: center; }
                .stat-data h3 { margin: 0 0 5px 0; font-size: 0.9rem; color: var(--text-muted); font-weight: 500; }
                .stat-value { margin: 0; font-size: 2rem; font-weight: 800; color: var(--text); line-height: 1.1; }
                .stat-label { font-size: 0.8rem; color: var(--text-muted); }

                /* BREAKDOWN */
                .category-breakdown-card { background: var(--bg); border: 1px solid var(--border); padding: 30px; border-radius: 20px; }
                .category-breakdown-card h3 { margin: 0 0 20px 0; font-size: 1.2rem; font-weight: 700; }
                .breakdown-list { display: flex; flex-direction: column; gap: 15px; }
                .breakdown-item { display: flex; align-items: center; gap: 15px; }
                .cat-name { width: 150px; font-weight: 600; font-size: 0.9rem; }
                .cat-bar-container { flex: 1; height: 10px; background: var(--bg-light); border-radius: 10px; overflow: hidden; }
                .cat-bar { height: 100%; background: #dc2626; border-radius: 10px; transition: width 1s ease-out; }
                .cat-count { width: 100px; text-align: right; font-size: 0.85rem; color: var(--text-muted); font-weight: 500; }

                @media (max-width: 768px) {
                    .profile-info-container { flex-direction: column; align-items: center; text-align: center; padding: 0 20px 30px 20px; }
                    .name-row { flex-direction: column; gap: 5px; }
                    .meta-row { flex-direction: column; gap: 10px; align-items: center; }
                    .edit-form-grid { grid-template-columns: 1fr; }
                    .stats-header { flex-direction: column; gap: 15px; align-items: flex-start; }
                    .breakdown-item { flex-direction: column; align-items: flex-start; gap: 8px; }
                    .cat-name, .cat-count { width: auto; }
                    .cat-bar-container { width: 100%; }
                }
            `}</style>
        </div>
    );
}