import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Upload, FileText, Image as ImageIcon, Save, Trash2, BookOpen, Edit3, X, Sparkles, AlertCircle } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import ProfileComboSelect from './ProfileComboSelect';

export default function MagazineManager({ userId }) {
    const [magazines, setMagazines] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editId, setEditId] = useState(null);

    const initialForm = {
        title: '', angkatan: '', description: '', jenis: 'Majalah',
        pimpinan_umum: '', pimpinan_redaksi: '', redaktur_pelaksana: '',
        editor: '', layouter: '', redaksi: '', cover_url: '', pdf_url: ''
    };

    const [form, setForm] = useState(initialForm);
    const [coverFile, setCoverFile] = useState(null);
    const [pdfFile, setPdfFile] = useState(null);

    useEffect(() => {
        fetchMagazines();
    }, []);

    const fetchMagazines = async () => {
        const { data, error } = await supabase
            .from('magazines')
            .select('*')
            .order('created_at', { ascending: false });
        if (!error && data) setMagazines(data);
    };

    const handleInputChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleEditClick = (mag) => {
        setEditId(mag.id);
        setForm({ ...mag });
        setCoverFile(null);
        setPdfFile(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditId(null);
        setForm(initialForm);
        setCoverFile(null);
        setPdfFile(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title.trim()) {
            alert("Judul Terbitan wajib diisi!");
            return;
        }

        setLoading(true);
        try {
            let finalCoverUrl = form.cover_url;
            let finalPdfUrl = form.pdf_url;

            if (coverFile) {
                // Lakukan kompresi sebelum upload!
                let fileToUpload = coverFile;
                let coverExt = coverFile.name.split('.').pop();
                
                try {
                    fileToUpload = await imageCompression(coverFile, {
                        maxSizeMB: 0.35,
                        maxWidthOrHeight: 1400,
                        useWebWorker: true,
                        fileType: 'image/webp'
                    });
                    coverExt = 'webp'; // Karena kita konversi ke webp
                } catch (e) {
                    console.warn("Gagal mengompres gambar:", e);
                }

                const coverName = `cover-${Date.now()}.${coverExt}`;
                const { error: coverErr } = await supabase.storage.from('magazine_covers').upload(coverName, fileToUpload);
                if (coverErr) throw coverErr;
                finalCoverUrl = supabase.storage.from('magazine_covers').getPublicUrl(coverName).data.publicUrl;
            }

            if (pdfFile) {
                const pdfExt = pdfFile.name.split('.').pop();
                const pdfName = `magazine-${Date.now()}.${pdfExt}`;
                const { error: pdfErr } = await supabase.storage.from('magazine_pdfs').upload(pdfName, pdfFile);
                if (pdfErr) throw pdfErr;
                finalPdfUrl = supabase.storage.from('magazine_pdfs').getPublicUrl(pdfName).data.publicUrl;
            }

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

            const { error: updateErr } = await supabase.from('magazines').update(payload).eq('id', editId);
            if (updateErr) throw updateErr;

            alert("Perubahan berhasil disimpan!");
            handleCancelEdit();
            fetchMagazines();
        } catch (error) {
            alert("Gagal menyimpan perubahan: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Hapus edisi terbitan ini secara permanen dari database & storage?")) return;
        try {
            const target = magazines.find(m => m.id === id);

            if (target?.cover_url) {
                const coverFileName = target.cover_url.split('/').pop();
                if (coverFileName) {
                    await supabase.storage.from('magazine_covers').remove([coverFileName]);
                }
            }
            if (target?.pdf_url) {
                const pdfFileName = target.pdf_url.split('/').pop();
                if (pdfFileName) {
                    await supabase.storage.from('magazine_pdfs').remove([pdfFileName]);
                }
            }

            await supabase.from('magazines').delete().eq('id', id);
            fetchMagazines();
        } catch (error) {
            alert("Gagal menghapus: " + error.message);
        }
    };

    return (
        <div className="mm-container">
            {/* EDIT FORM (INLINE SEAMLESS) */}
            {editId && (
                <form onSubmit={handleSubmit} className="mm-edit-card">
                    <div className="mm-edit-header">
                        <div>
                            <span className="mm-edit-badge">Mode Sunting</span>
                            <h3>Edit Data Edisi Terbitan</h3>
                        </div>
                        <button type="button" onClick={handleCancelEdit} className="mm-btn-cancel-edit">
                            <X size={16} />
                            <span>Batal Sunting</span>
                        </button>
                    </div>

                    <div className="mm-form-grid">
                        <div className="mm-input-unit full">
                            <label>Judul Terbitan <span className="req">*</span></label>
                            <input
                                type="text"
                                name="title"
                                value={form.title}
                                onChange={handleInputChange}
                                required
                                placeholder="Contoh: Majalah Civitas Edisi 42"
                            />
                        </div>

                        <div className="mm-input-unit">
                            <label>Jenis Terbitan <span className="req">*</span></label>
                            <select name="jenis" value={form.jenis} onChange={handleInputChange} required>
                                <option value="Majalah">Majalah</option>
                                <option value="Tabloid">Tabloid</option>
                                <option value="Wartabasement">Wartabasement</option>
                                <option value="Buletin">Buletin</option>
                            </select>
                        </div>

                        <div className="mm-input-unit">
                            <label>Angkatan / Edisi</label>
                            <input
                                type="text"
                                name="angkatan"
                                value={form.angkatan}
                                onChange={handleInputChange}
                                placeholder="Contoh: 2024"
                            />
                        </div>

                        <div className="mm-input-unit full">
                            <label>Deskripsi Singkat / Sinopsis</label>
                            <textarea
                                name="description"
                                value={form.description}
                                onChange={handleInputChange}
                                rows="3"
                                placeholder="Tuliskan gambaran isi edisi ini..."
                            />
                        </div>

                        <div className="mm-sub-divider full">
                            <h4>Susunan Tim Redaksi</h4>
                        </div>

                        <div className="mm-input-unit">
                            <ProfileComboSelect
                                value={form.pimpinan_umum}
                                onChange={(val) => setForm({...form, pimpinan_umum: val})}
                                mode="text"
                                label="Pimpinan Umum"
                                placeholder="Pilih pimpinan umum..."
                            />
                        </div>
                        <div className="mm-input-unit">
                            <ProfileComboSelect
                                value={form.pimpinan_redaksi}
                                onChange={(val) => setForm({...form, pimpinan_redaksi: val})}
                                mode="text"
                                label="Pimpinan Redaksi"
                                placeholder="Pilih pimpinan redaksi..."
                            />
                        </div>
                        <div className="mm-input-unit">
                            <ProfileComboSelect
                                value={form.redaktur_pelaksana}
                                onChange={(val) => setForm({...form, redaktur_pelaksana: val})}
                                mode="text"
                                label="Redaktur Pelaksana"
                                placeholder="Pilih redaktur pelaksana..."
                            />
                        </div>
                        <div className="mm-input-unit">
                            <ProfileComboSelect
                                value={form.editor}
                                onChange={(val) => setForm({...form, editor: val})}
                                mode="text"
                                multiple={true}
                                label="Editor"
                                placeholder="Pilih editor..."
                            />
                        </div>
                        <div className="mm-input-unit">
                            <ProfileComboSelect
                                value={form.layouter}
                                onChange={(val) => setForm({...form, layouter: val})}
                                mode="text"
                                multiple={true}
                                label="Layouter"
                                placeholder="Pilih layouter..."
                            />
                        </div>
                        <div className="mm-input-unit">
                            <ProfileComboSelect
                                value={form.redaksi}
                                onChange={(val) => setForm({...form, redaksi: val})}
                                mode="text"
                                multiple={true}
                                label="Tim Redaksi"
                                placeholder="Pilih tim redaksi..."
                            />
                        </div>

                        <div className="mm-sub-divider full">
                            <h4>Ganti Berkas (Opsional)</h4>
                        </div>

                        <div className="mm-file-box">
                            <label><ImageIcon size={16} /> Ganti Cover Gambar</label>
                            <input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files[0])} />
                            {form.cover_url && !coverFile && <span className="mm-file-hint">Cover saat ini tersimpan ✓</span>}
                            {coverFile && <span className="mm-file-hint" style={{color: '#3b82f6'}}>File siap dikompres otomatis saat disimpan!</span>}
                        </div>

                        <div className="mm-file-box">
                            <label><FileText size={16} /> Ganti File PDF</label>
                            <input type="file" accept="application/pdf" onChange={(e) => setPdfFile(e.target.files[0])} />
                            {form.pdf_url && <span className="mm-file-hint">PDF saat ini tersimpan ✓</span>}
                        </div>
                    </div>

                    <div className="mm-edit-actions">
                        <button type="submit" disabled={loading} className="mm-btn-save">
                            {loading ? 'Menyimpan...' : (
                                <>
                                    <Save size={16} />
                                    <span>Simpan Perubahan</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            )}

            {/* MAGAZINE GRID VIEW */}
            {!editId && (
                <div className="mm-list-container">
                    {magazines.length === 0 ? (
                        <div className="mm-empty-state">
                            <BookOpen size={40} className="mm-empty-icon" />
                            <p>Belum ada edisi majalah yang diunggah.</p>
                            <span>Gunakan tombol (+) di pojok kanan bawah beranda untuk mengunggah edisi baru.</span>
                        </div>
                    ) : (
                        <div className="mm-grid">
                            {magazines.map((mag) => (
                                <div key={mag.id} className="mm-card">
                                    <div className="mm-cover-wrap">
                                        <img src={mag.cover_url} alt={mag.title} />
                                        <span className="mm-tag">{mag.jenis}</span>
                                    </div>
                                    <div className="mm-card-body">
                                        <h4>{mag.title}</h4>
                                        <span className="mm-meta">Angkatan {mag.angkatan || '-'}</span>
                                        <div className="mm-actions">
                                            <button
                                                onClick={() => handleEditClick(mag)}
                                                className="mm-action-btn edit"
                                                title="Sunting Terbitan"
                                            >
                                                <Edit3 size={14} />
                                                <span>Edit</span>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(mag.id)}
                                                className="mm-action-btn delete"
                                                title="Hapus Terbitan"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <style>{`
                .mm-container {
                    color: var(--text);
                    font-family: 'Poppins', sans-serif;
                }

                /* EDIT FORM */
                .mm-edit-card {
                    background: var(--bg);
                    border: 1px solid var(--border);
                    border-radius: 20px;
                    padding: 28px;
                    margin-bottom: 36px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
                }
                .mm-edit-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding-bottom: 20px;
                    border-bottom: 1px solid var(--border-muted);
                    margin-bottom: 24px;
                }
                .mm-edit-badge {
                    font-size: 0.72rem;
                    font-weight: 700;
                    color: #3b82f6;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .mm-edit-header h3 {
                    margin: 2px 0 0 0;
                    font-size: 1.2rem;
                    font-weight: 700;
                }
                .mm-btn-cancel-edit {
                    background: var(--bg-light);
                    border: 1px solid var(--border);
                    color: var(--text-muted);
                    padding: 8px 14px;
                    border-radius: 10px;
                    font-family: inherit;
                    font-size: 0.85rem;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .mm-btn-cancel-edit:hover {
                    color: var(--text);
                    background: var(--bg);
                }

                .mm-form-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 18px;
                }
                .mm-input-unit {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .mm-input-unit.full {
                    grid-column: 1 / -1;
                }
                .mm-input-unit label {
                    font-size: 0.8rem;
                    font-weight: 600;
                    color: var(--text-muted);
                }
                .req {
                    color: #ef4444;
                }
                .mm-input-unit input,
                .mm-input-unit select,
                .mm-input-unit textarea {
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
                .mm-input-unit input:focus,
                .mm-input-unit select:focus,
                .mm-input-unit textarea:focus {
                    outline: none;
                    border-color: #3b82f6;
                    background: var(--bg);
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                }
                .mm-sub-divider {
                    padding-top: 12px;
                    border-top: 1px dashed var(--border-muted);
                    margin-top: 8px;
                }
                .mm-sub-divider h4 {
                    margin: 0;
                    font-size: 0.95rem;
                    font-weight: 700;
                }
                .mm-file-box {
                    padding: 14px;
                    background: var(--bg-light);
                    border: 1px dashed var(--border);
                    border-radius: 12px;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .mm-file-box label {
                    font-size: 0.8rem;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .mm-file-hint {
                    font-size: 0.72rem;
                    color: #10b981;
                    font-weight: 600;
                }
                .mm-edit-actions {
                    display: flex;
                    justify-content: flex-end;
                    margin-top: 24px;
                    padding-top: 16px;
                    border-top: 1px solid var(--border-muted);
                }
                .mm-btn-save {
                    padding: 12px 28px;
                    border-radius: 12px;
                    border: none;
                    background: var(--text);
                    color: var(--bg);
                    font-family: inherit;
                    font-size: 0.9rem;
                    font-weight: 600;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    transition: all 0.2s;
                }
                .mm-btn-save:hover:not(:disabled) {
                    opacity: 0.9;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
                }

                /* GRID CARDS */
                .mm-empty-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 60px 20px;
                    text-align: center;
                    border: 1px dashed var(--border);
                    border-radius: 20px;
                    background: var(--bg-light);
                    color: var(--text-muted);
                    gap: 8px;
                }
                .mm-empty-icon {
                    opacity: 0.5;
                    margin-bottom: 8px;
                }
                .mm-empty-state p {
                    margin: 0;
                    font-size: 1.1rem;
                    font-weight: 600;
                    color: var(--text);
                }
                .mm-empty-state span {
                    font-size: 0.85rem;
                }

                .mm-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
                    gap: 24px;
                }
                .mm-card {
                    background: var(--bg);
                    border: 1px solid var(--border);
                    border-radius: 18px;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    transition: all 0.25s ease;
                    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02);
                }
                .mm-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.06);
                }
                .mm-cover-wrap {
                    position: relative;
                    aspect-ratio: 3/4;
                    overflow: hidden;
                    background: var(--bg-light);
                }
                .mm-cover-wrap img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transition: transform 0.4s ease;
                }
                .mm-card:hover .mm-cover-wrap img {
                    transform: scale(1.04);
                }
                .mm-tag {
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background: rgba(15, 23, 42, 0.85);
                    color: white;
                    padding: 4px 10px;
                    border-radius: 20px;
                    font-size: 0.7rem;
                    font-weight: 700;
                    letter-spacing: 0.3px;
                    backdrop-filter: blur(4px);
                }
                .mm-card-body {
                    padding: 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    flex: 1;
                }
                .mm-card-body h4 {
                    margin: 0;
                    font-size: 1rem;
                    font-weight: 700;
                    line-height: 1.35;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                .mm-meta {
                    font-size: 0.78rem;
                    color: var(--text-muted);
                }
                .mm-actions {
                    display: flex;
                    gap: 8px;
                    margin-top: auto;
                    padding-top: 12px;
                }
                .mm-action-btn {
                    padding: 9px;
                    border-radius: 10px;
                    font-family: inherit;
                    font-size: 0.82rem;
                    font-weight: 600;
                    border: none;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    transition: all 0.2s;
                }
                .mm-action-btn.edit {
                    flex: 1;
                    background: var(--bg-light);
                    border: 1px solid var(--border);
                    color: var(--text);
                }
                .mm-action-btn.edit:hover {
                    background: var(--text);
                    color: var(--bg);
                }
                .mm-action-btn.delete {
                    width: 36px;
                    background: rgba(239, 68, 68, 0.1);
                    color: #ef4444;
                }
                .mm-action-btn.delete:hover {
                    background: #ef4444;
                    color: white;
                }

                @media (max-width: 640px) {
                    .mm-form-grid {
                        grid-template-columns: 1fr;
                    }
                    .mm-grid {
                        grid-template-columns: repeat(2, 1fr);
                        gap: 14px;
                    }
                    .mm-card-body {
                        padding: 12px;
                    }
                    .mm-card-body h4 {
                        font-size: 0.88rem;
                    }
                }
            `}</style>
        </div>
    );
}