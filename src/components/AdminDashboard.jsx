import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import imageCompression from 'browser-image-compression';
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
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
                // Kompres & konversi ke WebP sebelum upload
                let fileToUpload = newPromo.file;
                try {
                    fileToUpload = await imageCompression(newPromo.file, {
                        maxSizeMB: 0.3,
                        maxWidthOrHeight: 1080,
                        useWebWorker: true,
                        fileType: 'image/webp'
                    });
                } catch (compressErr) {
                    console.warn("Gagal mengompres gambar promo, upload file asli:", compressErr);
                }

                const fileName = `promo-${Date.now()}.webp`;

                const { error: uploadError } = await supabase.storage.from('news-images').upload(fileName, fileToUpload, {
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
                    <div className="adm-select-wrapper custom-dropdown" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                        <div className="adm-mobile-select" style={{ display: 'flex', alignItems: 'center' }}>
                            {activeTab === 'review' && `📖 Meja Redaksi ${pendingArticles.length > 0 ? `(${pendingArticles.length} Antrian)` : ''}`}
                            {activeTab === 'archive' && `📁 Arsip Berita (${articles.length} Artikel)`}
                            {activeTab === 'magazine' && `📖 Manajemen Terbitan (Majalah)`}
                            {activeTab === 'promo' && `📸 Etalase Instagram (${promos.length}/4)`}
                        </div>
                        <ChevronDown size={18} className="adm-select-arrow" style={{ transform: isMobileMenuOpen ? 'translateY(-50%) rotate(180deg)' : 'translateY(-50%)', transition: 'transform 0.2s' }} />
                        
                        {isMobileMenuOpen && (
                            <div className="adm-dropdown-menu">
                                <div className={`adm-dropdown-item ${activeTab === 'review' ? 'active' : ''}`} onClick={() => setActiveTab('review')}>
                                    📖 Meja Redaksi {pendingArticles.length > 0 ? `(${pendingArticles.length} Antrian)` : ''}
                                </div>
                                <div className={`adm-dropdown-item ${activeTab === 'archive' ? 'active' : ''}`} onClick={() => setActiveTab('archive')}>
                                    📁 Arsip Berita ({articles.length} Artikel)
                                </div>
                                <div className={`adm-dropdown-item ${activeTab === 'magazine' ? 'active' : ''}`} onClick={() => setActiveTab('magazine')}>
                                    📖 Manajemen Terbitan (Majalah)
                                </div>
                                <div className={`adm-dropdown-item ${activeTab === 'promo' ? 'active' : ''}`} onClick={() => setActiveTab('promo')}>
                                    📸 Etalase Instagram ({promos.length}/4)
                                </div>
                            </div>
                        )}
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

            
        </div>
    );
}

