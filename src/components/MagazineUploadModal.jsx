import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { Upload, FileText, Image as ImageIcon, X, BookOpen, RefreshCw, CheckCircle, AlertTriangle, Sparkles, Users } from 'lucide-react';
import imageCompression from 'browser-image-compression';

export default function MagazineUploadModal({ userId }) {
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [uploadStatus, setUploadStatus] = useState('');
    const [isCompressing, setIsCompressing] = useState(false);
    const [coverSizeInfo, setCoverSizeInfo] = useState('');

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
        setTimeout(() => {
            setForm(initialForm);
            setCoverFile(null);
            setPdfFile(null);
            setCoverPreview('');
            setCoverSizeInfo('');
            setSuccess(false);
        }, 250);
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
                maxSizeMB: 0.35,
                maxWidthOrHeight: 1400,
                useWebWorker: true
            });
            const newSizeMB = (compressed.size / 1024 / 1024).toFixed(2);
            setCoverFile(compressed);
            setCoverPreview(URL.createObjectURL(compressed));
            setCoverSizeInfo(`${originalSizeMB} MB → ${newSizeMB} MB ✓`);
        } catch (err) {
            setCoverFile(file);
            setCoverPreview(URL.createObjectURL(file));
            setCoverSizeInfo(`${originalSizeMB} MB (file asli)`);
        } finally {
            setIsCompressing(false);
        }
    };

    const MAX_PDF_SIZE_MB = 25;
    const [pdfWarning, setPdfWarning] = useState('');

    const handlePdfSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const sizeMB = file.size / 1024 / 1024;
        if (sizeMB > MAX_PDF_SIZE_MB) {
            setPdfWarning(`File terlalu besar (${sizeMB.toFixed(1)} MB). Maksimal ${MAX_PDF_SIZE_MB} MB.`);
            return;
        }
        setPdfWarning('');
        setPdfFile(file);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title.trim()) return alert("Judul Terbitan wajib diisi!");
        if (!coverFile) return alert("Cover Majalah wajib dipilih!");
        if (!pdfFile) return alert("File PDF Majalah wajib dipilih!");
        if (isCompressing) return alert("Tunggu proses kompresi cover selesai!");

        setLoading(true);
        try {
            setUploadStatus('Mengunggah cover...');
            const coverExt = coverFile.name.split('.').pop();
            const coverName = `cover-${Date.now()}.${coverExt}`;
            const { error: coverErr } = await supabase.storage.from('magazine_covers').upload(coverName, coverFile);
            if (coverErr) throw coverErr;
            const finalCoverUrl = supabase.storage.from('magazine_covers').getPublicUrl(coverName).data.publicUrl;

            setUploadStatus('Mengunggah file PDF...');
            const pdfExt = pdfFile.name.split('.').pop();
            const pdfName = `magazine-${Date.now()}.${pdfExt}`;
            const { error: pdfErr } = await supabase.storage.from('magazine_pdfs').upload(pdfName, pdfFile);
            if (pdfErr) throw pdfErr;
            const finalPdfUrl = supabase.storage.from('magazine_pdfs').getPublicUrl(pdfName).data.publicUrl;

            setUploadStatus('Menyimpan data publikasi...');
            const payload = {
                title: form.title.trim(),
                angkatan: form.angkatan.trim(),
                description: form.description.trim(),
                jenis: form.jenis,
                pimpinan_umum: form.pimpinan_umum.trim(),
                pimpinan_redaksi: form.pimpinan_redaksi.trim(),
                redaktur_pelaksana: form.redaktur_pelaksana.trim(),
                editor: form.editor.trim(),
                layouter: form.layouter.trim(),
                redaksi: form.redaksi.trim(),
                cover_url: finalCoverUrl,
                pdf_url: finalPdfUrl,
                uploaded_by: userId
            };

            const { error: insertErr } = await supabase.from('magazines').insert([payload]);
            if (insertErr) throw insertErr;

            setSuccess(true);
            setTimeout(() => handleClose(), 1800);

        } catch (error) {
            alert("Gagal mengunggah: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    if (!mounted) return null;

    return createPortal(
        <div className={`mag-modal-overlay ${isOpen ? 'open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
            <div className="mag-modal-card">
                {success ? (
                    <div className="mag-success-view">
                        <div className="mag-success-badge">
                            <CheckCircle size={44} strokeWidth={1.75} />
                        </div>
                        <h2>Berhasil Dipublikasikan!</h2>
                        <p>Edisi baru telah masuk ke Rak Terbitan dan siap dibaca publik.</p>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="mag-header">
                            <div className="mag-header-title">
                                <div className="mag-icon-box">
                                    <BookOpen size={20} />
                                </div>
                                <div>
                                    <h3>Unggah Edisi Majalah</h3>
                                    <p>Publikasikan majalah, tabloid, atau buletin digital</p>
                                </div>
                            </div>
                            <button type="button" onClick={handleClose} className="mag-close-btn" aria-label="Tutup">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Form Body */}
                        <form onSubmit={handleSubmit} className="mag-form-content">
                            {/* File Upload Zones */}
                            <div className="mag-upload-grid">
                                {/* Cover Upload */}
                                <div className="mag-upload-item">
                                    <span className="mag-field-label">1. Cover Depan <span className="req">*</span></span>
                                    <label className={`mag-dropzone ${coverPreview ? 'has-preview' : ''} ${isCompressing ? 'compressing' : ''}`}>
                                        {isCompressing ? (
                                            <div className="mag-drop-placeholder">
                                                <RefreshCw size={26} className="mag-spin" />
                                                <span className="mag-drop-title">Mengompres Foto...</span>
                                                <span className="mag-drop-sub">Menyesuaikan ukuran web</span>
                                            </div>
                                        ) : coverPreview ? (
                                            <div className="mag-preview-box">
                                                <img src={coverPreview} alt="Cover Preview" />
                                                <div className="mag-preview-overlay">
                                                    <ImageIcon size={20} />
                                                    <span>Ganti Cover</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="mag-drop-placeholder">
                                                <div className="mag-drop-icon">
                                                    <ImageIcon size={24} />
                                                </div>
                                                <span className="mag-drop-title">Pilih Cover Majalah</span>
                                                <span className="mag-drop-sub">JPG / PNG (Otomatis dikompres)</span>
                                            </div>
                                        )}
                                        <input type="file" accept="image/*" onChange={handleCoverSelect} className="mag-hidden-input" />
                                    </label>
                                    {coverSizeInfo && (
                                        <div className="mag-badge-info">
                                            <Sparkles size={13} />
                                            <span>{coverSizeInfo}</span>
                                        </div>
                                    )}
                                </div>

                                {/* PDF Upload */}
                                <div className="mag-upload-item">
                                    <span className="mag-field-label">2. Dokumen PDF <span className="req">*</span></span>
                                    <label className={`mag-dropzone ${pdfFile ? 'has-pdf' : ''} ${pdfWarning ? 'has-error' : ''}`}>
                                        {pdfFile ? (
                                            <div className="mag-pdf-ready">
                                                <div className="mag-pdf-icon-box">
                                                    <FileText size={26} />
                                                </div>
                                                <span className="mag-pdf-filename">{pdfFile.name}</span>
                                                <span className="mag-pdf-filesize">{(pdfFile.size / 1024 / 1024).toFixed(1)} MB</span>
                                                <span className="mag-pdf-change-hint">Klik untuk ganti file</span>
                                            </div>
                                        ) : (
                                            <div className="mag-drop-placeholder">
                                                <div className="mag-drop-icon pdf">
                                                    <FileText size={24} />
                                                </div>
                                                <span className="mag-drop-title">Pilih File PDF</span>
                                                <span className="mag-drop-sub">Maksimal {MAX_PDF_SIZE_MB} MB</span>
                                            </div>
                                        )}
                                        <input type="file" accept="application/pdf" onChange={handlePdfSelect} className="mag-hidden-input" />
                                    </label>
                                    {pdfWarning && (
                                        <div className="mag-badge-warning">
                                            <AlertTriangle size={13} />
                                            <span>{pdfWarning}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Section 1: Informasi Utama */}
                            <div className="mag-section-divider">
                                <h4>Informasi Utama</h4>
                            </div>

                            <div className="mag-input-grid">
                                <div className="mag-input-group full">
                                    <label>Judul Terbitan <span className="req">*</span></label>
                                    <input
                                        type="text"
                                        name="title"
                                        value={form.title}
                                        onChange={handleInputChange}
                                        placeholder="Contoh: Majalah Civitas Edisi 42: Arus Perubahan"
                                        required
                                    />
                                </div>

                                <div className="mag-input-group">
                                    <label>Jenis Terbitan <span className="req">*</span></label>
                                    <div className="mag-select-wrap">
                                        <select name="jenis" value={form.jenis} onChange={handleInputChange}>
                                            <option value="Majalah">Majalah</option>
                                            <option value="Tabloid">Tabloid</option>
                                            <option value="Wartabasement">Wartabasement</option>
                                            <option value="Buletin">Buletin</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="mag-input-group">
                                    <label>Angkatan / Edisi</label>
                                    <input
                                        type="text"
                                        name="angkatan"
                                        value={form.angkatan}
                                        onChange={handleInputChange}
                                        placeholder="Contoh: 2024 / Edisi Khusus"
                                    />
                                </div>

                                <div className="mag-input-group full">
                                    <label>Sinopsis Singkat</label>
                                    <textarea
                                        name="description"
                                        value={form.description}
                                        onChange={handleInputChange}
                                        rows="3"
                                        placeholder="Tuliskan gambaran singkat atau liputan utama dalam edisi ini..."
                                    />
                                </div>
                            </div>

                            {/* Section 2: Susunan Redaksi (Selalu Tampil) */}
                            <div className="mag-section-divider">
                                <h4>Susunan Tim Redaksi</h4>
                                <p>Informasi struktur pengurus edisi ini</p>
                            </div>

                            <div className="mag-input-grid editorial-grid">
                                <div className="mag-input-group">
                                    <label>Pimpinan Umum</label>
                                    <input
                                        type="text"
                                        name="pimpinan_umum"
                                        value={form.pimpinan_umum}
                                        onChange={handleInputChange}
                                        placeholder="Nama Pimpinan Umum..."
                                    />
                                </div>

                                <div className="mag-input-group">
                                    <label>Pimpinan Redaksi</label>
                                    <input
                                        type="text"
                                        name="pimpinan_redaksi"
                                        value={form.pimpinan_redaksi}
                                        onChange={handleInputChange}
                                        placeholder="Nama Pemimpin Redaksi..."
                                    />
                                </div>

                                <div className="mag-input-group">
                                    <label>Redaktur Pelaksana</label>
                                    <input
                                        type="text"
                                        name="redaktur_pelaksana"
                                        value={form.redaktur_pelaksana}
                                        onChange={handleInputChange}
                                        placeholder="Nama Redaktur Pelaksana..."
                                    />
                                </div>

                                <div className="mag-input-group">
                                    <label>Editor</label>
                                    <input
                                        type="text"
                                        name="editor"
                                        value={form.editor}
                                        onChange={handleInputChange}
                                        placeholder="Nama tim editor..."
                                    />
                                </div>

                                <div className="mag-input-group">
                                    <label>Layouter / Desain</label>
                                    <input
                                        type="text"
                                        name="layouter"
                                        value={form.layouter}
                                        onChange={handleInputChange}
                                        placeholder="Nama tim layouter..."
                                    />
                                </div>

                                <div className="mag-input-group">
                                    <label>Reporter / Tim Redaksi</label>
                                    <input
                                        type="text"
                                        name="redaksi"
                                        value={form.redaksi}
                                        onChange={handleInputChange}
                                        placeholder="Nama tim reporter..."
                                    />
                                </div>
                            </div>

                            {/* Action Footer */}
                            <div className="mag-footer">
                                <button type="button" onClick={handleClose} className="mag-btn-cancel" disabled={loading}>
                                    Batal
                                </button>
                                <button type="submit" className="mag-btn-submit" disabled={loading || isCompressing}>
                                    {loading ? (
                                        <span className="mag-btn-flex">
                                            <RefreshCw size={17} className="mag-spin" />
                                            <span>{uploadStatus || 'Mengunggah...'}</span>
                                        </span>
                                    ) : isCompressing ? (
                                        <span className="mag-btn-flex">
                                            <RefreshCw size={17} className="mag-spin" />
                                            <span>Mengompres Cover...</span>
                                        </span>
                                    ) : (
                                        <span className="mag-btn-flex">
                                            <Upload size={17} />
                                            <span>Publikasikan Edisi</span>
                                        </span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>

            <style>{`
                /* OVERLAY */
                .mag-modal-overlay {
                    position: fixed;
                    inset: 0;
                    z-index: 99999;
                    background: rgba(15, 23, 42, 0.65);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 16px;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.25s ease;
                    font-family: 'Poppins', sans-serif;
                }
                .mag-modal-overlay.open {
                    opacity: 1;
                    pointer-events: auto;
                }

                /* DIALOG CARD */
                .mag-modal-card {
                    width: 100%;
                    max-width: 640px;
                    max-height: 90vh;
                    background: var(--bg);
                    color: var(--text);
                    border: 1px solid var(--border);
                    border-radius: 24px;
                    box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.35);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    transform: scale(0.95) translateY(12px);
                    transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .mag-modal-overlay.open .mag-modal-card {
                    transform: scale(1) translateY(0);
                }

                /* HEADER */
                .mag-header {
                    padding: 20px 24px;
                    border-bottom: 1px solid var(--border-muted);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background: var(--bg);
                    flex-shrink: 0;
                }
                .mag-header-title {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .mag-icon-box {
                    width: 40px;
                    height: 40px;
                    border-radius: 12px;
                    background: rgba(59, 130, 246, 0.1);
                    color: #3b82f6;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                .mag-header-title h3 {
                    margin: 0;
                    font-size: 1.15rem;
                    font-weight: 700;
                    letter-spacing: -0.3px;
                }
                .mag-header-title p {
                    margin: 2px 0 0 0;
                    font-size: 0.8rem;
                    color: var(--text-muted);
                }
                .mag-close-btn {
                    width: 36px;
                    height: 36px;
                    border-radius: 10px;
                    border: none;
                    background: var(--bg-light);
                    color: var(--text-muted);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .mag-close-btn:hover {
                    background: var(--text);
                    color: var(--bg);
                }

                /* BODY CONTENT */
                .mag-form-content {
                    padding: 24px;
                    overflow-y: auto;
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 22px;
                }

                /* UPLOAD GRID */
                .mag-upload-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 16px;
                }
                .mag-upload-item {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .mag-field-label {
                    font-size: 0.8rem;
                    font-weight: 600;
                    color: var(--text-muted);
                }
                .req {
                    color: #ef4444;
                }

                /* DROPZONES */
                .mag-dropzone {
                    position: relative;
                    aspect-ratio: 4/3;
                    border: 2px dashed var(--border);
                    border-radius: 16px;
                    background: var(--bg-light);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    overflow: hidden;
                    transition: all 0.2s ease;
                }
                .mag-dropzone:hover {
                    border-color: #3b82f6;
                    background: rgba(59, 130, 246, 0.04);
                }
                .mag-dropzone.has-preview,
                .mag-dropzone.has-pdf {
                    border-style: solid;
                    border-color: var(--border);
                    background: var(--bg);
                }
                .mag-dropzone.has-error {
                    border-color: #ef4444;
                    background: rgba(239, 68, 68, 0.05);
                }
                .mag-drop-placeholder {
                    padding: 16px;
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 6px;
                }
                .mag-drop-icon {
                    width: 44px;
                    height: 44px;
                    border-radius: 12px;
                    background: var(--bg);
                    border: 1px solid var(--border-muted);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #3b82f6;
                    margin-bottom: 2px;
                }
                .mag-drop-icon.pdf {
                    color: #ef4444;
                }
                .mag-drop-title {
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: var(--text);
                }
                .mag-drop-sub {
                    font-size: 0.72rem;
                    color: var(--text-muted);
                }

                /* PREVIEW */
                .mag-preview-box {
                    width: 100%;
                    height: 100%;
                    position: relative;
                }
                .mag-preview-box img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .mag-preview-overlay {
                    position: absolute;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.55);
                    color: white;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    opacity: 0;
                    transition: opacity 0.2s;
                    font-size: 0.8rem;
                    font-weight: 600;
                    backdrop-filter: blur(2px);
                }
                .mag-dropzone:hover .mag-preview-overlay {
                    opacity: 1;
                }

                /* PDF READY STATE */
                .mag-pdf-ready {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 14px;
                    text-align: center;
                    gap: 4px;
                }
                .mag-pdf-icon-box {
                    color: #ef4444;
                }
                .mag-pdf-filename {
                    font-size: 0.8rem;
                    font-weight: 600;
                    color: var(--text);
                    max-width: 180px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .mag-pdf-filesize {
                    font-size: 0.72rem;
                    color: #10b981;
                    font-weight: 700;
                }
                .mag-pdf-change-hint {
                    font-size: 0.7rem;
                    color: var(--text-muted);
                    margin-top: 2px;
                }

                .mag-badge-info {
                    font-size: 0.75rem;
                    color: #10b981;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    background: rgba(16, 185, 129, 0.08);
                    padding: 4px 8px;
                    border-radius: 6px;
                }
                .mag-badge-warning {
                    font-size: 0.75rem;
                    color: #ef4444;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    background: rgba(239, 68, 68, 0.08);
                    padding: 4px 8px;
                    border-radius: 6px;
                }
                .mag-hidden-input {
                    display: none;
                }

                /* SECTION DIVIDERS */
                .mag-section-divider {
                    padding-top: 6px;
                    border-top: 1px solid var(--border-muted);
                }
                .mag-section-divider h4 {
                    margin: 0;
                    font-size: 0.95rem;
                    font-weight: 700;
                    color: var(--text);
                }
                .mag-section-divider p {
                    margin: 2px 0 0 0;
                    font-size: 0.75rem;
                    color: var(--text-muted);
                }

                /* INPUT FIELDS */
                .mag-input-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 16px;
                }
                .mag-input-group {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .mag-input-group.full {
                    grid-column: 1 / -1;
                }
                .mag-input-group label {
                    font-size: 0.8rem;
                    font-weight: 600;
                    color: var(--text-muted);
                }
                .mag-input-group input,
                .mag-input-group select,
                .mag-input-group textarea {
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
                .mag-input-group input:focus,
                .mag-input-group select:focus,
                .mag-input-group textarea:focus {
                    outline: none;
                    border-color: #3b82f6;
                    background: var(--bg);
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                }
                .mag-input-group textarea {
                    resize: vertical;
                    min-height: 70px;
                }

                /* FOOTER */
                .mag-footer {
                    display: flex;
                    align-items: center;
                    justify-content: flex-end;
                    gap: 12px;
                    padding-top: 12px;
                    border-top: 1px solid var(--border-muted);
                    margin-top: auto;
                }
                .mag-btn-cancel {
                    padding: 12px 20px;
                    border-radius: 12px;
                    border: 1px solid var(--border);
                    background: var(--bg-light);
                    color: var(--text-muted);
                    font-weight: 600;
                    font-size: 0.9rem;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .mag-btn-cancel:hover {
                    color: var(--text);
                    background: var(--bg);
                }
                .mag-btn-submit {
                    padding: 12px 24px;
                    border-radius: 12px;
                    border: none;
                    background: var(--text);
                    color: var(--bg);
                    font-weight: 600;
                    font-size: 0.9rem;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .mag-btn-submit:hover:not(:disabled) {
                    opacity: 0.9;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
                }
                .mag-btn-submit:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .mag-btn-flex {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .mag-spin {
                    animation: mag-spin-anim 1s linear infinite;
                }
                @keyframes mag-spin-anim {
                    100% { transform: rotate(360deg); }
                }

                /* SUCCESS STATE */
                .mag-success-view {
                    padding: 60px 30px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    gap: 16px;
                }
                .mag-success-badge {
                    width: 72px;
                    height: 72px;
                    border-radius: 50%;
                    background: rgba(16, 185, 129, 0.1);
                    color: #10b981;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    animation: mag-pop 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                .mag-success-view h2 {
                    margin: 0;
                    font-size: 1.35rem;
                    font-weight: 700;
                }
                .mag-success-view p {
                    margin: 0;
                    color: var(--text-muted);
                    font-size: 0.9rem;
                    max-width: 320px;
                }
                @keyframes mag-pop {
                    0% { transform: scale(0.5); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                }

                /* MOBILE RESPONSIVE */
                @media (max-width: 640px) {
                    .mag-modal-overlay {
                        padding: 0;
                        align-items: flex-end;
                    }
                    .mag-modal-card {
                        max-height: 92vh;
                        border-bottom-left-radius: 0;
                        border-bottom-right-radius: 0;
                        border-top-left-radius: 24px;
                        border-top-right-radius: 24px;
                    }
                    .mag-upload-grid {
                        grid-template-columns: 1fr;
                    }
                    .mag-dropzone {
                        aspect-ratio: 16/9;
                    }
                    .mag-input-grid {
                        grid-template-columns: 1fr;
                    }
                    .mag-form-content {
                        padding: 18px;
                    }
                }
            `}</style>
        </div>,
        document.body
    );
}
