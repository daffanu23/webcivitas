import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import MDEditor from '@uiw/react-md-editor'; 
import { Edit3, Trash2, CheckCircle, XCircle, RefreshCw, Eye, ArrowLeftCircle, Inbox, Archive } from 'lucide-react';

export default function AdminMejaRedaksi({ serverCategories, serverArticles }) {
    const [articles, setArticles] = useState(serverArticles || []);
    const [availableCategories] = useState(serverCategories || []);
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

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
    };

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
        
        try {
            const { error } = await supabase.from('articles').update({ 
                title: editorTitle, 
                content: editorContent, 
                status: newStatus, 
                updated_at: new Date() 
            }).eq('id', selectedArticle.id);
            
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
        <div className="redaksi-container">
            <div className="redaksi-stats">
                <div className="stat-card">
                    <div className="stat-icon pending"><Inbox size={24} /></div>
                    <div className="stat-info">
                        <h3>{pendingArticles.length}</h3>
                        <p>Pending Review</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon total"><Archive size={24} /></div>
                    <div className="stat-info">
                        <h3>{articles.length}</h3>
                        <p>Total Artikel</p>
                    </div>
                </div>
            </div>

            <section className="admin-section">
                <div className="section-header-row">
                    <h2><Inbox size={20} /> Antrian Review</h2>
                    <button onClick={fetchData} className="btn-icon-text"><RefreshCw size={16}/> Sync Data</button>
                </div>

                {pendingArticles.length === 0 ? (
                    <div className="empty-state-modern">
                        <CheckCircle size={48} className="icon-success" />
                        <h3>Semua beres!</h3>
                        <p>Tidak ada artikel yang menunggu review saat ini.</p>
                    </div>
                ) : (
                    <div className="modern-grid">
                        {pendingArticles.map((item) => (
                            <div key={item.id} className="article-card-modern" onClick={() => handleOpenReview(item)}>
                                <div className="card-thumb">
                                    <img src={item.cover_url || 'https://placehold.co/400'} alt="cover" />
                                    <div className="card-badge-status">Pending</div>
                                </div>
                                <div className="card-body">
                                    <p className="card-author">Oleh {item.profiles?.full_name || 'Anonim'}</p>
                                    <h3>{item.title}</h3>
                                    <div className="card-footer">
                                        <span>{new Date(item.created_at).toLocaleDateString()}</span>
                                        <button className="btn-review-mini">Review <Eye size={14}/></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <section className="admin-section mt-50">
                <div className="section-header-row">
                    <h2><Archive size={20} /> Database Artikel</h2>
                </div>
                <div className="modern-table-card">
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th>Info Berita</th>
                                <th>Status</th>
                                <th>Penulis</th>
                                <th style={{textAlign: 'right'}}>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {articles.map((item) => (
                                <tr key={item.id}>
                                    <td>
                                        <div className="table-title-box">
                                            <span className="main-title">{item.title}</span>
                                            <span className="sub-date">{new Date(item.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`badge-status ${item.status}`}>
                                            {item.status}
                                        </span>
                                    </td>
                                    <td>{item.profiles?.full_name || 'Redaksi'}</td>
                                    <td className="table-actions">
                                        <button onClick={() => handleOpenReview(item)} className="btn-action-icon edit"><Edit3 size={16} /></button>
                                        <button onClick={() => handleDeletePermanent(item.id)} className="btn-action-icon delete"><Trash2 size={16} /></button>
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
                                <div className="drawer-header sticky-header">
                                    <div><h2 className="drawer-title">Review Artikel</h2></div>
                                    <button onClick={handleCloseReview} className="btn-close"><XCircle size={24} /></button>
                                </div>
                                <div className="drawer-content scrollable-content">
                                    <div className="article-meta-header">
                                        <img src={selectedArticle.cover_url || 'https://placehold.co/100'} className="meta-thumb-lg" />
                                        <div className="meta-text">
                                            <p className="meta-author">Kontributor: {selectedArticle.profiles?.full_name || 'Redaksi'}</p>
                                            <span className={`badge-status ${selectedArticle.status}`}>{selectedArticle.status}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="form-group-modern">
                                        <label>Judul Artikel</label>
                                        <input type="text" className="input-modern" value={editorTitle} onChange={(e) => setEditorTitle(e.target.value)} />
                                    </div>

                                    <div className="form-group-modern">
                                        <label>Pilih Kategori</label>
                                        <div className="category-chips">
                                            {availableCategories.map(cat => (
                                                <button 
                                                    key={cat.id} 
                                                    className={`chip ${selectedCategories.includes(cat.id) ? 'active' : ''}`}
                                                    onClick={() => toggleCategory(cat.id)}
                                                >
                                                    {cat.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="form-group-modern">
                                        <label>Konten Berita</label>
                                        <div className="md-editor-container">
                                            <MDEditor value={editorContent} onChange={setEditorContent} height={400} preview="edit" />
                                        </div>
                                    </div>
                                </div>
                                <div className="drawer-footer sticky-footer">
                                    <button onClick={() => handleUpdateStatus('draft')} className="btn-outcome draft"><ArrowLeftCircle size={18} /> Revisi</button>
                                    <button onClick={() => handleUpdateStatus('rejected')} className="btn-outcome reject"><XCircle size={18} /> Tolak</button>
                                    <button onClick={() => handleUpdateStatus('published')} className="btn-outcome publish"><CheckCircle size={18} /> Publikasikan</button>
                                </div>
                            </div>
                        )}
                    </div>
                </>, document.body
            )}

            <style>{`
                .redaksi-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 50px; }
                .stat-card { background: var(--bg-light); padding: 30px; border-radius: 20px; border: 1px solid var(--border-muted); display: flex; align-items: center; gap: 20px; }
                .stat-icon { width: 56px; height: 56px; border-radius: 16px; display: flex; align-items: center; justify-content: center; }
                .stat-icon.pending { background: rgba(249, 115, 22, 0.1); color: #f97316; }
                .stat-icon.total { background: rgba(14, 165, 233, 0.1); color: #0ea5e9; }
                .stat-info h3 { font-size: 1.8rem; font-weight: 700; margin: 0; color: var(--text); }
                .stat-info p { font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); margin: 0; }

                .admin-section { margin-bottom: 60px; }
                .section-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
                .section-header-row h2 { font-size: 1.4rem; font-weight: 700; display: flex; align-items: center; gap: 12px; color: var(--text); }
                
                .btn-icon-text { background: var(--bg-light); border: 1px solid var(--border); padding: 10px 20px; border-radius: 12px; display: flex; align-items: center; gap: 8px; font-size: 0.85rem; font-weight: 600; color: var(--text); cursor: pointer; transition: all 0.2s; }
                .btn-icon-text:hover { border-color: var(--text); transform: translateY(-2px); }

                /* MODERN GRID */
                .modern-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 30px; }
                .article-card-modern { background: var(--bg-light); border: 1px solid var(--border-muted); border-radius: 18px; overflow: hidden; cursor: pointer; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
                .article-card-modern:hover { transform: translateY(-8px); border-color: var(--text-muted); box-shadow: 0 20px 40px rgba(0,0,0,0.1); }
                .card-thumb { height: 180px; position: relative; }
                .card-thumb img { width: 100%; height: 100%; object-fit: cover; }
                .card-badge-status { position: absolute; top: 15px; right: 15px; background: #dc2626; color: white; padding: 5px 12px; border-radius: 8px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
                .card-body { padding: 25px; }
                .card-author { font-size: 0.75rem; color: var(--text-muted); margin-bottom: 10px; font-weight: 600; text-transform: uppercase; }
                .card-body h3 { font-size: 1.15rem; font-weight: 700; margin: 0 0 20px 0; line-height: 1.4; color: var(--text); }
                .card-footer { border-top: 1px solid var(--border-muted); padding-top: 15px; display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; color: var(--text-muted); }
                .btn-review-mini { background: var(--text); color: var(--bg); border: none; padding: 6px 14px; border-radius: 50px; font-weight: 700; display: flex; align-items: center; gap: 6px; cursor: pointer; }

                /* MODERN TABLE */
                .modern-table-card { background: var(--bg-light); border: 1px solid var(--border-muted); border-radius: 18px; overflow: hidden; }
                .modern-table { width: 100%; border-collapse: collapse; }
                .modern-table th { background: var(--bg); text-align: left; padding: 20px; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1.5px; color: var(--text-muted); border-bottom: 1px solid var(--border-muted); }
                .modern-table td { padding: 20px; border-bottom: 1px solid var(--border-muted); font-size: 0.9rem; color: var(--text); }
                .modern-table tr:hover td { background: var(--bg); }
                
                .badge-status { padding: 5px 12px; border-radius: 8px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; }
                .badge-status.published { background: rgba(22, 163, 74, 0.1); color: #16a34a; }
                .badge-status.pending { background: rgba(249, 115, 22, 0.1); color: #f97316; }
                .badge-status.draft { background: var(--bg); color: var(--text-muted); border: 1px solid var(--border); }
                .badge-status.rejected { background: rgba(220, 38, 38, 0.1); color: #dc2626; }

                .btn-action-icon { width: 36px; height: 36px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg); color: var(--text); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
                .btn-action-icon:hover { background: var(--text); color: var(--bg); }

                /* DRAWER - Mengikuti Transition:animate="fade" feel */
                .drawer-panel { width: 700px; background: var(--bg); border-left: 1px solid var(--border); }
                .drawer-header { background: var(--bg); border-bottom: 1px solid var(--border-muted); padding: 25px 40px; }
                .drawer-content { padding: 40px; }
                .meta-thumb-lg { width: 100px; height: 100px; border-radius: 16px; border: 1px solid var(--border); }
                
                .input-modern { background: var(--bg-light); border: 1px solid var(--border); color: var(--text); padding: 15px 20px; border-radius: 12px; }
                .input-modern:focus { border-color: var(--text); }
                
                .chip { background: var(--bg-light); border: 1px solid var(--border); color: var(--text-muted); padding: 8px 18px; border-radius: 50px; font-weight: 600; }
                .chip.active { background: #dc2626; color: white; border-color: #dc2626; }
                
                .md-editor-container { border-radius: 12px; overflow: hidden; border: 1px solid var(--border); }
                
                .btn-outcome { height: 54px; border-radius: 12px; }
                .btn-outcome.publish { background: #dc2626; color: white; }
            `}</style>
        </div>
    );
}
