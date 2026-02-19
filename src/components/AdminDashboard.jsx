import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { 
    Edit3, Trash2, CheckCircle, XCircle, 
    ShieldCheck, RefreshCw, Eye, ArrowLeftCircle,
    Inbox, Archive, FileText // Icon baru yang lebih clean
} from 'lucide-react';

// KONFIGURASI TOOLBAR (Sama dengan Editor Penulis)
const modules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'blockquote'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['link', 'image'],
    ['clean']
  ],
};

export default function AdminDashboard() {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // State Drawer & Editor
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [selectedArticle, setSelectedArticle] = useState(null);
    const [editorContent, setEditorContent] = useState('');
    const [editorTitle, setEditorTitle] = useState(''); 

    // 1. FETCH DATA
    const fetchData = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('articles')
            .select('*, profiles(full_name)')
            .order('created_at', { ascending: false }); 
        
        if (!error) setArticles(data || []);
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    // 2. PANEL REVIEW HANDLERS
    const handleOpenReview = (article) => {
        setSelectedArticle(article);
        setEditorContent(article.content || '');
        setEditorTitle(article.title || '');
        setIsPanelOpen(true);
    };

    const handleCloseReview = () => {
        setIsPanelOpen(false);
        setTimeout(() => setSelectedArticle(null), 300);
    };

    // 3. STATUS UPDATE
    const handleUpdateStatus = async (newStatus) => {
        if (!selectedArticle) return;

        let confirmMsg = "Simpan perubahan?";
        if (newStatus === 'published') confirmMsg = "Terbitkan berita ini sekarang?";
        if (newStatus === 'draft') confirmMsg = "Kembalikan ke penulis untuk revisi?";
        if (newStatus === 'rejected') confirmMsg = "Tolak dan arsipkan berita ini?";

        if (!confirm(confirmMsg)) return;

        try {
            const { error } = await supabase
                .from('articles')
                .update({ 
                    title: editorTitle, 
                    content: editorContent,
                    status: newStatus,
                    updated_at: new Date()
                })
                .eq('id', selectedArticle.id);

            if (error) throw error;

            alert("Status berhasil diperbarui.");
            handleCloseReview();
            fetchData(); 

        } catch (error) {
            alert("Gagal update: " + error.message);
        }
    };
    
    const handleDeletePermanent = async (id) => {
        if(!confirm("Hapus permanen? Data tidak bisa kembali.")) return;
        await supabase.from('articles').delete().eq('id', id);
        fetchData();
    }

    const pendingArticles = articles.filter(a => a.status === 'pending');

    return (
        <div className="dashboard-wrapper">
            
            {/* HEADER DASHBOARD */}
            <header className="dash-header">
                <div className="header-left">
                    <div className="badge-admin"><ShieldCheck size={14}/> Admin Panel</div>
                    <h1>Meja Redaksi</h1>
                    <p>Total {articles.length} artikel terdaftar.</p>
                </div>
                <button onClick={fetchData} className="btn-refresh"><RefreshCw size={16}/> Refresh</button>
            </header>

            {/* SECTION 1: ANTRIAN PENDING */}
            <section className="dashboard-section">
                <div className="section-header">
                    <Inbox size={20} strokeWidth={1.5} />
                    <h2>Antrian Review <span className="count-badge">{pendingArticles.length}</span></h2>
                </div>
                
                {pendingArticles.length === 0 ? (
                    <div className="empty-state">
                        <CheckCircle size={32} strokeWidth={1.5} className="text-muted"/>
                        <p>Tidak ada antrian pending.</p>
                    </div>
                ) : (
                    <div className="card-scroller">
                        {pendingArticles.map((item) => (
                            <div key={item.id} className="news-card" onClick={() => handleOpenReview(item)}>
                                <div className="card-img-box">
                                    <img src={item.cover_url || 'https://placehold.co/400'} alt="cover" />
                                    <div className="overlay-hover"><Eye size={24} color="white"/></div>
                                </div>
                                <div className="card-info">
                                    <div className="card-meta">
                                        <span>{new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                                        <span className="dot">•</span>
                                        <span>{item.profiles?.full_name || 'Anonim'}</span>
                                    </div>
                                    <h3>{item.title}</h3>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* SECTION 2: TABEL ARSIP */}
            <section className="dashboard-section">
                <div className="section-header">
                    <Archive size={20} strokeWidth={1.5} />
                    <h2>Database Arsip</h2>
                </div>
                
                <div className="table-responsive">
                    <table className="minimal-table">
                        <thead>
                            <tr>
                                <th>Judul Berita</th>
                                <th>Penulis</th>
                                <th>Status</th>
                                <th style={{textAlign: 'right'}}>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {articles.map((item) => (
                                <tr key={item.id} className={item.status === 'pending' ? 'row-highlight' : ''}>
                                    <td className="td-title">
                                        <span className="title-text">{item.title}</span>
                                        <span className="date-text">{new Date(item.created_at).toLocaleDateString()}</span>
                                    </td>
                                    <td className="td-author">{item.profiles?.full_name || 'Redaksi'}</td>
                                    <td>
                                        <span className={`status-dot ${item.status}`}></span>
                                        <span className="status-text">
                                            {item.status === 'published' ? 'Live' : (item.status === 'rejected' ? 'Ditolak' : (item.status === 'draft' ? 'Draft' : 'Pending'))}
                                        </span>
                                    </td>
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

            {/* --- DRAWER EDITOR --- */}
            <div className={`drawer-backdrop ${isPanelOpen ? 'open' : ''}`} onClick={handleCloseReview}></div>
            
            <div className={`drawer-panel ${isPanelOpen ? 'open' : ''}`}>
                {selectedArticle && (
                    <>
                        <div className="drawer-header">
                            <div>
                                <h2 className="drawer-title">Editor Mode</h2>
                            </div>
                            <button onClick={handleCloseReview} className="btn-close"><XCircle size={24} strokeWidth={1.5} /></button>
                        </div>

                        <div className="drawer-content">
                            <div className="meta-compact">
                                <img src={selectedArticle.cover_url || 'https://placehold.co/100'} className="meta-thumb" />
                                <div className="meta-info">
                                    <p className="author-name">{selectedArticle.profiles?.full_name || 'Redaksi'}</p>
                                    <span className={`status-pill ${selectedArticle.status}`}>{selectedArticle.status}</span>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Judul Headline</label>
                                <input 
                                    type="text" 
                                    className="input-minimal"
                                    value={editorTitle}
                                    onChange={(e) => setEditorTitle(e.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label>Isi Konten</label>
                                <div className="minimal-quill">
                                    <ReactQuill 
                                        theme="snow" 
                                        value={editorContent} 
                                        onChange={setEditorContent} 
                                        modules={modules} 
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="drawer-footer">
                            <button onClick={() => handleUpdateStatus('draft')} className="btn-decision revise">
                                <ArrowLeftCircle size={18} /> Revisi
                            </button>

                            <button onClick={() => handleUpdateStatus('rejected')} className="btn-decision reject">
                                <XCircle size={18} /> Tolak
                            </button>

                            <button onClick={() => handleUpdateStatus('published')} className="btn-decision publish">
                                <CheckCircle size={18} /> Publish
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* CSS MINIMALIST */}
            <style>{`
                .dashboard-wrapper { font-family: 'Poppins', sans-serif; color: var(--text); }
                
                /* HEADER */
                .dash-header { 
                    display: flex; justify-content: space-between; align-items: end; 
                    margin-bottom: 50px; border-bottom: 1px solid var(--border-muted); padding-bottom: 20px;
                }
                .badge-admin { 
                    color: var(--text-muted); display: inline-flex; align-items: center; gap: 6px;
                    font-size: 0.75rem; font-weight: 500; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px;
                }
                .dash-header h1 { font-size: 2rem; font-weight: 600; margin: 0; letter-spacing: -0.5px; }
                .dash-header p { margin: 5px 0 0 0; color: var(--text-muted); font-size: 0.9rem; }
                
                .btn-refresh { 
                    background: transparent; border: 1px solid var(--border); padding: 8px 16px; 
                    display: flex; align-items: center; gap: 8px; font-weight: 500; font-size: 0.85rem;
                    border-radius: 6px; color: var(--text); cursor: pointer; transition: all 0.2s;
                }
                .btn-refresh:hover { background: var(--bg-light); border-color: var(--text); }

                /* SECTIONS */
                .dashboard-section { margin-bottom: 60px; }
                .section-header { display: flex; align-items: center; gap: 10px; margin-bottom: 25px; color: var(--text); }
                .section-header h2 { font-size: 1.1rem; font-weight: 500; margin: 0; }
                .count-badge { background: var(--bg-light); padding: 2px 8px; border-radius: 12px; font-size: 0.8rem; font-weight: 600; margin-left: 8px; }

                /* CARDS (PENDING) */
                .card-scroller { display: flex; gap: 20px; overflow-x: auto; padding: 4px; padding-bottom: 20px; }
                .empty-state { 
                    padding: 40px; border: 1px dashed var(--border); border-radius: 8px; 
                    text-align: center; color: var(--text-muted); font-size: 0.9rem;
                }

                .news-card {
                    min-width: 280px; width: 280px; background: var(--bg);
                    border: 1px solid var(--border); border-radius: 8px; overflow: hidden;
                    cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;
                }
                .news-card:hover { transform: translateY(-3px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
                
                .card-img-box { height: 150px; position: relative; overflow: hidden; }
                .card-img-box img { width: 100%; height: 100%; object-fit: cover; }
                .overlay-hover { 
                    position: absolute; inset: 0; background: rgba(0,0,0,0.3); 
                    display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s;
                }
                .news-card:hover .overlay-hover { opacity: 1; }

                .card-info { padding: 15px; }
                .card-meta { display: flex; gap: 6px; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 8px; font-weight: 500; }
                .card-info h3 { font-size: 1rem; font-weight: 600; margin: 0; line-height: 1.4; color: var(--text); }

                /* TABLE MINIMALIST */
                .minimal-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
                .minimal-table th { text-align: left; padding: 12px 15px; border-bottom: 1px solid var(--border); color: var(--text-muted); font-weight: 500; font-size: 0.8rem; text-transform: uppercase; }
                .minimal-table td { padding: 12px 15px; border-bottom: 1px solid var(--border-muted); vertical-align: middle; }
                .row-highlight { background: var(--bg-light); }

                .title-text { display: block; font-weight: 500; color: var(--text); }
                .date-text { display: block; font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; }
                .td-author { color: var(--text-muted); }

                /* STATUS DOTS */
                .status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 8px; }
                .status-text { font-size: 0.85rem; font-weight: 500; }
                .status-dot.published { background: #10b981; } /* Green */
                .status-dot.pending { background: #f59e0b; } /* Amber */
                .status-dot.rejected { background: #ef4444; } /* Red */
                .status-dot.draft { background: #9ca3af; } /* Gray */

                .col-actions { text-align: right; }
                .icon-btn { 
                    padding: 6px; border: none; background: transparent; 
                    cursor: pointer; color: var(--text-muted); transition: color 0.2s;
                }
                .icon-btn:hover { color: var(--text); }
                .icon-btn.danger:hover { color: #ef4444; }

                /* DRAWER & FORM */
                .drawer-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 998; opacity: 0; pointer-events: none; transition: opacity 0.3s; }
                .drawer-backdrop.open { opacity: 1; pointer-events: auto; }

                .drawer-panel {
                    position: fixed; top: 0; right: 0; bottom: 0; width: 800px; max-width: 90%;
                    background: var(--bg); z-index: 999; border-left: 1px solid var(--border);
                    transform: translateX(100%); transition: transform 0.3s ease;
                    display: flex; flex-direction: column;
                }
                .drawer-panel.open { transform: translateX(0); }

                .drawer-header { padding: 20px 30px; border-bottom: 1px solid var(--border-muted); display: flex; justify-content: space-between; align-items: center; }
                .drawer-title { margin: 0; font-size: 1.1rem; font-weight: 600; }
                .btn-close { background: transparent; border: none; cursor: pointer; color: var(--text-muted); }
                .btn-close:hover { color: var(--text); }

                .drawer-content { flex: 1; overflow-y: auto; padding: 30px; }
                
                .meta-compact { display: flex; align-items: center; gap: 15px; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid var(--border-muted); }
                .meta-thumb { width: 50px; height: 50px; border-radius: 6px; object-fit: cover; }
                .author-name { margin: 0; font-weight: 500; font-size: 0.95rem; }
                .status-pill { font-size: 0.7rem; padding: 2px 8px; border-radius: 4px; background: var(--bg-light); color: var(--text-muted); text-transform: uppercase; margin-top: 4px; display: inline-block; }

                .form-group { margin-bottom: 20px; }
                .form-group label { display: block; margin-bottom: 8px; font-weight: 500; font-size: 0.85rem; color: var(--text-muted); }
                .input-minimal { width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg); color: var(--text); font-family: inherit; font-size: 1rem; }
                .input-minimal:focus { outline: none; border-color: var(--text); }

                .minimal-quill { border: 1px solid var(--border); border-radius: 6px; overflow: hidden; }
                .minimal-quill :global(.ql-toolbar) { border: none !important; border-bottom: 1px solid var(--border) !important; background: var(--bg-light); }
                .minimal-quill :global(.ql-container) { border: none !important; font-size: 1rem; min-height: 300px; }

                .drawer-footer {
                    padding: 20px 30px; border-top: 1px solid var(--border-muted); background: var(--bg);
                    display: flex; gap: 15px;
                }
                .btn-decision {
                    flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;
                    padding: 12px; border: 1px solid var(--border); border-radius: 6px; cursor: pointer;
                    background: var(--bg); color: var(--text); font-weight: 500; font-size: 0.9rem; transition: all 0.2s;
                }
                .btn-decision:hover { background: var(--bg-light); border-color: var(--text); }
                .publish { background: var(--text); color: var(--bg); border-color: var(--text); }
                .publish:hover { opacity: 0.9; background: var(--text); }
                .reject:hover { color: #ef4444; border-color: #ef4444; }

                @media (max-width: 768px) {
                    .drawer-panel { width: 100%; }
                }
            `}</style>
        </div>
    );
}