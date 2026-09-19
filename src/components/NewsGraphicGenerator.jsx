import React, { useState, useRef, useEffect } from 'react';
import * as htmlToImage from 'html-to-image';
import { Download, Upload, Image as ImageIcon, Type, LayoutTemplate, Bold, Italic, AlignLeft, AlignCenter, AlignRight, AlignJustify, Heading1, Heading2, MoveVertical, Blend, Plus, Trash2 } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextAlign } from '@tiptap/extension-text-align';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import '../styles/components/news-graphic-generator.css';

const MenuBar = ({ editor }) => {
    if (!editor) return null;

    return (
        <div className="ngg-editor-menubar">
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}
                title="Heading 1 (Sangat Besar)"
            >
                <Heading1 size={16} />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
                title="Heading 2 (Besar)"
            >
                <Heading2 size={16} />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().setParagraph().run()}
                className={editor.isActive('paragraph') ? 'is-active' : ''}
                title="Paragraf (Normal)"
            >
                P
            </button>
            <div className="divider"></div>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={editor.isActive('bold') ? 'is-active' : ''}
                title="Tebal"
            >
                <Bold size={16} />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={editor.isActive('italic') ? 'is-active' : ''}
                title="Miring"
            >
                <Italic size={16} />
            </button>
            <div className="divider"></div>
            <button
                type="button"
                onClick={() => editor.chain().focus().setTextAlign('left').run()}
                className={editor.isActive({ textAlign: 'left' }) ? 'is-active' : ''}
                title="Rata Kiri"
            >
                <AlignLeft size={16} />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().setTextAlign('center').run()}
                className={editor.isActive({ textAlign: 'center' }) ? 'is-active' : ''}
                title="Rata Tengah"
            >
                <AlignCenter size={16} />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().setTextAlign('right').run()}
                className={editor.isActive({ textAlign: 'right' }) ? 'is-active' : ''}
                title="Rata Kanan"
            >
                <AlignRight size={16} />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                className={editor.isActive({ textAlign: 'justify' }) ? 'is-active' : ''}
                title="Rata Kanan Kiri (Justify)"
            >
                <AlignJustify size={16} />
            </button>
            <div className="divider"></div>
            <input
                type="color"
                onInput={event => editor.chain().focus().setColor(event.target.value).run()}
                value={editor.getAttributes('textStyle').color || '#ffffff'}
                title="Warna Teks"
                className="color-picker"
            />
        </div>
    );
};

