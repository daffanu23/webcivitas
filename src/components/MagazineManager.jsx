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

            
        </div>
    );
}
