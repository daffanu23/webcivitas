import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import ImageExtension from '@tiptap/extension-image';
import { 
    Edit3, Trash2, CheckCircle, XCircle, 
    Save, X, Bold, Italic, List, ShieldCheck, RefreshCw
} from 'lucide-react';

// --- TIPTAP EDITOR ---
const TiptapEditor = ({ content, onChange, editable }) => {
    const editor = useEditor({
        extensions: [StarterKit, ImageExtension],
        content: content,
        editable: editable,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
    });

    if (!editor) return null;

    return (
        <div className="editor-wrapper">
            {editable && (
                <div className="editor-toolbar">
                    <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'active' : ''}><Bold size={16}/></button>
                    <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'active' : ''}><Italic size={16}/></button>
                    <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={editor.isActive('heading', { level: 2 }) ? 'active' : ''}>H2</button>
                    <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={editor.isActive('bulletList') ? 'active' : ''}><List size={16}/></button>
                </div>
            )}
            <EditorContent editor={editor} className="prose-editor" />
        </div>
    );
};

// --- MAIN DASHBOARD ---
export default function AdminDashboard() {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // State Drawer
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [selectedArticle, setSelectedArticle] = useState(null);
    const [editorContent, setEditorContent] = useState('');

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

    // HANDLERS
    const handleOpenReview = (article) => {
        setSelectedArticle(article);
        setEditorContent(article.content);
        setIsPanelOpen(true);
    };

    const handleCloseReview = () => {
        setIsPanelOpen(false);
        setTimeout(() => setSelectedArticle(null), 300);
    };

    // Generic Status Update (Publish/Reject/Draft)
    const handleUpdateStatus = async (newStatus, articleId = null) => {
        const targetId = articleId || selectedArticle?.id;
        if (!targetId) return;

        let confirmMsg = "Simpan perubahan?";
        if (newStatus === 'published') confirmMsg = "Terbitkan berita ini?";
        if (newStatus === 'rejected') confirmMsg = "Tolak berita ini? (Akan masuk arsip rejected)";

        if (!confirm(confirmMsg)) return;

        // If updating from drawer, use editor content. If from card/list, keep current content.
        const contentToSave = (articleId) ? articles.find(a => a.id === articleId).content : editorContent;

        const { error } = await supabase
            .from('articles')
            .update({ 
                content: contentToSave, 
                status: newStatus 
            })
            .eq('id', targetId);

        if (!error) {
            alert("Berhasil!");
            if (isPanelOpen) handleCloseReview();
            fetchData();
        } else {
            alert("Gagal: " + error.message);
        }
    };
    
    // Delete Permanent (Only from table)
    const handleDeletePermanent = async (id) => {
        if(!confirm("HAPUS PERMANEN? Data tidak bisa dikembalikan!")) return;
        await supabase.from('articles').delete().eq('id', id);
        fetchData();
    }

    const pendingArticles = articles.filter(a => a.status === 'pending');

    return (
        <div className="dashboard-wrapper">
            
            {/* HEADER */}
            <header className="dash-header">
                <div className="header-left">
                    <h1>DASHBOARD</h1>
                    <p>Kelola antrian berita & konten.</p>
                </div>
                <div className="dash-badge">
                    <ShieldCheck size={16}/> ADMIN MODE
                </div>
            </header>

            {/* HORIZONTAL SCROLL (PENDING ONLY) */}
            <section className="horizontal-section">
                <h2 className="section-label">🔴 MENUNGGU REVIEW</h2>
                {pendingArticles.length === 0 ? (
                    <div className="empty-queue">
                        <CheckCircle size={40}/>
                        <p>Tidak ada antrian pending.</p>
                    </div>
                ) : (
                    <div className="card-scroller">
                        {pendingArticles.map((item) => (
                            <div key={item.id} className="news-card">
                                {/* Gambar */}
                                <div className="card-img-box">
                                    <img src={item.cover_url || 'https://placehold.co/400'} alt="cover" />
                                </div>
                                
                                {/* Info Konten */}
                                <div className="card-info">
                                    {/* STRUKTUR BARU: Tanggal/Penulis DULUAN */}
                                    <div className="card-meta-top">
                                        <span className="timestamp">{new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                        <span className="divider">/</span>
                                        <span className="author">{item.profiles?.full_name || 'Redaksi'}</span>
                                    </div>
                                    
                                    {/* Judul di Bawahnya (Selalu Muncul) */}
                                    <h3>{item.title}</h3>
                                </div>

                                {/* Tombol Aksi (Slide Up inside Card) */}
                                <div className="card-actions">
                                    <button onClick={() => handleUpdateStatus('published', item.id)} className="btn-action approve">ACCEPT</button>
                                    <button onClick={() => handleOpenReview(item)} className="btn-action review">REVIEW</button>
                                    <button onClick={() => handleUpdateStatus('rejected', item.id)} className="btn-action deny">DENY</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* TABLE (ALL DATA - ARCHIVE) */}
            <section className="table-section">
                <div className="table-header">
                    <h2 className="section-label">🗄️ ARSIP BERITA (SEMUA STATUS)</h2>
                    <button onClick={fetchData} className="btn-refresh"><RefreshCw size={16}/> REFRESH</button>
                </div>
                
                <div className="table-responsive">
                    <table className="brutalist-table">
                        <thead>
                            <tr>
                                <th style={{width: '120px'}}>AKSI</th>
                                <th>JUDUL</th>
                                <th>PENULIS</th>
                                <th>TANGGAL</th>
                                <th>STATUS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {articles.map((item) => (
                                <tr key={item.id}>
                                    <td className="col-actions">
                                        {/* Edit opens Drawer */}
                                        <button onClick={() => handleOpenReview(item)} className="icon-btn" title="Edit/Review"><Edit3 size={18} /></button>
                                        {/* Delete Permanent */}
                                        <button onClick={() => handleDeletePermanent(item.id)} className="icon-btn danger" title="Hapus Permanen"><Trash2 size={18} /></button>
                                    </td>
                                    <td><strong>{item.title}</strong></td>
                                    <td>{item.profiles?.full_name || 'Redaksi'}</td>
                                    <td>{new Date(item.created_at).toLocaleDateString()}</td>
                                    <td>
                                        {/* Status Badge Logic */}
                                        <span className={`status-badge ${item.status}`}>
                                            {item.status === 'published' ? 'LIVE' : (item.status === 'rejected' ? 'DITOLAK' : 'PENDING')}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* DRAWER (SLIDE OVER) */}
            <div className={`drawer-backdrop ${isPanelOpen ? 'open' : ''}`} onClick={handleCloseReview}></div>
            
            <div className={`drawer-panel ${isPanelOpen ? 'open' : ''}`}>
                {selectedArticle && (
                    <>
                        <div className="drawer-header">
                            <h2>EDITOR REVIEW</h2>
                            <button onClick={handleCloseReview} className="btn-close"><X size={24} /></button>
                        </div>

                        <div className="drawer-content">
                            <div className="meta-edit-box">
                                <img src={selectedArticle.cover_url} className="meta-img" />
                                <div className="meta-text">
                                    <h3>{selectedArticle.title}</h3>
                                    <p>{selectedArticle.profiles?.full_name} • {new Date(selectedArticle.created_at).toLocaleDateString()}</p>
                                    <div style={{marginTop: '10px'}}>
                                        Status Saat Ini: <span className={`status-badge ${selectedArticle.status}`}>{selectedArticle.status.toUpperCase()}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="rich-editor-container">
                                <TiptapEditor content={editorContent} onChange={setEditorContent} editable={true} />
                            </div>
                        </div>

                        <div className="drawer-footer">
                            <button onClick={() => handleUpdateStatus('published')} className="btn-save success">PUBLISH (LIVE)</button>
                            <button onClick={() => handleUpdateStatus('rejected')} className="btn-save danger">REJECT (TOLAK)</button>
                            <button onClick={() => handleUpdateStatus('pending')} className="btn-save warning">SIMPAN DRAFT</button>
                        </div>
                    </>
                )}
            </div>

            {/* CSS STYLES */}
            <style jsx="true">{`
                .dashboard-wrapper { font-family: 'Poppins', sans-serif; padding-bottom: 100px; color: #111; }
                
                /* HEADER */
                .dash-header { 
                    display: flex; justify-content: space-between; align-items: end; 
                    margin-bottom: 40px; border-bottom: 1px solid #111; padding-bottom: 20px;
                }
                .dash-header h1 { font-size: 3rem; font-weight: 900; line-height: 1; letter-spacing: -2px; margin: 0; text-transform: uppercase; }
                .dash-header p { margin: 0; color: #666; font-size: 1.1rem; }
                .dash-badge { 
                    background: #111; color: #fff; padding: 6px 12px; 
                    font-weight: 700; font-size: 0.8rem; display: flex; align-items: center; gap: 8px;
                }

                .section-label { font-size: 1rem; font-weight: 800; letter-spacing: 1px; margin-bottom: 20px; text-transform: uppercase; border-left: 4px solid #111; padding-left: 10px; }

                /* HORIZONTAL SCROLL */
                .horizontal-section { margin-bottom: 60px; }
                .card-scroller {
                    display: flex; gap: 30px; overflow-x: auto;
                    padding: 10px 10px 20px 10px;
                    
                    /* ANTI-JUMPING FIX */
                    min-height: 400px; 
                    align-items: flex-start;
                }
                
                /* --- NEWS CARD (HOMEPAGE STYLE) --- */
                .news-card {
                    min-width: 320px; width: 320px; 
                    height: 300px; 
                    background: white;
                    border: 1px solid #111; 
                    position: relative;
                    display: flex; flex-direction: column;
                    transition: transform 0.2s ease, box-shadow 0.2s ease, height 0.2s ease;
                    overflow: hidden;
                }

                .news-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 4px 4px 0px #111; 
                    height: 350px; 
                    z-index: 10;
                }

                .card-img-box { 
                    height: 160px; width: 100%; 
                    border-bottom: 1px solid #111; 
                    overflow: hidden; 
                    background: #eee;
                    flex-shrink: 0; 
                }
                
                .card-img-box img { 
                    width: 100%; height: 100%; object-fit: cover; 
                    filter: grayscale(100%); 
                    transition: filter 0.3s ease, transform 0.3s ease;
                }
                
                .news-card:hover .card-img-box img { 
                    filter: grayscale(0%); 
                    transform: scale(1.03); 
                }
                
                .card-info { 
                    padding: 20px; flex: 1; background: #fff; 
                    display: flex; flex-direction: column; justify-content: flex-start; 
                }

                .card-meta-top { 
                    font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: #666; 
                    margin-bottom: 8px; display: flex; gap: 5px;
                }
                
                .card-info h3 { 
                    font-size: 1.2rem; line-height: 1.3; font-weight: 800; margin: 0; 
                    color: #111; display: block; 
                    display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
                }
                
                /* ACTION BUTTONS */
                .card-actions {
                    position: absolute; bottom: 0; left: 0; width: 100%;
                    padding: 15px; 
                    display: flex; gap: 10px; 
                    background: #fff;
                    border-top: 1px solid #eee;
                    transform: translateY(100%);
                    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                
                .news-card:hover .card-actions { transform: translateY(0); }

                .btn-action { 
                    flex: 1; border: 1px solid #111; background: #fff; color: #111; 
                    padding: 8px 0; font-weight: 700; cursor: pointer; 
                    font-size: 0.7rem; text-transform: uppercase; transition: all 0.2s;
                }
                .btn-action:hover { background: #111; color: #fff; }
                
                .btn-action.approve { background: #fff; }
                .btn-action.approve:hover { background: #22c55e; border-color: #22c55e; color: white; }

                .btn-action.review { background: #fff; }
                .btn-action.review:hover { background: #eab308; border-color: #eab308; color: white; }
                
                .btn-action.deny { background: #fff; }
                .btn-action.deny:hover { background: #ef4444; border-color: #ef4444; color: white; }
                
                /* --- TABLE SECTION --- */
                .table-section { border: 1px solid #111; padding: 30px; background: white; box-shadow: 4px 4px 0 rgba(0,0,0,0.1); }
                .table-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
                
                .btn-refresh { 
                    background: #111; color: white; border: none; padding: 10px 20px; 
                    font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 8px;
                }
                .btn-refresh:hover { opacity: 0.8; }

                .brutalist-table { width: 100%; border-collapse: collapse; }
                .brutalist-table th { text-align: left; padding: 15px; border-bottom: 2px solid #111; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; font-size: 0.9rem; }
                .brutalist-table td { padding: 15px; border-bottom: 1px solid #eee; vertical-align: middle; font-weight: 500; }
                
                .status-badge { 
                    padding: 4px 8px; font-weight: 700; text-transform: uppercase; font-size: 0.7rem; border: 1px solid #111; display: inline-block;
                }
                .status-badge.published { background: #111; color: #fff; }
                .status-badge.pending { background: #fff; color: #111; border-style: dashed; }
                .status-badge.rejected { background: #fee2e2; color: #b91c1c; border-color: #b91c1c; }
                
                .icon-btn { background: none; border: 1px solid transparent; cursor: pointer; padding: 5px; border-radius: 4px; }
                .icon-btn:hover { background: #eee; }
                .icon-btn.danger:hover { background: #fee2e2; color: #b91c1c; }

                /* --- DRAWER --- */
                .drawer-backdrop {
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(0,0,0,0.7); z-index: 998; 
                    opacity: 0; pointer-events: none; transition: opacity 0.3s;
                }
                .drawer-backdrop.open { opacity: 1; pointer-events: auto; }

                .drawer-panel {
                    position: fixed; top: 0; right: 0; 
                    width: 50%; height: 100vh;
                    background: #fff; z-index: 999;
                    border-left: 1px solid #111; 
                    transform: translateX(100%);
                    transition: transform 0.4s cubic-bezier(0.19, 1, 0.22, 1);
                    display: flex; flex-direction: column;
                }
                .drawer-panel.open { transform: translateX(0); }

                .drawer-header {
                    padding: 20px 30px; border-bottom: 1px solid #111; display: flex; justify-content: space-between; align-items: center; background: #fff;
                }
                .drawer-header h2 { margin: 0; font-weight: 900; letter-spacing: -1px; font-size: 1.5rem; text-transform: uppercase; }
                .btn-close { background: none; border: none; cursor: pointer; }

                .drawer-content { padding: 40px; overflow-y: auto; flex: 1; }
                .meta-edit-box { display: flex; gap: 20px; margin-bottom: 30px; border-bottom: 1px solid #eee; padding-bottom: 20px; }
                .meta-img { width: 100px; height: 100px; object-fit: cover; border: 1px solid #111; }
                .meta-text h3 { margin: 0 0 10px 0; font-size: 1.5rem; font-weight: 800; line-height: 1.2; }

                .drawer-footer {
                    padding: 20px 30px; border-top: 1px solid #111; display: flex; gap: 15px; background: #f4f4f4;
                }
                .btn-save { 
                    flex: 1; border: 1px solid #111; padding: 15px; font-weight: 800; cursor: pointer; 
                    text-transform: uppercase; font-size: 0.9rem; transition: all 0.2s;
                }
                .btn-save:hover { background: #111; color: white; }
                
                .btn-save.success { background: #22c55e; border-color: #22c55e; color: white; }
                .btn-save.success:hover { background: #166534; }
                
                .btn-save.warning { background: #fff; color: #111; }
                .btn-save.danger { background: #fee2e2; color: #b91c1c; border-color: #b91c1c; }
                .btn-save.danger:hover { background: #b91c1c; color: white; }

                /* EDITOR STYLE */
                .editor-wrapper { border: 1px solid #111; min-height: 400px; }
                .editor-toolbar { background: #111; padding: 8px; display: flex; gap: 8px; }
                .editor-toolbar button { 
                    padding: 6px 12px; background: #fff; border: 1px solid #111; cursor: pointer; font-weight: 700; 
                }
                .editor-toolbar button.active { background: #ffff00; }
                .prose-editor { padding: 30px; outline: none; }
                
                .prose-editor :global(h2) { font-weight: 800; font-size: 1.5rem; margin-top: 1em; }
                .prose-editor :global(p) { margin-bottom: 1em; line-height: 1.8; }

                @media (max-width: 768px) { .drawer-panel { width: 90%; } }
            `}</style>
        </div>
    );
}