export default function NewsGraphicGenerator() {
    const defaultContentHtml = "<p>Ini adalah teks paragraf untuk isi berita. Anda bisa mengetik penjelasan panjang di sini.</p><p>Teks ini akan rata kiri dan berukuran konsisten di semua perangkat agar selalu mudah dibaca oleh audiens.</p>";

    const [pages, setPages] = useState([
        { 
            id: 'cover',
            title: 'Cover / Hook',
            image: null, 
            bgType: 'image',
            bgColor: '#1e293b',
            overlayStrength: 85,
            showLogo: true,
            logoPosition: 'top-left',
            bgZoom: 100,
            bgPosX: 50,
            bgPosY: 50,
            textPosition: 'bottom',
            html: "<h1 style=\"text-align: center\">JUDUL BERITA<br>ANDA DI SINI</h1>" 
        },
        { 
            id: 'content-1',
            title: 'Isi Berita 1',
            image: null, 
            bgType: 'image',
            bgColor: '#1e293b',
            overlayStrength: 85,
            showLogo: true,
            logoPosition: 'top-left',
            bgZoom: 100,
            bgPosX: 50,
            bgPosY: 50,
            textPosition: 'bottom',
            html: defaultContentHtml 
        },
        { 
            id: 'outro',
            title: 'Penutup (QR Code)',
            image: null, 
            bgType: 'color',
            bgColor: '#5a0000',
            overlayStrength: 0,
            showLogo: true,
            logoPosition: 'top-left',
            bgZoom: 100,
            bgPosX: 50,
            bgPosY: 50,
            qrImage: null,
            qrSize: 320,
            textPosition: 'top',
            html: "<p>Tuliskan kesimpulan berita Anda di sini. Jangan lupa arahkan pembaca untuk memindai QR Code di bawah untuk membaca artikel selengkapnya di website UKPM Civitas.</p>" 
        }
    ]);

    const [activePageId, setActivePageId] = useState('cover');
    const activePage = pages.find(p => p.id === activePageId) || pages[0];

    const updatePage = (key, value) => {
        setPages(prev => prev.map(p => p.id === activePageId ? { ...p, [key]: value } : p));
    };

    const addPage = () => {
        const newId = `content-${Date.now()}`;
        // Menghitung jumlah halaman konten (selain cover dan outro)
        const contentPagesCount = pages.filter(p => p.id !== 'cover' && p.id !== 'outro').length;
        
        const newPage = {
            id: newId,
            title: `Isi Berita ${contentPagesCount + 1}`,
            image: null,
            bgType: 'image',
            bgColor: '#1e293b',
            overlayStrength: 85,
            showLogo: true,
            logoPosition: 'top-left',
            bgZoom: 100,
            bgPosX: 50,
            bgPosY: 50,
            textPosition: 'bottom',
            html: defaultContentHtml
        };
        
        setPages(prev => {
            const outroIndex = prev.findIndex(p => p.id === 'outro');
            if (outroIndex !== -1) {
                // Sisipkan sebelum halaman outro
                const newPages = [...prev];
                newPages.splice(outroIndex, 0, newPage);
                return newPages;
            }
            return [...prev, newPage];
        });
        setActivePageId(newId);
    };

    const removePage = (id) => {
        if (id === 'cover' || id === 'outro' || pages.length <= 1) return; // minimal 1 halaman & tidak bisa hapus cover/outro
        const newPages = pages.filter(p => p.id !== id);
        setPages(newPages);
        if (activePageId === id) {
            setActivePageId(newPages[0].id);
        }
    };

    const [isExporting, setIsExporting] = useState(false);
    const [scale, setScale] = useState(1);
    const wrapperRef = useRef(null);
    const previewRef = useRef(null);

    // Inisialisasi Editor Tiptap
    const editor = useEditor({
        extensions: [
            StarterKit,
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            TextStyle,
            Color,
        ],
        content: activePage.html,
        onUpdate: ({ editor }) => {
            updatePage('html', editor.getHTML());
        },
    });

    // Update Tiptap content when activePageId changes
    useEffect(() => {
        if (editor && editor.getHTML() !== activePage.html) {
            editor.commands.setContent(activePage.html);
        }
    }, [activePageId, editor]);

    // Calculate scale so the 1080x1350 canvas fits inside its container
    useEffect(() => {
        const updateScale = () => {
            if (wrapperRef.current) {
                const wrapperWidth = wrapperRef.current.offsetWidth;
                let maxScaleByHeight = 1;
                
                // Pada layar desktop, batasi tinggi maksimal agar tidak scroll berlebihan
                if (window.innerWidth >= 768) {
                    const maxHeight = window.innerHeight * 0.55; // 55% dari tinggi layar
                    maxScaleByHeight = maxHeight / 1350;
                }
                
                const scaleByWidth = wrapperWidth / 1080;
                setScale(Math.min(scaleByWidth, maxScaleByHeight));
            }
        };
        updateScale();
        window.addEventListener('resize', updateScale);
        return () => window.removeEventListener('resize', updateScale);
    }, []);

    const currentImage = activePage.image;
    const currentHtml = activePage.html;

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                updatePage('image', event.target.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleQrUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                updatePage('qrImage', event.target.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleExport = async () => {
        if (!previewRef.current) return;
        setIsExporting(true);
        try {
            const dataUrl = await htmlToImage.toPng(previewRef.current, { 
                quality: 1.0, 
                pixelRatio: 1, 
                style: {
                    transform: 'scale(1)',
                    transformOrigin: 'top left',
                    margin: 0
                }
            });
            const link = document.createElement('a');
            link.download = `berita-grafis-${Date.now()}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error("Gagal mengekspor gambar:", err);
            alert("Terjadi kesalahan saat mengekspor gambar.");
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportAll = async () => {
        if (!previewRef.current) return;
        setIsExporting(true);
        
        const originalActiveId = activePageId;

        try {
            for (let i = 0; i < pages.length; i++) {
                const page = pages[i];
                setActivePageId(page.id);
                
                // Tunggu transisi DOM dan React render sepenuhnya
                await new Promise(resolve => setTimeout(resolve, 800));

                const dataUrl = await htmlToImage.toPng(previewRef.current, { 
                    quality: 1.0, 
                    pixelRatio: 1, 
                    style: {
                        transform: 'scale(1)',
                        transformOrigin: 'top left',
                        margin: 0
                    }
                });
                
                const link = document.createElement('a');
                link.download = `berita-grafis-${i + 1}-${page.id}.png`;
                link.href = dataUrl;
                link.click();
                
                // Jeda agar browser tidak mendeteksi sebagai spam download
                await new Promise(resolve => setTimeout(resolve, 400));
            }
        } catch (err) {
            console.error("Gagal mengekspor semua gambar:", err);
            alert("Terjadi kesalahan saat mengekspor gambar.");
        } finally {
            setActivePageId(originalActiveId); // Kembalikan ke halaman semula
            setIsExporting(false);
        }
    };

    let textPaddingBottom = activePageId === 'outro' ? '450px' : '60px';

    const isLogoAtTop = (activePage.logoPosition || 'top-left').includes('top');
    const isLogoAtBottom = (activePage.logoPosition || 'top-left').includes('bottom');
    const isLogoAtRight = (activePage.logoPosition || 'top-left').includes('right');
    const isLogoCollision = (activePage.textPosition === 'top' && isLogoAtTop) || (activePage.textPosition === 'bottom' && isLogoAtBottom);

    return (
        <div className="ngg-container">
            <div className="ngg-preview-area">
                <div 
                    className="ngg-card ngg-preview-wrapper"
                    onClick={() => {
                        if (window.innerWidth < 768) {
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                    }}
                    title="Klik untuk kembali ke atas"
                >
                    <h2 className="ngg-title">Live Preview (Resolusi 1080x1350)</h2>
                    
                    {/* Element referensi lebar penuh (100%) untuk kalkulasi skala yang akurat */}
                    <div ref={wrapperRef} style={{ width: '100%' }}></div>
                    
                    <div 
                        className="ngg-preview-container"
                        style={{ 
                            width: `${1080 * scale}px`,
                            height: `${1350 * scale}px`,
                            margin: '0 auto'
                        }}
                    >
                        <div 
                            ref={previewRef}
                            className={`ngg-preview-canvas pos-${activePage.textPosition}`}
                            style={{
                                width: '1080px',
                                height: '1350px',
                                transform: `scale(${scale})`,
                                transformOrigin: 'top left',
                                backgroundColor: activePage.bgType === 'color' ? (activePage.bgColor || '#1e293b') : (currentImage ? 'transparent' : '#e2e8f0'),
                                overflow: 'hidden'
                            }}
                        >
                            {/* Layer Gambar Background (Terpisah agar bisa di-zoom/geser tanpa mempengaruhi teks) */}
                            {activePage.bgType !== 'color' && currentImage && (
                                <div style={{
                                    position: 'absolute',
                                    top: 0, left: 0, right: 0, bottom: 0,
                                    backgroundImage: `url(${currentImage})`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: `${activePage.bgPosX ?? 50}% ${activePage.bgPosY ?? 50}%`,
                                    transform: `scale(${(activePage.bgZoom ?? 100) / 100})`,
                                    zIndex: 0
                                }}></div>
                            )}

                            {!currentImage && activePage.bgType !== 'color' && <span className="ngg-placeholder-text">Belum ada gambar latar</span>}
                            
                            <div 
                                className="ngg-overlay" 
                                style={{ opacity: (activePage.overlayStrength !== undefined ? activePage.overlayStrength : 85) / 100 }}
                            ></div>
                            
                            {/* Logo Absolute (Jika tidak bertabrakan dengan teks) */}
                            {activePage.showLogo !== false && !isLogoCollision && (
                                <img 
                                    src="/logo_ukpm_civitas.png" 
                                    alt="Logo Civitas" 
                                    style={{
                                        position: 'absolute',
                                        width: '135px',
                                        zIndex: 3,
                                        filter: 'drop-shadow(0px 3px 6px rgba(0,0,0,0.7))',
                                        top: isLogoAtTop ? '60px' : 'auto',
                                        bottom: isLogoAtBottom ? '60px' : 'auto',
                                        left: !isLogoAtRight ? '60px' : 'auto',
                                        right: isLogoAtRight ? '60px' : 'auto',
                                    }}
                                />
                            )}
                            
                            {activePageId === 'outro' && (
                                <div style={{ 
                                    position: 'absolute', 
                                    bottom: '80px', 
                                    left: '80px', 
                                    right: '80px', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'space-between', 
                                    zIndex: 4 
                                }}>
                                    <h2 style={{ 
                                        color: 'white', 
                                        fontSize: '40px', 
                                        fontWeight: '700', 
                                        width: '450px', 
                                        lineHeight: '1.2',
                                        fontFamily: '"Poppins", sans-serif',
                                        margin: 0
                                    }}>Baca selengkapnya<br/>di website kami!!</h2>
                                    
                                    {activePage.qrImage ? (
                                        <img 
                                            src={activePage.qrImage} 
                                            alt="QR Code" 
                                            style={{ 
                                                width: `${activePage.qrSize || 320}px`, 
                                                height: `${activePage.qrSize || 320}px`, 
                                                borderRadius: '24px', 
                                                objectFit: 'cover',
                                                border: '8px solid white',
                                                backgroundColor: 'white',
                                                flexShrink: 0
                                            }} 
                                        />
                                    ) : (
                                        <div style={{ 
                                            width: `${activePage.qrSize || 320}px`, 
                                            height: `${activePage.qrSize || 320}px`, 
                                            backgroundColor: '#f1f5f9', 
                                            borderRadius: '24px', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center', 
                                            color: '#64748b', 
                                            fontSize: '18px', 
                                            fontWeight: '600',
                                            border: '8px solid white',
                                            textAlign: 'center',
                                            padding: '20px',
                                            flexShrink: 0
                                        }}>
                                            Upload QR Code
                                        </div>
                                    )}
                                </div>
                            )}

                            <div 
                                className="ngg-text-container"
                                style={{
                                    paddingTop: '60px',
                                    paddingBottom: textPaddingBottom,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    width: '100%',
                                    position: 'relative',
                                    zIndex: 2
                                }}
                            >
                                {/* Logo In-Flow (Jika bertabrakan, logo selalu berada di atas teks) */}
                                {activePage.showLogo !== false && isLogoCollision && (
                                    <img 
                                        src="/logo_ukpm_civitas.png" 
                                        alt="Logo Civitas" 
                                        style={{
                                            width: '135px',
                                            filter: 'drop-shadow(0px 3px 6px rgba(0,0,0,0.7))',
                                            marginBottom: '40px',
                                            alignSelf: isLogoAtRight ? 'flex-end' : 'flex-start'
                                        }}
                                    />
                                )}
                                
                                <div 
                                    className="tiptap-output" 
                                    dangerouslySetInnerHTML={{ __html: currentHtml }} 
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <p className="ngg-help-text">Hasil download akan selalu konsisten dan beresolusi tinggi di perangkat apa pun.</p>
                
                {/* Drone View / Grid View untuk Desktop */}
                <div className="ngg-card ngg-drone-view">
                    <h3 className="ngg-drone-title">Semua Halaman</h3>
                    <div className="ngg-drone-grid">
                        {pages.map((page, index) => {
                            const isSelected = page.id === activePageId;
                            return (
                                <div 
                                    key={page.id} 
                                    className={`ngg-drone-item ${isSelected ? 'active' : ''}`}
                                    onClick={() => setActivePageId(page.id)}
                                    title={page.title}
                                >
                                    <div className="ngg-drone-thumbnail">
                                        {page.bgType === 'image' && page.image ? (
                                            <div style={{
                                                width: '100%', height: '100%',
                                                backgroundImage: `url(${page.image})`,
                                                backgroundSize: 'cover',
                                                backgroundPosition: `${page.bgPosX ?? 50}% ${page.bgPosY ?? 50}%`,
                                            }}></div>
                                        ) : (
                                            <div style={{
                                                width: '100%', height: '100%',
                                                backgroundColor: page.bgColor || '#1e293b'
                                            }}></div>
                                        )}
                                        <div className="ngg-drone-item-overlay"></div>
                                        <div className="ngg-drone-number">{index + 1}</div>
                                        {isSelected && <div className="ngg-drone-active-ring"></div>}
                                    </div>
                                    <div className="ngg-drone-label">{page.title}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="ngg-sidebar">
                <div className="ngg-card">
                    <h2 className="ngg-title">Pengaturan Grafis</h2>
                    
                    <div className="ngg-form-group">
                        <label><LayoutTemplate size={16} /> Pilih Halaman</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <select 
                                value={activePageId} 
                                onChange={(e) => setActivePageId(e.target.value)}
                                className="ngg-select"
                                style={{ flex: 1 }}
                            >
                                {pages.map(p => (
                                    <option key={p.id} value={p.id}>{p.title}</option>
                                ))}
                            </select>
                            <button 
                                type="button" 
                                onClick={addPage}
                                className="ngg-export-btn"
                                style={{ width: 'auto', padding: '12px', background: '#10b981' }}
                                title="Tambah Halaman Baru"
                            >
                                <Plus size={20} />
                            </button>
                            {!['cover', 'outro'].includes(activePageId) && (
                                <button 
                                    type="button" 
                                    onClick={() => removePage(activePageId)}
                                    className="ngg-export-btn"
                                    style={{ width: 'auto', padding: '12px', background: '#ef4444' }}
                                    title="Hapus Halaman Ini"
                                >
                                    <Trash2 size={20} />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="ngg-form-group">
                        <label><MoveVertical size={16} /> Posisi Teks</label>
                        <div className="ngg-position-buttons">
                            <button 
                                className={`ngg-pos-btn ${activePage.textPosition === 'top' ? 'active' : ''}`}
                                onClick={() => updatePage('textPosition', 'top')}
                            >
                                Atas
                            </button>
                            <button 
                                className={`ngg-pos-btn ${activePage.textPosition === 'center' ? 'active' : ''}`}
                                onClick={() => updatePage('textPosition', 'center')}
                            >
                                Tengah
                            </button>
                            <button 
                                className={`ngg-pos-btn ${activePage.textPosition === 'bottom' ? 'active' : ''}`}
                                onClick={() => updatePage('textPosition', 'bottom')}
                            >
                                Bawah
                            </button>
                        </div>
                    </div>

                    <div className="ngg-form-group">
                        <label><ImageIcon size={16} /> Latar Belakang</label>
                        <div className="ngg-position-buttons" style={{ marginBottom: '12px' }}>
                            <button 
                                className={`ngg-pos-btn ${activePage.bgType !== 'color' ? 'active' : ''}`}
                                onClick={() => updatePage('bgType', 'image')}
                            >
                                Gambar
                            </button>
                            <button 
                                className={`ngg-pos-btn ${activePage.bgType === 'color' ? 'active' : ''}`}
                                onClick={() => updatePage('bgType', 'color')}
                            >
                                Warna Solid
                            </button>
                        </div>

                        {activePage.bgType !== 'color' ? (
                            <div className="ngg-upload-area">
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    id="image-upload" 
                                    onChange={handleImageUpload}
                                />
                                <label htmlFor="image-upload" className="ngg-upload-btn">
                                    <Upload size={18} /> {currentImage ? "Ganti Gambar" : "Pilih Gambar"}
                                </label>

                                {currentImage && (
                                    <div className="ngg-image-controls" style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                        <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text)', marginBottom: '4px' }}>Sesuaikan Gambar</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', width: '50px' }}>Zoom</span>
                                            <input type="range" min="100" max="300" value={activePage.bgZoom ?? 100} onChange={(e) => updatePage('bgZoom', parseInt(e.target.value))} style={{ flex: 1, cursor: 'pointer' }} />
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', width: '50px' }}>Horiz</span>
                                            <input type="range" min="0" max="100" value={activePage.bgPosX ?? 50} onChange={(e) => updatePage('bgPosX', parseInt(e.target.value))} style={{ flex: 1, cursor: 'pointer' }} />
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', width: '50px' }}>Vertikal</span>
                                            <input type="range" min="0" max="100" value={activePage.bgPosY ?? 50} onChange={(e) => updatePage('bgPosY', parseInt(e.target.value))} style={{ flex: 1, cursor: 'pointer' }} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <input 
                                    type="color" 
                                    value={activePage.bgColor || '#1e293b'} 
                                    onChange={(e) => updatePage('bgColor', e.target.value)}
                                    style={{ 
                                        width: '45px', 
                                        height: '45px', 
                                        cursor: 'pointer', 
                                        padding: '0', 
                                        border: '1px solid var(--border)',
                                        borderRadius: '8px',
                                        background: 'var(--bg)'
                                    }}
                                />
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '500' }}>Pilih warna latar belakang</span>
                            </div>
                        )}
                    </div>

                    <div className="ngg-form-group">
                        <label><Blend size={16} /> Ketebalan Gradasi</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <input 
                                type="range" 
                                min="0" 
                                max="100" 
                                value={activePage.overlayStrength !== undefined ? activePage.overlayStrength : 85} 
                                onChange={(e) => updatePage('overlayStrength', parseInt(e.target.value))}
                                style={{ flex: 1, cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', width: '40px', textAlign: 'right', fontWeight: '600' }}>
                                {activePage.overlayStrength !== undefined ? activePage.overlayStrength : 85}%
                            </span>
                        </div>
                    </div>

                    <div className="ngg-form-group">
                        <label><LayoutTemplate size={16} /> Logo Civitas</label>
                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input 
                                    type="checkbox" 
                                    id="showLogo"
                                    checked={activePage.showLogo !== false}
                                    onChange={(e) => updatePage('showLogo', e.target.checked)}
                                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                />
                                <label htmlFor="showLogo" style={{ margin: 0, cursor: 'pointer', color: 'var(--text)' }}>Tampilkan</label>
                            </div>
                            
                            {activePage.showLogo !== false && (
                                <select 
                                    className="ngg-select" 
                                    style={{ flex: 1, padding: '8px', fontSize: '0.85rem' }}
                                    value={activePage.logoPosition || 'top-left'}
                                    onChange={(e) => updatePage('logoPosition', e.target.value)}
                                >
                                    <option value="top-left">Kiri Atas</option>
                                    <option value="top-right">Kanan Atas</option>
                                    <option value="bottom-left">Kiri Bawah</option>
                                    <option value="bottom-right">Kanan Bawah</option>
                                </select>
                            )}
                        </div>
                    </div>

                    <div className="ngg-form-group">
                        <label><Type size={16} /> Desain Teks</label>
                        <div className="ngg-editor-wrapper">
                            <MenuBar editor={editor} />
                            <EditorContent editor={editor} className="ngg-editor-content" />
                        </div>
                    </div>

                    {activePageId === 'outro' && (
                        <div className="ngg-form-group">
                            <label><ImageIcon size={16} /> QR Code (Opsional)</label>
                            <div className="ngg-upload-area">
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    id="qr-upload" 
                                    onChange={handleQrUpload}
                                />
                                <label htmlFor="qr-upload" className="ngg-upload-btn" style={{ marginBottom: '16px' }}>
                                    <Upload size={18} /> {activePage.qrImage ? "Ganti QR Code" : "Upload QR Code"}
                                </label>
                                
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', width: '50px' }}>Ukuran</span>
                                    <input 
                                        type="range" 
                                        min="150" 
                                        max="500" 
                                        value={activePage.qrSize || 320} 
                                        onChange={(e) => updatePage('qrSize', parseInt(e.target.value))} 
                                        style={{ flex: 1, cursor: 'pointer' }} 
                                    />
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', width: '45px', textAlign: 'right', fontWeight: '600' }}>
                                        {activePage.qrSize || 320}px
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                        className="ngg-export-btn" 
                        onClick={handleExport} 
                        disabled={isExporting}
                        style={{ flex: 1, backgroundColor: '#334155' }}
                        title="Download halaman yang sedang tampil"
                    >
                        <Download size={18} />
                        Halaman Ini
                    </button>
                    <button 
                        className="ngg-export-btn" 
                        onClick={handleExportAll} 
                        disabled={isExporting}
                        style={{ flex: 2 }}
                        title="Download semua halaman secara berurutan"
                    >
                        <Download size={18} />
                        {isExporting ? "Memproses..." : "Download Semua"}
                    </button>
                </div>
            </div>
        </div>
    );
}
