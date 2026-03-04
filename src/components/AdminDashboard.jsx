import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import MDEditor from '@uiw/react-md-editor'; 
import { Edit3, Trash2, CheckCircle, XCircle, ShieldCheck, RefreshCw, Eye, ArrowLeftCircle, Inbox, Archive, Instagram, Upload, PlusCircle } from 'lucide-react';

export default function AdminDashboard({ serverCategories, serverArticles }) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const [articles, setArticles] = useState(serverArticles || []);
    const [availableCategories] = useState(serverCategories || []);
    
    // --- STATE PROMO IG ---
    const [promos, setPromos] = useState([]); 
    const [newPromo, setNewPromo] = useState({
        image_url: '',
        link_url: '',
        caption: '',
        file: null
    });
    const [isUploadingPromo, setIsUploadingPromo] = useState(false);
    
    // State Editor
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [selectedArticle, setSelectedArticle] = useState(null);
    const [editorContent, setEditorContent] = useState('');
    const [editorTitle, setEditorTitle] = useState(''); 

    const fetchData = async () => {
        const { data: articlesData } = await supabase
            .from('articles')
            .select('*, profiles(full_name), article_categories(category_id)')
            .order('created_at', { ascending: false }); 
        setArticles(articlesData || []);

        const { data: promosData } = await supabase
            .from('ig_promos')
            .select('*')
            .order('created_at', { ascending: false }) 
            .limit(4);
        setPromos(promosData || []);
    };

    useEffect(() => { fetchData(); }, []);

    // --- FUNGSI PROMO IG ---
    const handleNewPromoChange = (field, value) => {
        setNewPromo(prev => ({ ...prev, [field]: value }));
    };

    const handleNewPromoImage = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const previewUrl = URL.createObjectURL(file);
        setNewPromo(prev => ({ ...prev, file, image_url: previewUrl }));
    };

    const submitNewPromo = async () => {
        if (!newPromo.file && !newPromo.image_url) return alert("Pilih gambar dulu!");
        
        setIsUploadingPromo(true);
        try {
            let finalImageUrl = newPromo.image_url;
            
            if (newPromo.file) {
                const fileExt = newPromo.file.name.split('.').pop();
                const fileName = `promo-${Date.now()}.${fileExt}`;
                
                const { error: uploadError } = await supabase.storage.from('news-images').upload(fileName, newPromo.file, {
                    cacheControl: '3600',
                    upsert: false
                });
                
                if (uploadError) throw uploadError;

                const { data } = supabase.storage.from('news-images').getPublicUrl(fileName);
                finalImageUrl = data.publicUrl;
            }

            const { error } = await supabase.from('ig_promos').insert({
                image_url: finalImageUrl,
                link_url: newPromo.link_url,
                caption: newPromo.caption,
                created_at: new Date()
            });

            if (error) throw error;

            setNewPromo({ image_url: '', link_url: '', caption: '', file: null });
            alert("Promo berhasil ditambahkan! Foto lama otomatis tergeser.");
            fetchData(); 

        } catch (error) {
            console.error(error);
            alert('Gagal upload promo: ' + error.message);
        } finally {
            setIsUploadingPromo(false);
        }
    };

    const deletePromo = async (id) => {
        if(!confirm("Hapus promo ini dari etalase?")) return;
        try {
            await supabase.from('ig_promos').delete().eq('id', id);
            fetchData();
        } catch (error) {
            alert("Gagal hapus: " + error.message);
        }
    }

    // --- FUNGSI EDITOR BERITA ---
    const handleOpenReview = (article) => {
        setSelectedArticle(article);
        setEditorContent(article.content || '');
        setEditorTitle(article.title || '');
        setSelectedCategories(article.article_categories ? article.article_categories.map(ac => ac.category_id) : []);
        setIsPanelOpen(true);
        document.body.style.overflow = 'hidden'; 
    };

    const handleCloseReview = () => {
        setIsPanelOpen(false);
        document.body.style.overflow = 'auto';
        setTimeout(() => setSelectedArticle(null), 300);
    };

    const toggleCategory = (categoryId) => {
        setSelectedCategories(prev => prev.includes(categoryId) ? prev.filter(id => id !== categoryId) : [...prev, categoryId]);
    };

    const handleUpdateStatus = async (newStatus) => {
        if (!selectedArticle) return;
        if (newStatus === 'published' && selectedCategories.length === 0) return alert("Berita yang dipublish wajib punya kategori!");
        let confirmMsg = newStatus === 'published' ? "Terbitkan berita ini sekarang?" : newStatus === 'draft' ? "Kembalikan ke penulis untuk revisi?" : "Tolak dan arsipkan berita ini?";
        if (!confirm(confirmMsg)) return;

        try {
            const { error } = await supabase.from('articles').update({ title: editorTitle, content: editorContent, status: newStatus, updated_at: new Date() }).eq('id', selectedArticle.id);
            if (error) throw error;
            await supabase.from('article_categories').delete().eq('article_id', selectedArticle.id);
            if (selectedCategories.length > 0) {
                const pivotInserts = selectedCategories.map(catId => ({ article_id: selectedArticle.id, category_id: catId }));
                await supabase.from('article_categories').insert(pivotInserts);
            }
            alert("Status berhasil diperbarui.");
            handleCloseReview();
            fetchData(); 
        } catch (error) { alert("Gagal update: " + error.message); }
    };
    
    const handleDeletePermanent = async (id) => {
        if(!confirm("Hapus permanen? Data tidak bisa kembali.")) return;
        await supabase.from('articles').delete().eq('id', id);
        fetchData();
    }

    const pendingArticles = articles.filter(a => a.status === 'pending');

    return (
        <div className="dashboard-wrapper">
            <header className="dash-header">
                <div className="header-left">
                    <div className="badge-admin"><ShieldCheck size={14}/> Admin Panel</div>
                    <h1>Meja Redaksi</h1>
                    <p>Total {articles.length} artikel terdaftar.</p>
                </div>
                <button onClick={fetchData} className="btn-refresh"><RefreshCw size={16}/> Refresh</button>
            </header>

            <section className="dashboard-section">
                <div className="section-header">
                    <Inbox size={20} strokeWidth={1.5} />
                    <h2>Antrian Review <span className="count-badge">{pendingArticles.length}</span></h2>
                </div>
                {pendingArticles.length === 0 ? (
                    <div className="empty-state"><CheckCircle size={32} strokeWidth={1.5} className="text-muted"/><p>Tidak ada antrian pending.</p></div>
                ) : (
                    <div className="card-scroller">
                        {pendingArticles.map((item) => (
                            <div key={item.id} className="news-card" onClick={() => handleOpenReview(item)}>
                                <div className="card-img-box"><img src={item.cover_url || 'https://placehold.co/400'} alt="cover" /><div className="overlay-hover"><Eye size={24} color="white"/></div></div>
                                <div className="card-info">
                                    <div className="card-meta"><span>{new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span><span className="dot">•</span><span>{item.profiles?.full_name || 'Anonim'}</span></div>
                                    <h3>{item.title}</h3>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <section className="dashboard-section">
                <div className="section-header">
                    <Instagram size={20} strokeWidth={1.5} />
                    <h2>Etalase Instagram (Terbaru)</h2>
                </div>
                
                {/* 1. INPUT FORM BARU (TETAP BAGUS) */}
                <div className="promo-input-wrapper">
                    <div className="promo-input-card">
                        <div className="card-header-small">
                            <h3><PlusCircle size={18}/> Tambah Postingan Baru</h3>
                        </div>
                        <div className="promo-form-body-horizontal">
                            <div className="upload-wrapper-compact">
                                <label className={`promo-upload-area ${newPromo.image_url ? 'has-image' : 'empty'}`}>
                                    {newPromo.image_url ? (
                                        <>
                                            <img src={newPromo.image_url} className="promo-preview-lg" />
                                            <div className="upload-hover-overlay"><Upload size={24} /><span>Ganti</span></div>
                                        </>
                                    ) : (
                                        <div className="placeholder-content">
                                            <Upload size={24}/>
                                            <span className="upload-title">Upload Foto (4:5)</span>
                                        </div>
                                    )}
                                    <input type="file" accept="image/*" onChange={handleNewPromoImage} className="file-input-hidden" />
                                </label>
                            </div>
                            
                            <div className="promo-fields-expanded">
                                <div className="input-group">
                                    <label>Caption / Kutipan</label>
                                    <textarea 
                                        value={newPromo.caption} 
                                        onChange={(e) => handleNewPromoChange('caption', e.target.value)} 
                                        rows="4" 
                                        placeholder="Tulis caption menarik di sini..."
                                        className="styled-input"
                                    ></textarea>
                                </div>
                                <div className="input-group">
                                    <label>Link Postingan IG</label>
                                    <div className="input-with-icon">
                                        <Instagram size={16} className="input-icon"/>
                                        <input 
                                            type="text" 
                                            value={newPromo.link_url} 
                                            onChange={(e) => handleNewPromoChange('link_url', e.target.value)} 
                                            placeholder="https://instagram.com/p/..." 
                                            className="styled-input pl-icon"
                                        />
                                    </div>
                                </div>
                                <button type="button" onClick={submitNewPromo} disabled={isUploadingPromo} className="btn-submit-promo">
                                    {isUploadingPromo ? (
                                        <span className="flex-center"><RefreshCw className="spin" size={18}/> Mengupload...</span>
                                    ) : (
                                        <span className="flex-center">Tayangkan Sekarang <ArrowLeftCircle size={18} style={{transform: 'rotate(180deg)'}}/></span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. LIST PROMO AKTIF (KEMBALI KE BAWAH & GRID) */}
                <div className="promo-grid-display">
                    {promos.length === 0 && <p className="text-muted">Belum ada promo aktif.</p>}
                    {promos.map((item, index) => (
                        <div key={item.id} className="promo-display-card">
                            <div className="display-card-header">
                                <span className="badge-slot">Posisi #{index + 1}</span>
                                <button onClick={() => deletePromo(item.id)} className="btn-delete-circle" title="Hapus"><Trash2 size={16}/></button>
                            </div>
                            <div className="display-img-box">
                                <img src={item.image_url} alt="Promo" />
                            </div>
                            <div className="display-info">
                                <p className="display-caption">{item.caption || 'Tanpa caption'}</p>
                                <a href={item.link_url} target="_blank" rel="noreferrer" className="link-text">Lihat Link ↗</a>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="dashboard-section">
                <div className="section-header"><Archive size={20} strokeWidth={1.5} /><h2>Database Arsip</h2></div>
                <div className="table-responsive">
                    <table className="minimal-table">
                        <thead><tr><th>Judul Berita</th><th>Penulis</th><th>Status</th><th style={{textAlign: 'right'}}>Aksi</th></tr></thead>
                        <tbody>
                            {articles.map((item) => (
                                <tr key={item.id} className={item.status === 'pending' ? 'row-highlight' : ''}>
                                    <td className="td-title"><span className="title-text">{item.title}</span><span className="date-text">{new Date(item.created_at).toLocaleDateString()}</span></td>
                                    <td className="td-author">{item.profiles?.full_name || 'Redaksi'}</td>
                                    <td><span className={`status-dot ${item.status}`}></span><span className="status-text">{item.status === 'published' ? 'Live' : (item.status === 'rejected' ? 'Ditolak' : (item.status === 'draft' ? 'Draft' : 'Pending'))}</span></td>
                                    <td className="col-actions">
                                        <button onClick={() => handleOpenReview(item)} className="icon-btn" title="Review"><Edit3 size={16} /></button>
                                        <button onClick={() => handleDeletePermanent(item.id)} className="icon-btn danger" title="Hapus"><Trash2 size={16} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {mounted && createPortal(
                <>
                    <div className={`drawer-backdrop ${isPanelOpen ? 'open' : ''}`} onClick={handleCloseReview}></div>
                    <div className={`drawer-panel ${isPanelOpen ? 'open' : ''}`}>
                        {selectedArticle && (
                            <div className="drawer-container-flex">
                                <div className="drawer-header sticky-header"><div><h2 className="drawer-title">Editor Mode</h2></div><button onClick={handleCloseReview} className="btn-close"><XCircle size={24} strokeWidth={1.5} /></button></div>
                                <div className="drawer-content scrollable-content">
                                    <div className="meta-compact"><img src={selectedArticle.cover_url || 'https://placehold.co/100'} className="meta-thumb" /><div className="meta-info"><p className="author-name">{selectedArticle.profiles?.full_name || 'Redaksi'}</p><span className={`status-pill ${selectedArticle.status}`}>{selectedArticle.status}</span></div></div>
                                    <div className="form-group"><label>Judul Headline</label><input type="text" className="input-minimal" value={editorTitle} onChange={(e) => setEditorTitle(e.target.value)} /></div>
                                    <div className="form-group"><label>Tag Kategori</label><div className="category-grid">{availableCategories.map(cat => (<label key={cat.id} className={`cat-checkbox ${selectedCategories.includes(cat.id) ? 'active' : ''}`}><input type="checkbox" checked={selectedCategories.includes(cat.id)} onChange={() => toggleCategory(cat.id)} /><span>{cat.name}</span></label>))}</div></div>
                                    <div className="form-group"><label>Isi Konten (Markdown)</label><div className="admin-markdown-wrapper"><MDEditor value={editorContent} onChange={setEditorContent} height={400} preview="edit" className="custom-md-editor" /></div></div>
                                </div>
                                <div className="drawer-footer sticky-footer">
                                    <button onClick={() => handleUpdateStatus('draft')} className="btn-decision revise"><ArrowLeftCircle size={18} /> Revisi</button>
                                    <button onClick={() => handleUpdateStatus('rejected')} className="btn-decision reject"><XCircle size={18} /> Tolak</button>
                                    <button onClick={() => handleUpdateStatus('published')} className="btn-decision publish"><CheckCircle size={18} /> Publish</button>
                                </div>
                            </div>
                        )}
                    </div>
                </>, document.body
            )}

            <style>{`
                /* --- CSS GLOBAL --- */
                .dashboard-wrapper { font-family: 'Poppins', sans-serif; color: var(--text); padding-bottom: 50px; }
                .dash-header { display: flex; justify-content: space-between; align-items: end; margin-bottom: 40px; border-bottom: 1px solid var(--border-muted); padding-bottom: 20px; }
                .badge-admin { color: var(--text-muted); display: inline-flex; align-items: center; gap: 6px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
                .dash-header h1 { font-size: 2.2rem; font-weight: 700; margin: 0; letter-spacing: -1px; line-height: 1.2; }
                .dash-header p { margin: 5px 0 0 0; color: var(--text-muted); font-size: 0.95rem; }
                .btn-refresh { background: var(--bg); border: 1px solid var(--border); padding: 10px 18px; display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 0.85rem; border-radius: 8px; color: var(--text); cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 5px rgba(0,0,0,0.02); }
                .btn-refresh:hover { background: var(--bg-light); border-color: var(--text-muted); transform: translateY(-1px); }
                
                .dashboard-section { margin-bottom: 60px; }
                .section-header { display: flex; align-items: center; gap: 12px; margin-bottom: 25px; color: var(--text); }
                .section-header h2 { font-size: 1.25rem; font-weight: 600; margin: 0; letter-spacing: -0.5px; }
                .count-badge { background: var(--text); color: var(--bg); padding: 2px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; margin-left: 8px; }

                /* --- CARD & SCROLLER --- */
                .card-scroller { display: flex; gap: 20px; overflow-x: auto; padding: 4px; padding-bottom: 20px; scroll-behavior: smooth; }
                .card-scroller::-webkit-scrollbar { height: 8px; }
                .card-scroller::-webkit-scrollbar-track { background: var(--bg-light); border-radius: 4px; }
                .card-scroller::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
                
                .news-card { min-width: 300px; width: 300px; background: var(--bg); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; cursor: pointer; transition: all 0.3s ease; position: relative; }
                .news-card:hover { transform: translateY(-5px); box-shadow: 0 10px 30px rgba(0,0,0,0.08); border-color: var(--text-muted); }
                .card-img-box { height: 180px; position: relative; overflow: hidden; }
                .card-img-box img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s ease; }
                .news-card:hover .card-img-box img { transform: scale(1.05); }
                .overlay-hover { position: absolute; inset: 0; background: rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.3s; backdrop-filter: blur(2px); }
                .news-card:hover .overlay-hover { opacity: 1; }
                .card-info { padding: 20px; }
                .card-meta { display: flex; gap: 8px; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
                .card-info h3 { font-size: 1.1rem; font-weight: 700; margin: 0; line-height: 1.5; color: var(--text); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

                /* --- PROMO IG INPUT BARU (HORIZONTAL) --- */
                .promo-input-wrapper { margin-bottom: 40px; }
                .promo-input-card { background: var(--bg); border: 1px solid var(--border); border-radius: 20px; overflow: hidden; box-shadow: 0 5px 20px rgba(0,0,0,0.03); }
                .card-header-small { padding: 18px 24px; background: var(--bg-light); border-bottom: 1px solid var(--border); }
                .card-header-small h3 { margin: 0; font-size: 1rem; font-weight: 600; display: flex; align-items: center; gap: 10px; color: var(--text); }
                
                .promo-form-body-horizontal { padding: 24px; display: flex; gap: 30px; align-items: start; }
                .upload-wrapper-compact { width: 180px; flex-shrink: 0; }
                .promo-upload-area { 
                    position: relative; width: 100%; aspect-ratio: 4/5; 
                    background: var(--bg-light); border: 2px dashed var(--border); border-radius: 12px; 
                    overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; 
                    cursor: pointer; transition: all 0.3s ease;
                }
                .promo-upload-area.empty:hover { border-color: var(--text); background: rgba(0,0,0,0.02); }
                .promo-upload-area.has-image { border-style: solid; border-color: transparent; }
                .placeholder-content { text-align: center; color: var(--text-muted); display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 10px; }
                .upload-title { font-weight: 600; font-size: 0.85rem; color: var(--text); }
                .promo-preview-lg { width: 100%; height: 100%; object-fit: cover; display: block; }
                .upload-hover-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.6); color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; opacity: 0; transition: opacity 0.2s; backdrop-filter: blur(2px); font-weight: 500; font-size: 0.9rem; }
                .promo-upload-area:hover .upload-hover-overlay { opacity: 1; }
                .file-input-hidden { display: none; }
                
                .promo-fields-expanded { flex: 1; display: flex; flex-direction: column; gap: 20px; }
                .input-group label { display: block; font-size: 0.85rem; color: var(--text); font-weight: 600; margin-bottom: 8px; }
                .styled-input { width: 100%; padding: 12px 16px; border: 1px solid var(--border); border-radius: 10px; background: var(--bg); color: var(--text); font-family: inherit; font-size: 0.95rem; transition: all 0.2s; resize: none; }
                .styled-input:focus { outline: none; border-color: var(--text); box-shadow: 0 0 0 3px rgba(100,100,100,0.1); }
                .input-with-icon { position: relative; }
                .input-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
                .styled-input.pl-icon { padding-left: 42px; }
                .btn-submit-promo { background: var(--text); color: var(--bg); border: none; padding: 14px; border-radius: 10px; font-weight: 700; cursor: pointer; transition: all 0.2s; margin-top: 10px; font-size: 1rem; }
                .btn-submit-promo:hover:not(:disabled) { opacity: 0.9; transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.2); }
                .btn-submit-promo:disabled { opacity: 0.6; cursor: not-allowed; }
                .flex-center { display: flex; align-items: center; justify-content: center; gap: 8px; }
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { 100% { transform: rotate(360deg); } }
                
                @media (max-width: 768px) { .promo-form-body-horizontal { flex-direction: column; } .upload-wrapper-compact { width: 100%; max-width: 200px; margin: 0 auto; } }

                /* --- LIST PROMO (GRID CARD BESAR) --- */
                .promo-grid-display { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 25px; }
                .promo-display-card { background: var(--bg); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; transition: all 0.2s; display: flex; flex-direction: column; }
                .promo-display-card:hover { transform: translateY(-5px); box-shadow: 0 10px 30px rgba(0,0,0,0.08); }
                
                .display-card-header { padding: 12px 16px; background: var(--bg-light); border-bottom: 1px solid var(--border-muted); display: flex; justify-content: space-between; align-items: center; }
                .badge-slot { background: var(--text); color: var(--bg); font-size: 0.75rem; padding: 2px 8px; border-radius: 4px; font-weight: 700; text-transform: uppercase; }
                .btn-delete-circle { width: 30px; height: 30px; border-radius: 50%; background: #fee2e2; color: #ef4444; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
                .btn-delete-circle:hover { background: #ef4444; color: white; transform: rotate(90deg); }
                
                .display-img-box { width: 100%; aspect-ratio: 4/5; position: relative; }
                .display-img-box img { width: 100%; height: 100%; object-fit: cover; }
                
                .display-info { padding: 16px; border-top: 1px solid var(--border-muted); flex: 1; display: flex; flex-direction: column; justify-content: space-between; }
                .display-caption { font-size: 0.9rem; color: var(--text); margin: 0 0 10px 0; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.5; }
                .link-text { font-size: 0.8rem; font-weight: 600; color: #3b82f6; display: inline-block; }
                .link-text:hover { text-decoration: underline; }

                /* TABEL ARSIP */
                .minimal-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 0.95rem; }
                .minimal-table th { text-align: left; padding: 15px 20px; border-bottom: 2px solid var(--border); color: var(--text-muted); font-weight: 600; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; }
                .minimal-table td { padding: 15px 20px; border-bottom: 1px solid var(--border-muted); vertical-align: middle; }
                .minimal-table tr:hover td { background: var(--bg-light); }
                
                /* DRAWER & EDITOR */
                .drawer-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 998; opacity: 0; pointer-events: none; transition: opacity 0.3s; }
                .drawer-backdrop.open { opacity: 1; pointer-events: auto; }
                .drawer-panel { position: fixed; top: 0; right: 0; bottom: 0; width: 600px; max-width: 90%; background: var(--bg); z-index: 999; border-left: 1px solid var(--border); transform: translateX(100%); transition: transform 0.3s ease; display: flex; flex-direction: column; }
                .drawer-panel.open { transform: translateX(0); }
                .drawer-container-flex { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
                .drawer-header.sticky-header { padding: 20px 30px; border-bottom: 1px solid var(--border-muted); display: flex; justify-content: space-between; align-items: center; background: var(--bg); flex-shrink: 0; }
                .drawer-title { margin: 0; font-size: 1.1rem; font-weight: 600; }
                .btn-close { background: transparent; border: none; cursor: pointer; color: var(--text-muted); }
                .btn-close:hover { color: var(--text); }
                .drawer-content.scrollable-content { flex: 1; overflow-y: auto; padding: 30px; }
                .meta-compact { display: flex; align-items: center; gap: 15px; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid var(--border-muted); }
                .meta-thumb { width: 50px; height: 50px; border-radius: 6px; object-fit: cover; }
                .author-name { margin: 0; font-weight: 500; font-size: 0.95rem; }
                .status-pill { font-size: 0.7rem; padding: 2px 8px; border-radius: 4px; background: var(--bg-light); color: var(--text-muted); text-transform: uppercase; margin-top: 4px; display: inline-block; }
                .form-group { margin-bottom: 20px; }
                .form-group label { display: block; margin-bottom: 8px; font-weight: 500; font-size: 0.85rem; color: var(--text-muted); }
                .input-minimal { width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg); color: var(--text); font-family: 'Poppins', sans-serif; font-size: 1rem; transition: all 0.2s ease; }
                .input-minimal:focus { outline: none; border-color: var(--text); box-shadow: 0 0 0 1px var(--text); }
                .category-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
                .cat-checkbox { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: var(--bg-light); border: 1px solid var(--border); border-radius: 6px; cursor: pointer; font-size: 0.85rem; color: var(--text-muted); transition: all 0.2s ease; user-select: none; }
                .cat-checkbox input { accent-color: var(--text); cursor: pointer; width: 14px; height: 14px; }
                .cat-checkbox:hover { border-color: var(--text); color: var(--text); }
                .cat-checkbox.active { border-color: var(--text); background: var(--bg); color: var(--text); box-shadow: 0 0 0 1px var(--text); }
                .admin-markdown-wrapper { border-radius: 6px; overflow: hidden; border: 1px solid var(--border); transition: all 0.2s ease; }
                .admin-markdown-wrapper:focus-within { border-color: var(--text); box-shadow: 0 0 0 1px var(--text); }
                .custom-md-editor.w-md-editor { background-color: var(--bg) !important; color: var(--text) !important; border: none !important; box-shadow: none !important; }
                .custom-md-editor .w-md-editor-toolbar { background-color: var(--bg-light) !important; border-bottom: 1px solid var(--border) !important; }
                .custom-md-editor .w-md-editor-toolbar li button { color: var(--text) !important; }
                .custom-md-editor .w-md-editor-toolbar li button:hover { background-color: var(--border) !important; color: var(--text) !important; }
                .custom-md-editor .w-md-editor-text-input, .custom-md-editor .w-md-editor-text-pre > code, .custom-md-editor .w-md-editor-text-pre { color: var(--text) !important; font-family: ui-monospace, SFMono-Regular, SF Mono, Consolas, Liberation Mono, Menlo, monospace !important; font-size: 0.95rem !important; line-height: 1.6 !important; }
                .custom-md-editor .wmde-markdown { background-color: var(--bg) !important; color: var(--text) !important; font-family: 'Poppins', sans-serif !important; font-size: 1rem !important; line-height: 1.8 !important; }
                .custom-md-editor .wmde-markdown h1, .custom-md-editor .wmde-markdown h2, .custom-md-editor .wmde-markdown h3 { font-weight: 600 !important; border-bottom: none !important; font-family: 'Poppins', sans-serif !important; }
                .drawer-footer.sticky-footer { padding: 20px 30px; border-top: 1px solid var(--border-muted); background: var(--bg); display: flex; gap: 15px; flex-shrink: 0; }
                .btn-decision { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; border: 1px solid var(--border); border-radius: 6px; cursor: pointer; background: var(--bg); color: var(--text); font-weight: 500; font-size: 0.9rem; transition: all 0.2s; }
                .btn-decision:hover { background: var(--bg-light); border-color: var(--text); }
                .publish { background: var(--text); color: var(--bg); border-color: var(--text); }
                .publish:hover { opacity: 0.9; background: var(--text); }
                .reject:hover { color: #ef4444; border-color: #ef4444; }
                @media (max-width: 768px) { .drawer-panel { width: 100%; } }
            `}</style>
        </div>
    );
}