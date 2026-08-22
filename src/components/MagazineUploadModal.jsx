import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { Upload, FileText, Image as ImageIcon, X, BookOpen, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import imageCompression from 'browser-image-compression';

export default function MagazineUploadModal({ userId }) {
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [uploadStatus, setUploadStatus] = useState(''); // Progress text
    const [isCompressing, setIsCompressing] = useState(false);
    const [coverSizeInfo, setCoverSizeInfo] = useState(''); // e.g. "2.1 MB → 0.3 MB"

    const initialForm = {
        title: '', angkatan: '', description: '', jenis: 'Majalah',
        pimpinan_umum: '', pimpinan_redaksi: '', redaktur_pelaksana: '',
        editor: '', layouter: '', redaksi: ''
    };

    const [form, setForm] = useState(initialForm);
    const [coverFile, setCoverFile] = useState(null);
    const [pdfFile, setPdfFile] = useState(null);
    const [coverPreview, setCoverPreview] = useState('');

    useEffect(() => setMounted(true), []);

    // Listen for custom event to open modal (fired from FAB button)
    useEffect(() => {
        const handler = () => {
            setIsOpen(true);
            setSuccess(false);
        };
        window.addEventListener('open-magazine-upload', handler);
        return () => window.removeEventListener('open-magazine-upload', handler);
    }, []);

    const handleClose = () => {
        setIsOpen(false);
        document.body.style.overflow = 'auto';
        // Reset after animation
        setTimeout(() => {
            setForm(initialForm);
            setCoverFile(null);
            setPdfFile(null);
            setCoverPreview('');
            setSuccess(false);
        }, 300);
    };

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        }
    }, [isOpen]);

    const handleInputChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleCoverSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const originalSizeMB = (file.size / 1024 / 1024).toFixed(1);
        setIsCompressing(true);
        setCoverSizeInfo(`Mengompres dari ${originalSizeMB} MB...`);

        try {
            const compressed = await imageCompression(file, {
                maxSizeMB: 0.3,
                maxWidthOrHeight: 1280,
                useWebWorker: true
            });
            const newSizeMB = (compressed.size / 1024 / 1024).toFixed(2);
            setCoverFile(compressed);
            setCoverPreview(URL.createObjectURL(compressed));
            setCoverSizeInfo(`${originalSizeMB} MB → ${newSizeMB} MB ✓`);
        } catch (err) {
            // Fallback jika kompresi gagal, pakai file asli
            setCoverFile(file);
            setCoverPreview(URL.createObjectURL(file));
            setCoverSizeInfo(`${originalSizeMB} MB (tanpa kompresi)`);
        } finally {
            setIsCompressing(false);
        }
    };

    const MAX_PDF_SIZE_MB = 20;
    const [pdfWarning, setPdfWarning] = useState('');

    const handlePdfSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const sizeMB = file.size / 1024 / 1024;
        if (sizeMB > MAX_PDF_SIZE_MB) {
            setPdfWarning(`File terlalu besar (${sizeMB.toFixed(1)} MB). Maksimal ${MAX_PDF_SIZE_MB} MB. Coba kompres dulu di smallpdf.com`);
            return;
        }
        setPdfWarning('');
        setPdfFile(file);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title) return alert("Judul wajib diisi!");
        if (!coverFile) return alert("Cover wajib diunggah!");
        if (!pdfFile) return alert("File PDF wajib diunggah!");
        if (isCompressing) return alert("Tunggu kompresi cover selesai!");

        setLoading(true);
        try {
            // 1. Upload Cover (sudah terkompres)
            setUploadStatus('Mengunggah cover...');
            const coverExt = coverFile.name.split('.').pop();
            const coverName = `cover-${Date.now()}.${coverExt}`;
            const { error: coverErr } = await supabase.storage.from('magazine_covers').upload(coverName, coverFile);
            if (coverErr) throw coverErr;
            const finalCoverUrl = supabase.storage.from('magazine_covers').getPublicUrl(coverName).data.publicUrl;

            // 2. Upload PDF
            setUploadStatus('Mengunggah PDF... (bisa butuh waktu)');
            const pdfExt = pdfFile.name.split('.').pop();
            const pdfName = `magazine-${Date.now()}.${pdfExt}`;
            const { error: pdfErr } = await supabase.storage.from('magazine_pdfs').upload(pdfName, pdfFile);
            if (pdfErr) throw pdfErr;
            const finalPdfUrl = supabase.storage.from('magazine_pdfs').getPublicUrl(pdfName).data.publicUrl;

            // 3. Insert to database
            setUploadStatus('Menyimpan data...');
            const payload = {
                title: form.title, angkatan: form.angkatan, description: form.description, jenis: form.jenis,
                pimpinan_umum: form.pimpinan_umum, pimpinan_redaksi: form.pimpinan_redaksi,
                redaktur_pelaksana: form.redaktur_pelaksana,
                editor: form.editor, layouter: form.layouter, redaksi: form.redaksi,
                cover_url: finalCoverUrl, pdf_url: finalPdfUrl, uploaded_by: userId
            };

            const { error: insertErr } = await supabase.from('magazines').insert([payload]);
            if (insertErr) throw insertErr;

            setSuccess(true);
            // Auto close after showing success
            setTimeout(() => handleClose(), 2000);

        } catch (error) {
            alert("Gagal upload: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    if (!mounted) return null;

    return createPortal(
        <>
            {/* Backdrop */}
            <div
                className={`mag-modal-backdrop ${isOpen ? 'open' : ''}`}
                onClick={handleClose}
            />

            {/* Modal Panel */}
            <div className={`mag-modal-panel ${isOpen ? 'open' : ''}`}>
                {success ? (
                    <div className="mag-success-state">
                        <div className="success-icon-ring">
                            <CheckCircle size={48} strokeWidth={1.5} />
                        </div>
                        <h2>Berhasil Diunggah!</h2>
                        <p>Edisi baru sudah tampil di Rak Terbitan.</p>
                    </div>
                ) : (
                    <div className="mag-modal-inner">
                        {/* Header */}
                        <div className="mag-modal-header">
                            <div className="mag-modal-title-group">
                                <BookOpen size={20} strokeWidth={1.5} />
                                <h2>Upload Edisi Baru</h2>
                            </div>
                            <button onClick={handleClose} className="mag-btn-close">
                                <X size={22} strokeWidth={1.5} />
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <form onSubmit={handleSubmit} className="mag-modal-body">
                            {/* File Upload Section - Visual First */}
                            <div className="mag-files-row">
                                {/* Cover Upload */}
                                <div className="mag-upload-col">
                                    <label className={`mag-upload-zone cover ${coverPreview ? 'has-file' : ''} ${isCompressing ? 'compressing' : ''}`}>
                                        {isCompressing ? (
                                            <div className="mag-upload-placeholder">
                                                <RefreshCw size={28} className="mag-spin" />
                                                <span className="mag-upload-main-text">Mengompres...</span>
                                            </div>
                                        ) : coverPreview ? (
                                            <>
                                                <img src={coverPreview} className="mag-cover-preview" alt="Cover" />
                                                <div className="mag-upload-overlay">
                                                    <ImageIcon size={20} />
                                                    <span>Ganti Cover</span>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="mag-upload-placeholder">
                                                <ImageIcon size={28} />
                                                <span className="mag-upload-main-text">Cover Majalah</span>
                                                <span className="mag-upload-sub-text">JPG, PNG (auto kompres)</span>
                                            </div>
                                        )}
                                        <input type="file" accept="image/*" onChange={handleCoverSelect} className="mag-hidden-input" />
                                    </label>
                                    {coverSizeInfo && <span className="mag-size-info">{coverSizeInfo}</span>}
                                </div>

                                {/* PDF Upload */}
                                <div className="mag-upload-col">
                                    <label className={`mag-upload-zone pdf ${pdfFile ? 'has-file' : ''} ${pdfWarning ? 'has-error' : ''}`}>
                                        {pdfFile ? (
                                            <div className="mag-pdf-selected">
                                                <FileText size={28} />
                                                <span className="mag-pdf-name">{pdfFile.name}</span>
                                                <span className="mag-upload-sub-text">{(pdfFile.size / 1024 / 1024).toFixed(1)} MB</span>
                                            </div>
                                        ) : (
                                            <div className="mag-upload-placeholder">
                                                <FileText size={28} />
                                                <span className="mag-upload-main-text">File PDF</span>
                                                <span className="mag-upload-sub-text">Maks. {MAX_PDF_SIZE_MB} MB</span>
                                            </div>
                                        )}
                                        <input type="file" accept="application/pdf" onChange={handlePdfSelect} className="mag-hidden-input" />
                                    </label>
                                    {pdfWarning && (
                                        <span className="mag-pdf-warning">
                                            <AlertTriangle size={14} /> {pdfWarning}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Form Fields */}
                            <div className="mag-form-grid">
                                <div className="mag-field full">
                                    <label>Judul Terbitan <span className="req">*</span></label>
                                    <input type="text" name="title" value={form.title} onChange={handleInputChange} placeholder="Contoh: Kepulan Asap di Malang" required />
                                </div>
                                <div className="mag-field">
                                    <label>Jenis Terbitan</label>
                                    <select name="jenis" value={form.jenis} onChange={handleInputChange}>
                                        <option value="Majalah">Majalah</option>
                                        <option value="Tabloid">Tabloid</option>
                                        <option value="Wartabasement">Wartabasement</option>
                                    </select>
                                </div>
                                <div className="mag-field">
                                    <label>Angkatan</label>
                                    <input type="text" name="angkatan" value={form.angkatan} onChange={handleInputChange} placeholder="2024" />
                                </div>
                                <div className="mag-field full">
                                    <label>Deskripsi / Sinopsis</label>
                                    <textarea name="description" value={form.description} onChange={handleInputChange} rows="3" placeholder="Highlight liputan ini..." />
                                </div>

                                {/* Collapsible: Susunan Redaksi */}
                                <details className="mag-details full">
                                    <summary>Susunan Redaksi (Opsional)</summary>
                                    <div className="mag-details-grid">
                                        <div className="mag-field"><label>Pimpinan Umum</label><input type="text" name="pimpinan_umum" value={form.pimpinan_umum} onChange={handleInputChange} /></div>
                                        <div className="mag-field"><label>Pimpinan Redaksi</label><input type="text" name="pimpinan_redaksi" value={form.pimpinan_redaksi} onChange={handleInputChange} /></div>
                                        <div className="mag-field"><label>Redaktur Pelaksana</label><input type="text" name="redaktur_pelaksana" value={form.redaktur_pelaksana} onChange={handleInputChange} /></div>
                                        <div className="mag-field"><label>Editor</label><input type="text" name="editor" value={form.editor} onChange={handleInputChange} /></div>
                                        <div className="mag-field"><label>Layouter</label><input type="text" name="layouter" value={form.layouter} onChange={handleInputChange} /></div>
                                        <div className="mag-field"><label>Redaksi (Tim)</label><input type="text" name="redaksi" value={form.redaksi} onChange={handleInputChange} /></div>
                                    </div>
                                </details>
                            </div>

                            {/* Submit */}
                            <div className="mag-modal-footer">
                                <button type="button" onClick={handleClose} className="mag-btn secondary" disabled={loading}>Batal</button>
                                <button type="submit" className="mag-btn primary" disabled={loading || isCompressing}>
                                    {loading ? (
                                        <span className="mag-flex"><RefreshCw size={18} className="mag-spin" /> {uploadStatus || 'Mengupload...'}</span>
                                    ) : isCompressing ? (
                                        <span className="mag-flex"><RefreshCw size={18} className="mag-spin" /> Mengompres cover...</span>
                                    ) : (
                                        <span className="mag-flex"><Upload size={18} /> Publikasikan</span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>

            <style>{`
                /* ===== MAGAZINE UPLOAD MODAL ===== */
                .mag-modal-backdrop {
                    position: fixed; inset: 0; background: rgba(0,0,0,0.5);
                    z-index: 10000; opacity: 0; pointer-events: none;
                    transition: opacity 0.3s ease;
                    backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
                }
                .mag-modal-backdrop.open { opacity: 1; pointer-events: auto; }

                .mag-modal-panel {
                    position: fixed; top: 0; right: 0; bottom: 0;
                    width: 580px; max-width: 95vw;
                    background: var(--bg); z-index: 10001;
                    border-left: 1px solid var(--border);
                    transform: translateX(100%);
                    transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
                    display: flex; flex-direction: column;
                    font-family: 'Poppins', sans-serif;
                }
                .mag-modal-panel.open { transform: translateX(0); }

                .mag-modal-inner {
                    display: flex; flex-direction: column; height: 100%;
                }

                /* Header */
                .mag-modal-header {
                    padding: 20px 28px;
                    border-bottom: 1px solid var(--border-muted);
                    display: flex; justify-content: space-between; align-items: center;
                    flex-shrink: 0;
                }
                .mag-modal-title-group {
                    display: flex; align-items: center; gap: 10px;
                    color: var(--text);
                }
                .mag-modal-title-group h2 {
                    margin: 0; font-size: 1.15rem; font-weight: 600;
                    letter-spacing: -0.3px;
                }
                .mag-btn-close {
                    background: none; border: none; cursor: pointer;
                    color: var(--text-muted); padding: 6px;
                    border-radius: 8px; transition: all 0.2s;
                    display: flex; align-items: center; justify-content: center;
                }
                .mag-btn-close:hover {
                    background: var(--bg-light); color: var(--text);
                }

                /* Body (scrollable) */
                .mag-modal-body {
                    flex: 1; overflow-y: auto; padding: 28px;
                    display: flex; flex-direction: column; gap: 28px;
                }

                /* File Upload Zones */
                .mag-files-row {
                    display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
                }
                .mag-upload-col {
                    display: flex; flex-direction: column; gap: 6px;
                }
                .mag-upload-zone {
                    position: relative; border: 2px dashed var(--border);
                    border-radius: 14px; overflow: hidden;
                    cursor: pointer; transition: all 0.25s ease;
                    display: flex; align-items: center; justify-content: center;
                    background: var(--bg-light);
                }
                .mag-upload-zone.cover { aspect-ratio: 3/4; }
                .mag-upload-zone.pdf { aspect-ratio: 3/4; }
                .mag-upload-zone:hover { border-color: var(--text); background: rgba(0,0,0,0.02); }
                .mag-upload-zone.has-file { border-style: solid; border-color: transparent; }
                .mag-upload-zone.has-file:hover { border-color: var(--text-muted); }
                .mag-upload-zone.compressing { border-color: var(--text-muted); border-style: solid; pointer-events: none; opacity: 0.7; }
                .mag-upload-zone.has-error { border-color: #ef4444; }

                .mag-size-info {
                    font-size: 0.72rem; color: #10b981; font-weight: 600;
                    text-align: center; padding: 2px 0;
                }
                .mag-pdf-warning {
                    font-size: 0.72rem; color: #ef4444; font-weight: 600;
                    display: flex; align-items: start; gap: 4px;
                    line-height: 1.3; padding: 2px 0;
                }

                .mag-upload-placeholder {
                    display: flex; flex-direction: column; align-items: center; gap: 8px;
                    color: var(--text-muted); text-align: center; padding: 20px;
                }
                .mag-upload-main-text { font-weight: 600; font-size: 0.9rem; color: var(--text); }
                .mag-upload-sub-text { font-size: 0.75rem; color: var(--text-muted); }

                .mag-cover-preview {
                    width: 100%; height: 100%; object-fit: cover; display: block;
                }
                .mag-upload-overlay {
                    position: absolute; inset: 0;
                    background: rgba(0,0,0,0.55); color: white;
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    gap: 6px; opacity: 0; transition: opacity 0.2s;
                    font-weight: 500; font-size: 0.85rem;
                    backdrop-filter: blur(2px);
                }
                .mag-upload-zone:hover .mag-upload-overlay { opacity: 1; }

                .mag-pdf-selected {
                    display: flex; flex-direction: column; align-items: center; gap: 8px;
                    text-align: center; padding: 20px; color: var(--text);
                }
                .mag-pdf-name {
                    font-size: 0.8rem; font-weight: 600; word-break: break-all;
                    max-width: 100%; display: -webkit-box;
                    -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
                }

                .mag-hidden-input { display: none; }

                /* Form Grid */
                .mag-form-grid {
                    display: grid; grid-template-columns: 1fr 1fr; gap: 18px;
                }
                .mag-field.full { grid-column: 1 / -1; }
                .mag-field label {
                    display: block; font-size: 0.8rem; font-weight: 600;
                    color: var(--text-muted); margin-bottom: 6px;
                    letter-spacing: 0.2px;
                }
                .req { color: #ef4444; }
                .mag-field input, .mag-field textarea, .mag-field select {
                    width: 100%; padding: 10px 14px;
                    border: 1px solid var(--border); border-radius: 10px;
                    background: var(--bg); color: var(--text);
                    font-family: inherit; font-size: 0.9rem;
                    transition: all 0.2s;
                }
                .mag-field input:focus, .mag-field textarea:focus, .mag-field select:focus {
                    outline: none; border-color: var(--text);
                    box-shadow: 0 0 0 3px rgba(100,100,100,0.08);
                }
                .mag-field textarea { resize: none; }
                .mag-field select { cursor: pointer; }

                /* Collapsible Details */
                .mag-details {
                    border: 1px solid var(--border); border-radius: 12px;
                    overflow: hidden; transition: all 0.3s;
                }
                .mag-details summary {
                    padding: 14px 18px; font-size: 0.85rem; font-weight: 600;
                    color: var(--text-muted); cursor: pointer;
                    background: var(--bg-light); border-bottom: 1px solid transparent;
                    transition: all 0.2s; list-style: none;
                    display: flex; align-items: center; gap: 8px;
                }
                .mag-details summary::before {
                    content: '▸'; display: inline-block;
                    transition: transform 0.2s; font-size: 0.75rem;
                }
                .mag-details[open] summary::before { transform: rotate(90deg); }
                .mag-details summary:hover { color: var(--text); }
                .mag-details[open] summary { border-bottom-color: var(--border); }
                .mag-details-grid {
                    display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
                    padding: 18px;
                }

                /* Footer */
                .mag-modal-footer {
                    display: flex; gap: 12px; justify-content: flex-end;
                    padding-top: 10px; border-top: 1px solid var(--border-muted);
                    margin-top: auto; flex-shrink: 0;
                }
                .mag-btn {
                    padding: 12px 24px; border-radius: 10px; font-weight: 600;
                    font-size: 0.9rem; cursor: pointer; transition: all 0.2s;
                    border: none; display: inline-flex; align-items: center; gap: 8px;
                }
                .mag-btn.secondary {
                    background: var(--bg-light); border: 1px solid var(--border);
                    color: var(--text);
                }
                .mag-btn.secondary:hover { background: var(--bg); border-color: var(--text-muted); }
                .mag-btn.primary {
                    background: var(--text); color: var(--bg);
                }
                .mag-btn.primary:hover:not(:disabled) {
                    opacity: 0.9; transform: translateY(-1px);
                    box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                }
                .mag-btn:disabled { opacity: 0.5; cursor: not-allowed; }

                .mag-flex { display: flex; align-items: center; gap: 8px; }
                .mag-spin { animation: mag-spin-anim 1s linear infinite; }
                @keyframes mag-spin-anim { 100% { transform: rotate(360deg); } }

                /* Success State */
                .mag-success-state {
                    display: flex; flex-direction: column; align-items: center;
                    justify-content: center; height: 100%;
                    gap: 16px; text-align: center; padding: 40px;
                    color: var(--text); animation: mag-fade-in 0.4s ease;
                }
                .success-icon-ring {
                    width: 80px; height: 80px; border-radius: 50%;
                    background: rgba(16, 185, 129, 0.1);
                    display: flex; align-items: center; justify-content: center;
                    color: #10b981;
                    animation: mag-scale-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                .mag-success-state h2 { margin: 0; font-size: 1.3rem; font-weight: 700; }
                .mag-success-state p { margin: 0; color: var(--text-muted); font-size: 0.95rem; }

                @keyframes mag-fade-in { from { opacity: 0; } to { opacity: 1; } }
                @keyframes mag-scale-in { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }

                /* Responsive */
                @media (max-width: 640px) {
                    .mag-modal-panel { width: 100%; max-width: 100vw; }
                    .mag-files-row { grid-template-columns: 1fr; }
                    .mag-form-grid { grid-template-columns: 1fr; }
                    .mag-details-grid { grid-template-columns: 1fr; }
                    .mag-modal-body { padding: 20px; }
                }
            `}</style>
        </>,
        document.body
    );
}
