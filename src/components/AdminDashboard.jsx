import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import MDEditor from '@uiw/react-md-editor';
import {
    Edit3, Trash2, CheckCircle, XCircle, ShieldCheck, RefreshCw, Eye,
    ArrowLeftCircle, Inbox, Archive, Instagram, Upload, PlusCircle,
    BookOpen, ChevronDown, ChevronRight, Sparkles, ExternalLink, Filter
} from 'lucide-react';
import MagazineManager from './MagazineManager';
import ProfileComboSelect from './ProfileComboSelect';

export default function AdminDashboard({ serverCategories, serverArticles, userId }) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const [activeTab, setActiveTab] = useState('review');

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
    const [editorId, setEditorId] = useState(null);
    const [layouterId, setLayouterId] = useState(null);

    const fetchData = async () => {
        const { data: articlesData } = await supabase
            .from('articles')
            .select('*, profiles!author_id(full_name), article_categories(category_id)')
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
        if (!newPromo.file && !newPromo.image_url) return alert("Pilih gambar terlebih dahulu!");

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
            alert("Promo berhasil ditambahkan!");
            fetchData();

        } catch (error) {
            console.error(error);
            alert('Gagal upload promo: ' + error.message);
        } finally {
            setIsUploadingPromo(false);
        }
    };

    const deletePromo = async (id) => {
        if (!confirm("Hapus promo ini dari etalase?")) return;
        try {
            await supabase.from('ig_promos').delete().eq('id', id);
            fetchData();
        } catch (error) {
            alert("Gagal hapus: " + error.message);
        }
    };

    // --- FUNGSI EDITOR BERITA ---
    const handleOpenReview = (article) => {
        setSelectedArticle(article);
        setEditorContent(article.content || '');
        setEditorTitle(article.title || '');
        setSelectedCategories(article.article_categories ? article.article_categories.map(ac => ac.category_id) : []);
        setEditorId(article.editor_id || null);
        setLayouterId(article.layouter_id || null);
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
        if (newStatus === 'published' && selectedCategories.length === 0) return alert("Berita yang dipublish wajib memiliki minimal 1 kategori!");
        let confirmMsg = newStatus === 'published' ? "Terbitkan berita ini sekarang?" : newStatus === 'draft' ? "Kembalikan ke penulis untuk revisi?" : "Tolak dan arsipkan berita ini?";
        if (!confirm(confirmMsg)) return;

        try {
            const { error } = await supabase.from('articles').update({ title: editorTitle, content: editorContent, status: newStatus, updated_at: new Date(), editor_id: editorId || null, layouter_id: layouterId || null }).eq('id', selectedArticle.id);
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
        if (!confirm("Hapus artikel ini secara permanen dari database?")) return;
        await supabase.from('articles').delete().eq('id', id);
        fetchData();
    };

    const pendingArticles = articles.filter(a => a.status === 'pending');

    const getStatusBadge = (status) => {
        switch (status) {
            case 'published':
                return <span className="status-badge-pill live">Live</span>;
            case 'pending':
                return <span className="status-badge-pill pending">Review</span>;
            case 'draft':
                return <span className="status-badge-pill draft">Revisi</span>;
            case 'rejected':
                return <span className="status-badge-pill rejected">Ditolak</span>;
            default:
                return <span className="status-badge-pill draft">{status}</span>;
        }
    };

    return (
        <div className="adm-container">
            {/* SIDEBAR NAVIGATION (Desktop) */}
            <aside className="adm-sidebar">
                <div className="adm-brand">
                    <div className="adm-brand-icon">
                        <ShieldCheck size={22} />
                    </div>
                    <div>
                        <h2>Admin Panel</h2>
                        <span>Mediacivitas</span>
                    </div>
                </div>

                <nav className="adm-nav-list">
                    <button
                        className={`adm-nav-btn ${activeTab === 'review' ? 'active' : ''}`}
                        onClick={() => setActiveTab('review')}
                    >
                        <Inbox size={18} />
                        <span>Meja Redaksi</span>
                        {pendingArticles.length > 0 && (
                            <span className="adm-counter-badge">{pendingArticles.length}</span>
                        )}
                    </button>

                    <button
                        className={`adm-nav-btn ${activeTab === 'archive' ? 'active' : ''}`}
                        onClick={() => setActiveTab('archive')}
                    >
                        <Archive size={18} />
                        <span>Arsip Berita</span>
                        <span className="adm-sub-badge">{articles.length}</span>
                    </button>

                    <button
                        className={`adm-nav-btn ${activeTab === 'magazine' ? 'active' : ''}`}
                        onClick={() => setActiveTab('magazine')}
                    >
                        <BookOpen size={18} />
                        <span>Manajemen Terbitan</span>
                    </button>

                    <button
                        className={`adm-nav-btn ${activeTab === 'promo' ? 'active' : ''}`}
                        onClick={() => setActiveTab('promo')}
                    >
                        <Instagram size={18} />
                        <span>Etalase IG</span>
                        {promos.length > 0 && (
                            <span className="adm-sub-badge">{promos.length}/4</span>
                        )}
                    </button>
                </nav>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main className="adm-main-content">
                {/* Mobile Section Selector */}
                <div className="adm-mobile-header">
                    <div className="adm-mobile-title">
                        <ShieldCheck size={20} className="adm-text-primary" />
                        <span>Admin Manajemen</span>
                    </div>
                    <div className="adm-select-wrapper">
                        <select
                            value={activeTab}
                            onChange={(e) => setActiveTab(e.target.value)}
                            className="adm-mobile-select"
                        >
                            <option value="review">📥 Meja Redaksi {pendingArticles.length > 0 ? `(${pendingArticles.length} Antrian)` : ''}</option>
                            <option value="archive">📁 Arsip Berita ({articles.length} Artikel)</option>
                            <option value="magazine">📖 Manajemen Terbitan (Majalah)</option>
                            <option value="promo">📸 Etalase Instagram ({promos.length}/4)</option>
                        </select>
                        <ChevronDown size={18} className="adm-select-arrow" />
                    </div>
                </div>

                {/* Section Header */}
                <header className="adm-section-header">
                    <div>
                        <h1>
                            {activeTab === 'review' && 'Meja Redaksi'}
                            {activeTab === 'archive' && 'Database Arsip Berita'}
                            {activeTab === 'magazine' && 'Manajemen Edisi Terbitan'}
                            {activeTab === 'promo' && 'Etalase Promosi Instagram'}
                        </h1>
                        <p>
                            {activeTab === 'review' && 'Tinjau artikel masuk dari kontributor sebelum dipublikasikan.'}
                            {activeTab === 'archive' && 'Kelola, cari, dan sunting seluruh artikel berita yang pernah ditulis.'}
                            {activeTab === 'magazine' && 'Atur majalah digital, tabloid, dan edisi cetak yang ada di rak terbitan.'}
                            {activeTab === 'promo' && 'Kelola 4 slot kartu postingan Instagram yang tampil di beranda.'}
                        </p>
                    </div>

                    {activeTab !== 'magazine' && (
                        <button onClick={fetchData} className="adm-refresh-btn" title="Refresh data terbaru">
                            <RefreshCw size={15} />
                            <span>Segarkan</span>
                        </button>
                    )}
                </header>

                {/* TAB CONTENT PANES */}
                <div className="adm-tab-body">
                    {/* TAB 1: MEJA REDAKSI (REVIEW) */}
                    {activeTab === 'review' && (
                        <div className="adm-pane">
                            {pendingArticles.length === 0 ? (
                                <div className="adm-empty-box">
                                    <div className="adm-empty-icon">
                                        <CheckCircle size={36} />
                                    </div>
                                    <h3>Tidak Ada Antrian Review</h3>
                                    <p>Semua kiriman artikel telah ditinjau dan dipublikasikan.</p>
                                </div>
                            ) : (
                                <div className="adm-review-grid">
                                    {pendingArticles.map((item) => (
                                        <div
                                            key={item.id}
                                            className="adm-review-card"
                                            onClick={() => handleOpenReview(item)}
                                        >
                                            <div className="adm-review-thumb">
                                                <img src={item.cover_url || 'https://placehold.co/400x250'} alt={item.title} />
                                                <div className="adm-review-badge">Perlu Review</div>
                                            </div>
                                            <div className="adm-review-details">
                                                <div className="adm-review-meta">
                                                    <span>{new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                                                    <span>•</span>
                                                    <span>{item.profiles?.full_name || 'Penulis Anonim'}</span>
                                                </div>
                                                <h4>{item.title}</h4>
                                                <div className="adm-review-action">
                                                    <span>Buka Editor & Review</span>
                                                    <ChevronRight size={16} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 2: ARSIP BERITA */}
                    {activeTab === 'archive' && (
                        <div className="adm-pane">
                            {/* Desktop Table View */}
                            <div className="adm-desktop-table-box">
                                <table className="adm-table">
                                    <thead>
                                        <tr>
                                            <th>Judul Artikel</th>
                                            <th>Penulis</th>
                                            <th>Tanggal</th>
                                            <th>Status</th>
                                            <th style={{ textAlign: 'right' }}>Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {articles.map((item) => (
                                            <tr key={item.id} className={item.status === 'pending' ? 'is-pending' : ''}>
                                                <td className="adm-td-title">
                                                    <span className="adm-table-title">{item.title}</span>
                                                </td>
                                                <td className="adm-td-author">
                                                    {item.profiles?.full_name || 'Redaksi'}
                                                </td>
                                                <td className="adm-td-date">
                                                    {new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </td>
                                                <td>
                                                    {getStatusBadge(item.status)}
                                                </td>
                                                <td className="adm-td-actions">
                                                    <button
                                                        onClick={() => handleOpenReview(item)}
                                                        className="adm-action-icon edit"
                                                        title="Sunting Artikel"
                                                    >
                                                        <Edit3 size={15} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeletePermanent(item.id)}
                                                        className="adm-action-icon delete"
                                                        title="Hapus Artikel"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Accordion Cards View */}
                            <div className="adm-mobile-accordion-list">
                                {articles.map((item) => (
                                    <details key={item.id} className="adm-accordion-card">
                                        <summary className="adm-accordion-summary">
                                            <div className="adm-accordion-main">
                                                <div className="adm-accordion-header-row">
                                                    {getStatusBadge(item.status)}
                                                    <span className="adm-accordion-date">
                                                        {new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                                    </span>
                                                </div>
                                                <h4 className="adm-accordion-title">{item.title}</h4>
                                            </div>
                                            <div className="adm-accordion-icon">
                                                <ChevronDown size={18} />
                                            </div>
                                        </summary>

                                        <div className="adm-accordion-expanded">
                                            <div className="adm-expanded-meta-row">
                                                <span className="adm-meta-label">Penulis:</span>
                                                <span className="adm-meta-val">{item.profiles?.full_name || 'Redaksi'}</span>
                                            </div>

                                            <div className="adm-accordion-btn-group">
                                                <button
                                                    onClick={() => handleOpenReview(item)}
                                                    className="adm-acc-btn edit"
                                                >
                                                    <Edit3 size={15} />
                                                    <span>Review / Edit</span>
                                                </button>
                                                <button
                                                    onClick={() => handleDeletePermanent(item.id)}
                                                    className="adm-acc-btn delete"
                                                >
                                                    <Trash2 size={15} />
                                                    <span>Hapus</span>
                                                </button>
                                            </div>
                                        </div>
                                    </details>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* TAB 3: MANAJEMEN TERBITAN */}
                    {activeTab === 'magazine' && (
                        <div className="adm-pane">
                            <MagazineManager userId={userId} />
                        </div>
                    )}

                    {/* TAB 4: PROMO INSTAGRAM */}
                    {activeTab === 'promo' && (
                        <div className="adm-pane">
                            {/* Input Form Box */}
                            <div className="adm-promo-input-box">
                                <div className="adm-box-header">
                                    <PlusCircle size={18} />
                                    <h3>Tambah Postingan Instagram Baru</h3>
                                </div>

                                <div className="adm-promo-form-grid">
                                    {/* Upload Dropzone */}
                                    <div className="adm-promo-upload-side">
                                        <label className={`adm-promo-drop ${newPromo.image_url ? 'has-img' : ''}`}>
                                            {newPromo.image_url ? (
                                                <div className="adm-promo-preview-wrap">
                                                    <img src={newPromo.image_url} alt="Preview Promo" />
                                                    <div className="adm-promo-hover-overlay">
                                                        <Upload size={20} />
                                                        <span>Ganti Foto</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="adm-promo-drop-empty">
                                                    <Upload size={24} />
                                                    <span>Pilih Foto (4:5)</span>
                                                    <span className="sub">Maksimal resolusi tajam</span>
                                                </div>
                                            )}
                                            <input type="file" accept="image/*" onChange={handleNewPromoImage} className="adm-hidden-input" />
                                        </label>
                                    </div>

                                    {/* Fields */}
                                    <div className="adm-promo-fields-side">
                                        <div className="adm-input-unit">
                                            <label>Kutipan / Caption</label>
                                            <textarea
                                                value={newPromo.caption}
                                                onChange={(e) => handleNewPromoChange('caption', e.target.value)}
                                                rows="3"
                                                placeholder="Tuliskan rangkuman atau kutipan menarik dari postingan ini..."
                                            />
                                        </div>

                                        <div className="adm-input-unit">
                                            <label>Link Postingan Instagram</label>
                                            <div className="adm-input-icon-wrap">
                                                <Instagram size={16} className="adm-input-left-icon" />
                                                <input
                                                    type="text"
                                                    value={newPromo.link_url}
                                                    onChange={(e) => handleNewPromoChange('link_url', e.target.value)}
                                                    placeholder="https://instagram.com/p/..."
                                                    className="has-icon"
                                                />
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={submitNewPromo}
                                            disabled={isUploadingPromo}
                                            className="adm-promo-submit-btn"
                                        >
                                            {isUploadingPromo ? (
                                                <span className="adm-flex-btn">
                                                    <RefreshCw size={16} className="adm-spin" />
                                                    <span>Menayangkan...</span>
                                                </span>
                                            ) : (
                                                <span className="adm-flex-btn">
                                                    <Upload size={16} />
                                                    <span>Tayangkan di Beranda</span>
                                                </span>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Active Promos List */}
                            <div className="adm-promo-list-header">
                                <h3>Etalase Aktif Saat Ini ({promos.length}/4)</h3>
                                <p>Postingan di bawah ini adalah yang sedang tayang di bagian etalase beranda.</p>
                            </div>

                            <div className="adm-promo-grid">
                                {promos.map((item, idx) => (
                                    <div key={item.id} className="adm-promo-card">
                                        <div className="adm-promo-card-top">
                                            <span className="adm-slot-badge">Slot #{idx + 1}</span>
                                            <button onClick={() => deletePromo(item.id)} className="adm-del-btn" title="Hapus Promo">
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                        <div className="adm-promo-img-box">
                                            <img src={item.image_url} alt="Promo" />
                                        </div>
                                        <div className="adm-promo-info">
                                            <p className="adm-promo-caption">{item.caption || 'Tanpa deskripsi'}</p>
                                            {item.link_url && (
                                                <a href={item.link_url} target="_blank" rel="noreferrer" className="adm-promo-link">
                                                    <span>Buka di Instagram</span>
                                                    <ExternalLink size={12} />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* REVIEW / EDITOR DRAWER MODAL */}
            {mounted && createPortal(
                <div className={`adm-drawer-overlay ${isPanelOpen ? 'open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) handleCloseReview(); }}>
                    <div className="adm-drawer-panel">
                        {selectedArticle && (
                            <div className="adm-drawer-content-flow">
                                {/* Drawer Top Bar */}
                                <div className="adm-drawer-header">
                                    <div className="adm-drawer-header-left">
                                        <div className="adm-drawer-badge">Editor Mode</div>
                                        <h3>Review & Sunting Konten</h3>
                                    </div>
                                    <button onClick={handleCloseReview} className="adm-drawer-close-btn" aria-label="Tutup">
                                        <XCircle size={22} />
                                    </button>
                                </div>

                                {/* Drawer Body */}
                                <div className="adm-drawer-body">
                                    <div className="adm-drawer-meta-card">
                                        <img src={selectedArticle.cover_url || 'https://placehold.co/100'} alt="Thumb" className="adm-drawer-thumb" />
                                        <div>
                                            <p className="adm-drawer-author">Penulis: <strong>{selectedArticle.profiles?.full_name || 'Redaksi'}</strong></p>
                                            <div className="adm-drawer-status-wrap">
                                                <span>Status saat ini:</span>
                                                {getStatusBadge(selectedArticle.status)}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="adm-drawer-input-unit">
                                        <label>Judul Headline Artikel</label>
                                        <input
                                            type="text"
                                            value={editorTitle}
                                            onChange={(e) => setEditorTitle(e.target.value)}
                                            className="adm-drawer-input"
                                        />
                                    </div>

                                    <div className="adm-drawer-input-unit">
                                        <label>Kategori Berita (Pilih minimal 1)</label>
                                        <div className="adm-category-chips">
                                            {availableCategories.map(cat => (
                                                <button
                                                    key={cat.id}
                                                    type="button"
                                                    onClick={() => toggleCategory(cat.id)}
                                                    className={`adm-chip ${selectedCategories.includes(cat.id) ? 'active' : ''}`}
                                                >
                                                    {cat.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="adm-drawer-input-unit">
                                        <label>Tim Produksi Berita</label>
                                        <div className="adm-crew-grid">
                                            <ProfileComboSelect
                                                value={editorId}
                                                onChange={setEditorId}
                                                mode="id"
                                                label="Editor"
                                                placeholder="Pilih editor..."
                                            />
                                            <ProfileComboSelect
                                                value={layouterId}
                                                onChange={setLayouterId}
                                                mode="id"
                                                label="Layouter"
                                                placeholder="Pilih layouter..."
                                            />
                                        </div>
                                    </div>

                                    <div className="adm-drawer-input-unit">
                                        <label>Isi Konten Artikel (Markdown Editor)</label>
                                        <div className="adm-editor-container">
                                            <MDEditor
                                                value={editorContent}
                                                onChange={setEditorContent}
                                                height={380}
                                                preview="edit"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Drawer Sticky Action Footer */}
                                <div className="adm-drawer-footer">
                                    <button
                                        onClick={() => handleUpdateStatus('draft')}
                                        className="adm-decision-btn revise"
                                    >
                                        <ArrowLeftCircle size={16} />
                                        <span>Kembalikan Revisi</span>
                                    </button>

                                    <button
                                        onClick={() => handleUpdateStatus('rejected')}
                                        className="adm-decision-btn reject"
                                    >
                                        <XCircle size={16} />
                                        <span>Tolak Artikel</span>
                                    </button>

                                    <button
                                        onClick={() => handleUpdateStatus('published')}
                                        className="adm-decision-btn publish"
                                    >
                                        <CheckCircle size={16} />
                                        <span>Terbitkan Sekarang</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}

            <style>{`
                /* ===== ROOT ADMIN LAYOUT ===== */
                .adm-container {
                    font-family: 'Poppins', sans-serif;
                    color: var(--text);
                    display: flex;
                    gap: 36px;
                    min-height: calc(100vh - 120px);
                    padding: 10px 0 50px 0;
                }

                /* SIDEBAR */
                .adm-sidebar {
                    width: 260px;
                    flex-shrink: 0;
                    position: sticky;
                    top: 90px;
                    height: fit-content;
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                }

                .adm-brand {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 8px 12px;
                }
                .adm-brand-icon {
                    width: 38px;
                    height: 38px;
                    border-radius: 12px;
                    background: rgba(59, 130, 246, 0.12);
                    color: #3b82f6;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                .adm-brand h2 {
                    margin: 0;
                    font-size: 1.15rem;
                    font-weight: 700;
                    letter-spacing: -0.3px;
                }
                .adm-brand span {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    font-weight: 500;
                }

                .adm-nav-list {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .adm-nav-btn {
                    width: 100%;
                    padding: 12px 16px;
                    border-radius: 12px;
                    border: none;
                    background: transparent;
                    color: var(--text-muted);
                    font-family: inherit;
                    font-size: 0.9rem;
                    font-weight: 500;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    text-align: left;
                }
                .adm-nav-btn:hover {
                    background: var(--bg-light);
                    color: var(--text);
                }
                .adm-nav-btn.active {
                    background: var(--text);
                    color: var(--bg);
                    font-weight: 600;
                }
                .adm-counter-badge {
                    margin-left: auto;
                    background: #ef4444;
                    color: white;
                    font-size: 0.7rem;
                    font-weight: 700;
                    padding: 2px 8px;
                    border-radius: 20px;
                }
                .adm-sub-badge {
                    margin-left: auto;
                    font-size: 0.75rem;
                    opacity: 0.7;
                    font-weight: 600;
                }

                /* MAIN AREA */
                .adm-main-content {
                    flex: 1;
                    min-width: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 28px;
                }

                /* Mobile Header */
                .adm-mobile-header {
                    display: none;
                    flex-direction: column;
                    gap: 12px;
                    padding-bottom: 8px;
                }
                .adm-mobile-title {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 1rem;
                    font-weight: 700;
                }
                .adm-text-primary {
                    color: #3b82f6;
                }
                .adm-select-wrapper {
                    position: relative;
                    width: 100%;
                }
                .adm-mobile-select {
                    width: 100%;
                    padding: 14px 16px;
                    border-radius: 14px;
                    border: 1px solid var(--border);
                    background: var(--bg-light);
                    color: var(--text);
                    font-size: 0.95rem;
                    font-family: inherit;
                    font-weight: 600;
                    appearance: none;
                    cursor: pointer;
                    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.03);
                }
                .adm-select-arrow {
                    position: absolute;
                    right: 16px;
                    top: 50%;
                    transform: translateY(-50%);
                    pointer-events: none;
                    color: var(--text-muted);
                }

                /* Section Header */
                .adm-section-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    gap: 20px;
                    padding-bottom: 20px;
                    border-bottom: 1px solid var(--border-muted);
                }
                .adm-section-header h1 {
                    margin: 0;
                    font-size: 1.8rem;
                    font-weight: 700;
                    letter-spacing: -0.5px;
                }
                .adm-section-header p {
                    margin: 6px 0 0 0;
                    font-size: 0.9rem;
                    color: var(--text-muted);
                }
                .adm-refresh-btn {
                    background: var(--bg-light);
                    border: 1px solid var(--border);
                    color: var(--text);
                    padding: 10px 16px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-family: inherit;
                    font-size: 0.85rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    flex-shrink: 0;
                }
                .adm-refresh-btn:hover {
                    background: var(--bg);
                    border-color: var(--text-muted);
                    transform: translateY(-1px);
                }

                /* PANES */
                .adm-tab-body {
                    flex: 1;
                }

                /* EMPTY STATE */
                .adm-empty-box {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 60px 20px;
                    text-align: center;
                    border: 1px dashed var(--border);
                    border-radius: 20px;
                    background: var(--bg-light);
                }
                .adm-empty-icon {
                    width: 64px;
                    height: 64px;
                    border-radius: 50%;
                    background: rgba(16, 185, 129, 0.1);
                    color: #10b981;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 16px;
                }
                .adm-empty-box h3 {
                    margin: 0 0 6px 0;
                    font-size: 1.2rem;
                    font-weight: 700;
                }
                .adm-empty-box p {
                    margin: 0;
                    color: var(--text-muted);
                    font-size: 0.9rem;
                }

                /* REVIEW CARDS */
                .adm-review-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: 20px;
                }
                .adm-review-card {
                    background: var(--bg);
                    border: 1px solid var(--border);
                    border-radius: 18px;
                    overflow: hidden;
                    cursor: pointer;
                    transition: all 0.25s ease;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02);
                }
                .adm-review-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.06);
                    border-color: #3b82f6;
                }
                .adm-review-thumb {
                    position: relative;
                    aspect-ratio: 16/9;
                    overflow: hidden;
                    background: var(--bg-light);
                }
                .adm-review-thumb img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transition: transform 0.4s ease;
                }
                .adm-review-card:hover .adm-review-thumb img {
                    transform: scale(1.04);
                }
                .adm-review-badge {
                    position: absolute;
                    top: 12px;
                    right: 12px;
                    background: rgba(239, 68, 68, 0.9);
                    color: white;
                    font-size: 0.7rem;
                    font-weight: 700;
                    padding: 4px 10px;
                    border-radius: 20px;
                    backdrop-filter: blur(4px);
                }
                .adm-review-details {
                    padding: 18px;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    flex: 1;
                }
                .adm-review-meta {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    font-weight: 500;
                }
                .adm-review-details h4 {
                    margin: 0;
                    font-size: 1.05rem;
                    font-weight: 700;
                    line-height: 1.4;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                .adm-review-action {
                    margin-top: auto;
                    padding-top: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    font-size: 0.8rem;
                    font-weight: 600;
                    color: #3b82f6;
                }

                /* TABLE (DESKTOP) */
                .adm-desktop-table-box {
                    background: var(--bg);
                    border: 1px solid var(--border);
                    border-radius: 18px;
                    overflow: hidden;
                }
                .adm-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 0.9rem;
                    text-align: left;
                }
                .adm-table th {
                    padding: 16px 20px;
                    font-size: 0.78rem;
                    font-weight: 600;
                    color: var(--text-muted);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    background: var(--bg-light);
                    border-bottom: 1px solid var(--border-muted);
                }
                .adm-table td {
                    padding: 16px 20px;
                    border-bottom: 1px solid var(--border-muted);
                    vertical-align: middle;
                }
                .adm-table tr:last-child td {
                    border-bottom: none;
                }
                .adm-table tr:hover td {
                    background: rgba(0, 0, 0, 0.015);
                }
                .adm-td-title {
                    max-width: 320px;
                }
                .adm-table-title {
                    font-weight: 600;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                    line-height: 1.4;
                }
                .adm-td-author {
                    color: var(--text-muted);
                    font-weight: 500;
                }
                .adm-td-date {
                    color: var(--text-muted);
                    font-size: 0.82rem;
                }
                .adm-td-actions {
                    display: flex;
                    align-items: center;
                    justify-content: flex-end;
                    gap: 8px;
                }
                .adm-action-icon {
                    width: 34px;
                    height: 34px;
                    border-radius: 10px;
                    border: 1px solid var(--border);
                    background: var(--bg-light);
                    color: var(--text-muted);
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .adm-action-icon.edit:hover {
                    background: var(--text);
                    color: var(--bg);
                }
                .adm-action-icon.delete:hover {
                    background: #ef4444;
                    color: white;
                    border-color: #ef4444;
                }

                /* STATUS PILLS */
                .status-badge-pill {
                    display: inline-flex;
                    align-items: center;
                    padding: 4px 10px;
                    border-radius: 20px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    letter-spacing: 0.2px;
                }
                .status-badge-pill.live {
                    background: rgba(16, 185, 129, 0.12);
                    color: #10b981;
                }
                .status-badge-pill.pending {
                    background: rgba(245, 158, 11, 0.12);
                    color: #f59e0b;
                }
                .status-badge-pill.draft {
                    background: rgba(148, 163, 184, 0.15);
                    color: #64748b;
                }
                .status-badge-pill.rejected {
                    background: rgba(239, 68, 68, 0.12);
                    color: #ef4444;
                }

                /* ACCORDION (MOBILE ONLY) */
                .adm-mobile-accordion-list {
                    display: none;
                    flex-direction: column;
                    gap: 12px;
                }
                .adm-accordion-card {
                    background: var(--bg);
                    border: 1px solid var(--border);
                    border-radius: 16px;
                    overflow: hidden;
                    transition: all 0.2s ease;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
                }
                .adm-accordion-summary {
                    padding: 16px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    list-style: none;
                }
                .adm-accordion-summary::-webkit-details-marker {
                    display: none;
                }
                .adm-accordion-main {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    flex: 1;
                }
                .adm-accordion-header-row {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .adm-accordion-date {
                    font-size: 0.72rem;
                    color: var(--text-muted);
                }
                .adm-accordion-title {
                    margin: 0;
                    font-size: 0.95rem;
                    font-weight: 700;
                    line-height: 1.35;
                    color: var(--text);
                }
                .adm-accordion-icon {
                    color: var(--text-muted);
                    transition: transform 0.2s ease;
                }
                .adm-accordion-card[open] .adm-accordion-icon {
                    transform: rotate(180deg);
                }
                .adm-accordion-expanded {
                    padding: 0 16px 16px 16px;
                    border-top: 1px dashed var(--border-muted);
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    padding-top: 14px;
                }
                .adm-expanded-meta-row {
                    display: flex;
                    justify-content: space-between;
                    font-size: 0.8rem;
                }
                .adm-meta-label {
                    color: var(--text-muted);
                }
                .adm-meta-val {
                    font-weight: 600;
                }
                .adm-accordion-btn-group {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 8px;
                    margin-top: 4px;
                }
                .adm-acc-btn {
                    padding: 11px;
                    border-radius: 10px;
                    font-family: inherit;
                    font-size: 0.85rem;
                    font-weight: 600;
                    border: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    cursor: pointer;
                }
                .adm-acc-btn.edit {
                    background: var(--bg-light);
                    color: var(--text);
                    border: 1px solid var(--border);
                }
                .adm-acc-btn.delete {
                    background: rgba(239, 68, 68, 0.1);
                    color: #ef4444;
                }

                /* PROMO SECTION */
                .adm-promo-input-box {
                    background: var(--bg);
                    border: 1px solid var(--border);
                    border-radius: 20px;
                    padding: 24px;
                    margin-bottom: 36px;
                    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02);
                }
                .adm-box-header {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 20px;
                    color: var(--text);
                }
                .adm-box-header h3 {
                    margin: 0;
                    font-size: 1.05rem;
                    font-weight: 700;
                }
                .adm-promo-form-grid {
                    display: grid;
                    grid-template-columns: 160px 1fr;
                    gap: 24px;
                }
                .adm-promo-drop {
                    width: 100%;
                    aspect-ratio: 4/5;
                    border: 2px dashed var(--border);
                    border-radius: 14px;
                    background: var(--bg-light);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    overflow: hidden;
                    position: relative;
                    transition: all 0.2s;
                }
                .adm-promo-drop:hover {
                    border-color: #3b82f6;
                    background: rgba(59, 130, 246, 0.04);
                }
                .adm-promo-drop.has-img {
                    border-style: solid;
                }
                .adm-promo-drop-empty {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 6px;
                    padding: 12px;
                    text-align: center;
                    color: var(--text-muted);
                    font-size: 0.8rem;
                    font-weight: 600;
                }
                .adm-promo-drop-empty .sub {
                    font-size: 0.68rem;
                    font-weight: 400;
                    opacity: 0.8;
                }
                .adm-promo-preview-wrap {
                    width: 100%;
                    height: 100%;
                    position: relative;
                }
                .adm-promo-preview-wrap img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .adm-promo-hover-overlay {
                    position: absolute;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.6);
                    color: white;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 4px;
                    opacity: 0;
                    transition: opacity 0.2s;
                    font-size: 0.75rem;
                    font-weight: 600;
                    backdrop-filter: blur(2px);
                }
                .adm-promo-drop:hover .adm-promo-hover-overlay {
                    opacity: 1;
                }
                .adm-hidden-input {
                    display: none;
                }

                .adm-promo-fields-side {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }
                .adm-input-unit {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .adm-input-unit label {
                    font-size: 0.8rem;
                    font-weight: 600;
                    color: var(--text-muted);
                }
                .adm-input-unit textarea,
                .adm-input-unit input {
                    width: 100%;
                    padding: 12px 14px;
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    background: var(--bg-light);
                    color: var(--text);
                    font-family: inherit;
                    font-size: 0.9rem;
                    transition: all 0.2s;
                }
                .adm-input-unit textarea:focus,
                .adm-input-unit input:focus {
                    outline: none;
                    border-color: #3b82f6;
                    background: var(--bg);
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                }
                .adm-input-icon-wrap {
                    position: relative;
                }
                .adm-input-left-icon {
                    position: absolute;
                    left: 14px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: var(--text-muted);
                    pointer-events: none;
                }
                .adm-input-unit input.has-icon {
                    padding-left: 42px;
                }
                .adm-promo-submit-btn {
                    padding: 13px 20px;
                    border-radius: 12px;
                    border: none;
                    background: var(--text);
                    color: var(--bg);
                    font-family: inherit;
                    font-size: 0.9rem;
                    font-weight: 600;
                    cursor: pointer;
                    margin-top: 4px;
                    transition: all 0.2s;
                }
                .adm-promo-submit-btn:hover:not(:disabled) {
                    opacity: 0.9;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
                }
                .adm-flex-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                }
                .adm-spin {
                    animation: adm-spin-anim 1s linear infinite;
                }
                @keyframes adm-spin-anim {
                    100% { transform: rotate(360deg); }
                }

                .adm-promo-list-header {
                    margin-bottom: 20px;
                }
                .adm-promo-list-header h3 {
                    margin: 0;
                    font-size: 1.15rem;
                    font-weight: 700;
                }
                .adm-promo-list-header p {
                    margin: 4px 0 0 0;
                    font-size: 0.85rem;
                    color: var(--text-muted);
                }
                .adm-promo-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                    gap: 20px;
                }
                .adm-promo-card {
                    background: var(--bg);
                    border: 1px solid var(--border);
                    border-radius: 16px;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
                }
                .adm-promo-card-top {
                    padding: 10px 14px;
                    background: var(--bg-light);
                    border-bottom: 1px solid var(--border-muted);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }
                .adm-slot-badge {
                    font-size: 0.72rem;
                    font-weight: 700;
                    color: var(--text);
                }
                .adm-del-btn {
                    width: 28px;
                    height: 28px;
                    border-radius: 8px;
                    border: none;
                    background: rgba(239, 68, 68, 0.1);
                    color: #ef4444;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .adm-del-btn:hover {
                    background: #ef4444;
                    color: white;
                }
                .adm-promo-img-box {
                    width: 100%;
                    aspect-ratio: 4/5;
                    overflow: hidden;
                }
                .adm-promo-img-box img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .adm-promo-info {
                    padding: 14px;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    flex: 1;
                }
                .adm-promo-caption {
                    margin: 0;
                    font-size: 0.85rem;
                    color: var(--text);
                    display: -webkit-box;
                    -webkit-line-clamp: 3;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                    line-height: 1.4;
                }
                .adm-promo-link {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 0.78rem;
                    font-weight: 600;
                    color: #3b82f6;
                    text-decoration: none;
                    margin-top: auto;
                }
                .adm-promo-link:hover {
                    text-decoration: underline;
                }

                /* DRAWER MODAL */
                .adm-drawer-overlay {
                    position: fixed;
                    inset: 0;
                    z-index: 99999;
                    background: rgba(15, 23, 42, 0.6);
                    backdrop-filter: blur(6px);
                    -webkit-backdrop-filter: blur(6px);
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.3s ease;
                    display: flex;
                    justify-content: flex-end;
                    font-family: 'Poppins', sans-serif;
                }
                .adm-drawer-overlay.open {
                    opacity: 1;
                    pointer-events: auto;
                }
                .adm-drawer-panel {
                    width: 640px;
                    max-width: 100vw;
                    height: 100vh;
                    background: var(--bg);
                    border-left: 1px solid var(--border);
                    box-shadow: -15px 0 40px rgba(0, 0, 0, 0.2);
                    transform: translateX(100%);
                    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    display: flex;
                    flex-direction: column;
                }
                .adm-drawer-overlay.open .adm-drawer-panel {
                    transform: translateX(0);
                }
                .adm-drawer-content-flow {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    overflow: hidden;
                }
                .adm-drawer-header {
                    padding: 20px 24px;
                    border-bottom: 1px solid var(--border-muted);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    flex-shrink: 0;
                }
                .adm-drawer-header-left {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                .adm-drawer-badge {
                    display: inline-block;
                    font-size: 0.7rem;
                    font-weight: 700;
                    color: #3b82f6;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .adm-drawer-header h3 {
                    margin: 0;
                    font-size: 1.15rem;
                    font-weight: 700;
                }
                .adm-drawer-close-btn {
                    background: transparent;
                    border: none;
                    color: var(--text-muted);
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 8px;
                    transition: all 0.2s;
                }
                .adm-drawer-close-btn:hover {
                    color: var(--text);
                }
                .adm-drawer-body {
                    padding: 24px;
                    overflow-y: auto;
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }
                .adm-drawer-meta-card {
                    padding: 14px 18px;
                    background: var(--bg-light);
                    border: 1px solid var(--border-muted);
                    border-radius: 14px;
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }
                .adm-drawer-thumb {
                    width: 52px;
                    height: 52px;
                    border-radius: 10px;
                    object-fit: cover;
                }
                .adm-drawer-author {
                    margin: 0 0 6px 0;
                    font-size: 0.85rem;
                }
                .adm-drawer-status-wrap {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 0.78rem;
                    color: var(--text-muted);
                }
                .adm-drawer-input-unit {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .adm-drawer-input-unit label {
                    font-size: 0.8rem;
                    font-weight: 600;
                    color: var(--text-muted);
                }
                .adm-drawer-input {
                    width: 100%;
                    padding: 12px 14px;
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    background: var(--bg-light);
                    color: var(--text);
                    font-family: inherit;
                    font-size: 0.95rem;
                    font-weight: 600;
                }
                .adm-category-chips {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                }
                .adm-chip {
                    padding: 8px 14px;
                    border-radius: 20px;
                    border: 1px solid var(--border);
                    background: var(--bg-light);
                    color: var(--text-muted);
                    font-family: inherit;
                    font-size: 0.8rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .adm-chip.active {
                    background: var(--text);
                    color: var(--bg);
                    border-color: var(--text);
                }
                .adm-editor-container {
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    overflow: hidden;
                }
                .adm-crew-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 14px;
                }
                .adm-drawer-footer {
                    padding: 16px 24px;
                    border-top: 1px solid var(--border-muted);
                    background: var(--bg);
                    display: flex;
                    align-items: center;
                    justify-content: flex-end;
                    gap: 10px;
                    flex-shrink: 0;
                }
                .adm-decision-btn {
                    padding: 11px 18px;
                    border-radius: 12px;
                    border: none;
                    font-family: inherit;
                    font-size: 0.85rem;
                    font-weight: 600;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .adm-decision-btn.revise {
                    background: var(--bg-light);
                    color: var(--text);
                    border: 1px solid var(--border);
                }
                .adm-decision-btn.reject {
                    background: rgba(239, 68, 68, 0.1);
                    color: #ef4444;
                }
                .adm-decision-btn.publish {
                    background: #10b981;
                    color: white;
                }
                .adm-decision-btn.publish:hover {
                    background: #059669;
                    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
                }

                /* RESPONSIVE BREAKPOINT */
                @media (max-width: 900px) {
                    .adm-container {
                        flex-direction: column;
                        gap: 20px;
                    }
                    .adm-sidebar {
                        display: none;
                    }
                    .adm-mobile-header {
                        display: flex;
                    }
                    .adm-desktop-table-box {
                        display: none;
                    }
                    .adm-mobile-accordion-list {
                        display: flex;
                    }
                    .adm-promo-form-grid {
                        grid-template-columns: 1fr;
                    }
                    .adm-promo-drop {
                        max-width: 180px;
                        margin: 0 auto;
                    }
                    .adm-drawer-panel {
                        width: 100vw;
                    }
                }
            `}</style>
        </div>
    );
}