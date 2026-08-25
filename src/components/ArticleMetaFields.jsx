import React, { useState, useEffect, useRef } from 'react';
import ProfileComboSelect from './ProfileComboSelect';
import { ChevronDown, Search, Folder, Check } from 'lucide-react';

// Komponen Dropdown Kategori dengan gaya yang sama persis (selaras) dengan ProfileComboSelect
function CategoryComboSelect({ categories = [], value = '', onChange }) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);
    const searchInputRef = useRef(null);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const handler = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const filtered = categories.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
    const selectedCategory = categories.find(c => c.id === value);

    return (
        <div className="pcs-wrapper" ref={containerRef}>
            <label className="pcs-label">Kategori Berita</label>
            <div 
                className={`pcs-main-box ${isOpen ? 'focused' : ''}`} 
                onClick={() => {
                    setIsOpen(!isOpen);
                    if (!isOpen) setTimeout(() => searchInputRef.current?.focus(), 50);
                }}
            >
                <div className="pcs-display-area">
                    {selectedCategory ? (
                        <span className="pcs-selected-item" style={{ borderRadius: '4px' }}>
                            {selectedCategory.name}
                        </span>
                    ) : (
                        <span className="pcs-placeholder">Pilih Kategori...</span>
                    )}
                </div>
                <div className="pcs-indicator">
                    <ChevronDown size={16} className={`pcs-chevron ${isOpen ? 'rotated' : ''}`} />
                </div>
            </div>

            {isOpen && (
                <div className="pcs-dropdown-menu">
                    <div className="pcs-search-container">
                        <Search size={14} className="pcs-search-icon" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            className="pcs-search-input"
                            placeholder="Cari kategori..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                    <div className="pcs-list">
                        {filtered.length === 0 ? (
                            <div className="pcs-empty">Kategori tidak ditemukan</div>
                        ) : (
                            filtered.map(c => {
                                const isSelected = c.id === value;
                                return (
                                    <div 
                                        key={c.id} 
                                        className={`pcs-item ${isSelected ? 'selected' : ''}`}
                                        onClick={() => { onChange(c.id); setIsOpen(false); setSearch(''); }}
                                    >
                                        <div className="pcs-avatar-placeholder" style={{ borderRadius: '6px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'none' }}>
                                            <Folder size={14} />
                                        </div>
                                        <div className="pcs-item-info">
                                            <span className="pcs-name">{c.name}</span>
                                        </div>
                                        {isSelected && <Check size={16} className="pcs-check-icon" />}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ArticleMetaFields({ 
    isAdmin = false, 
    categories, 
    initialCategory = '', 
    initialAuthor = '',
    initialEditor = '',
    initialLayouter = '',
    currentUserId = '',
    currentUserName = ''
}) {
    // States for the fields
    const [category, setCategory] = useState(initialCategory);
    const [author, setAuthor] = useState(initialAuthor || currentUserId);
    const [editor, setEditor] = useState(initialEditor || '');
    const [layouter, setLayouter] = useState(initialLayouter || '');

    return (
        <div className="amf-container">
            {/* HIDDEN INPUTS UNTUK DIBACA OLEH VANILLA JS DI tulis.astro */}
            <input type="hidden" id="input-category" value={category} />
            <input type="hidden" id="input-author" value={author} />
            <input type="hidden" id="input-editor" value={editor} />
            <input type="hidden" id="input-layouter" value={layouter} />

            <div className="amf-grid">
                {/* 1. Kategori (Selalu Muncul) */}
                <div className="amf-field">
                    <CategoryComboSelect 
                        categories={categories} 
                        value={category} 
                        onChange={setCategory} 
                    />
                </div>

                {/* KHUSUS ADMIN: Tampilkan dropdown untuk override identitas */}
                {isAdmin ? (
                    <>
                        <div className="amf-field">
                            <ProfileComboSelect 
                                label="Penulis (Author)"
                                placeholder="Pilih Penulis Asli..."
                                mode="id"
                                multiple={false}
                                value={author}
                                onChange={setAuthor}
                            />
                        </div>
                        <div className="amf-field">
                            <ProfileComboSelect 
                                label="Editor / Penyunting"
                                placeholder="Pilih Editor..."
                                mode="id"
                                multiple={false}
                                value={editor}
                                onChange={setEditor}
                            />
                        </div>
                        <div className="amf-field">
                            <ProfileComboSelect 
                                label="Layouter / Desain"
                                placeholder="Pilih Layouter..."
                                mode="id"
                                multiple={false}
                                value={layouter}
                                onChange={setLayouter}
                            />
                        </div>
                    </>
                ) : (
                    // UNTUK REDAKSI BIASA: Hanya tampilkan nama mereka sebagai teks statis yang indah
                    <div className="amf-field">
                        <div className="pcs-wrapper">
                            <label className="pcs-label">Penulis</label>
                            <div className="pcs-main-box" style={{ background: 'var(--bg)', cursor: 'default' }}>
                                <div className="pcs-display-area">
                                    <span className="pcs-selected-item">👤 {currentUserName}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                .amf-container {
                    width: 100%;
                    margin-bottom: 30px;
                }
                .amf-grid {
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: center;
                    gap: 15px;
                    width: 100%;
                }
                .amf-field {
                    min-width: 200px;
                    flex: 1;
                    max-width: 250px;
                }
                
                /* OVERRIDES AGAR DROPDOWN MENYERUPAI TAG JAM/WAKTU (PILL) */
                .amf-container .pcs-main-box {
                    border-radius: 50px;
                    padding: 6px 14px;
                    min-height: 38px;
                    background: var(--bg-light);
                    border: 1px solid var(--border-muted);
                }
                .amf-container .pcs-main-box:hover {
                    border-color: var(--text);
                }
                .amf-container .pcs-main-box.focused {
                    border-color: var(--text);
                    box-shadow: none;
                    background: var(--bg);
                }
                .amf-container .pcs-label {
                    display: none;
                }
                .amf-container .pcs-selected-item {
                    border: none;
                    background: transparent;
                    padding: 0;
                    font-weight: 600;
                    font-size: 0.85rem;
                }
                .amf-container .pcs-placeholder {
                    font-weight: 600;
                    font-size: 0.85rem;
                }

                @media (max-width: 768px) {
                    .amf-grid {
                        flex-direction: column;
                        align-items: stretch;
                        gap: 15px;
                    }
                    .amf-field {
                        max-width: none;
                    }
                }
            `}</style>
        </div>
    );
}
