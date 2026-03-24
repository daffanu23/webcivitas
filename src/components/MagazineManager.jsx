import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Upload, FileText, Image as ImageIcon, Save, Trash2, BookOpen, Edit, X } from 'lucide-react';

export default function MagazineManager({ userId }) {
    const [magazines, setMagazines] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editId, setEditId] = useState(null); // Menyimpan ID jika sedang mode edit
    
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
        setForm({ ...mag }); // Isi form dengan data yang sudah ada
        setCoverFile(null);  // Kosongkan file input
        setPdfFile(null);
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll otomatis ke atas
    };

    const handleCancelEdit = () => {
        setEditId(null);
        setForm(initialForm);
        setCoverFile(null);
        setPdfFile(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title) {
            alert("Judul Wajib Diisi!"); return;
        }
        // Jika buat baru (bukan edit), cover & PDF wajib diisi
        if (!editId && (!coverFile || !pdfFile)) {
            alert("Cover Image dan File PDF Wajib Diisi untuk edisi baru!"); return;
        }

        setLoading(true);
        try {
            let finalCoverUrl = form.cover_url;
            let finalPdfUrl = form.pdf_url;

            // 1. Upload Cover (HANYA jika user memilih file baru)
            if (coverFile) {
                const coverExt = coverFile.name.split('.').pop();
                const coverName = `cover-${Date.now()}.${coverExt}`;
                const { error: coverErr } = await supabase.storage.from('magazine_covers').upload(coverName, coverFile);
                if (coverErr) throw coverErr;
                finalCoverUrl = supabase.storage.from('magazine_covers').getPublicUrl(coverName).data.publicUrl;
            }

            // 2. Upload PDF (HANYA jika user memilih file baru)
            if (pdfFile) {
                const pdfExt = pdfFile.name.split('.').pop();
                const pdfName = `magazine-${Date.now()}.${pdfExt}`;
                const { error: pdfErr } = await supabase.storage.from('magazine_pdfs').upload(pdfName, pdfFile);
                if (pdfErr) throw pdfErr;
                finalPdfUrl = supabase.storage.from('magazine_pdfs').getPublicUrl(pdfName).data.publicUrl;
            }

            // 3. Payload Data
            const payload = {
                title: form.title, angkatan: form.angkatan, description: form.description, jenis: form.jenis,
                pimpinan_umum: form.pimpinan_umum, pimpinan_redaksi: form.pimpinan_redaksi, redaktur_pelaksana: form.redaktur_pelaksana,
                editor: form.editor, layouter: form.layouter, redaksi: form.redaksi,
                cover_url: finalCoverUrl, pdf_url: finalPdfUrl, uploaded_by: userId
            };

            // 4. Proses Insert atau Update
            if (editId) {
                const { error: updateErr } = await supabase.from('magazines').update(payload).eq('id', editId);
                if (updateErr) throw updateErr;
                alert("Data Berhasil Diperbarui!");
            } else {
                const { error: insertErr } = await supabase.from('magazines').insert([payload]);
                if (insertErr) throw insertErr;
                alert("Majalah Berhasil Diunggah!");
            }

            // Selesai -> Bersihkan Form
            handleCancelEdit();
            fetchMagazines();

        } catch (error) {
            alert("Error: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Yakin ingin menghapus dokumen ini dari database?")) return;
        await supabase.from('magazines').delete().eq('id', id);
        fetchMagazines();
    };

    return (
        <div className="magazine-manager">
            <h2><BookOpen className="inline-icon" /> Manajemen Edisi Khusus</h2>
            
            {/* FORM UPLOAD / EDIT */}
            <form onSubmit={handleSubmit} className={`upload-form-card ${editId ? 'editing-mode' : ''}`}>
                <div className="form-header">
                    <h3>{editId ? 'Edit Data Edisi Khusus' : 'Unggah Edisi Baru'}</h3>
                    {editId && <button type="button" onClick={handleCancelEdit} className="btn-cancel"><X size={16}/> Batal Edit</button>}
                </div>
                
                <div className="form-grid">
                    <div className="form-group full-width">
                        <label>Judul Terbitan *</label>
                        <input type="text" name="title" value={form.title} onChange={handleInputChange} required placeholder="Contoh: Kepulan Asap di Malang" />
                    </div>
                    <div className="form-group">
                        <label>Jenis Terbitan *</label>
                        <select name="jenis" value={form.jenis} onChange={handleInputChange} className="styled-select" required>
                            <option value="Majalah">Majalah</option>
                            <option value="Tabloid">Tabloid</option>
                            <option value="Wartabasement">Wartabasement</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Angkatan *</label>
                        <input type="text" name="angkatan" value={form.angkatan} onChange={handleInputChange} required placeholder="Contoh: 2024" />
                    </div>
                    <div className="form-group full-width">
                        <label>Deskripsi Singkat / Sinopsis</label>
                        <textarea name="description" value={form.description} onChange={handleInputChange} rows="3" placeholder="Ceritakan highlight liputan ini..."></textarea>
                    </div>

                    <h4 className="full-width mt-4">Susunan Redaksi (Untuk Arsip)</h4>
                    <div className="form-group"><label>Pimpinan Umum</label><input type="text" name="pimpinan_umum" value={form.pimpinan_umum} onChange={handleInputChange} /></div>
                    <div className="form-group"><label>Pimpinan Redaksi</label><input type="text" name="pimpinan_redaksi" value={form.pimpinan_redaksi} onChange={handleInputChange} /></div>
                    <div className="form-group"><label>Redaktur Pelaksana</label><input type="text" name="redaktur_pelaksana" value={form.redaktur_pelaksana} onChange={handleInputChange} /></div>
                    <div className="form-group"><label>Editor</label><input type="text" name="editor" value={form.editor} onChange={handleInputChange} /></div>
                    <div className="form-group"><label>Layouter</label><input type="text" name="layouter" value={form.layouter} onChange={handleInputChange} /></div>
                    <div className="form-group"><label>Redaksi (Tim)</label><input type="text" name="redaksi" value={form.redaksi} onChange={handleInputChange} placeholder="Nama tim..." /></div>

                    <h4 className="full-width mt-4">File Dokumen {editId && '(Kosongkan jika tidak ingin mengubah file)'}</h4>
                    <div className="form-group file-upload-box">
                        <label><ImageIcon size={18}/> Cover Majalah (Image) {!editId && '*'}</label>
                        <input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files[0])} />
                        {editId && form.cover_url && <span className="helper-text">Cover saat ini sudah tersimpan.</span>}
                    </div>
                    <div className="form-group file-upload-box">
                        <label><FileText size={18}/> File Dokumen (PDF) {!editId && '*'}</label>
                        <input type="file" accept="application/pdf" onChange={(e) => setPdfFile(e.target.files[0])} />
                        {editId && form.pdf_url && <span className="helper-text">PDF saat ini sudah tersimpan.</span>}
                    </div>
                </div>

                <div className="form-actions">
                    <button type="submit" disabled={loading} className="btn-submit">
                        {loading ? 'Memproses...' : editId ? <><Save size={18}/> Simpan Perubahan</> : <><Upload size={18}/> Publikasikan</>}
                    </button>
                </div>
            </form>

            {/* LIST MAJALAH */}
            <div className="magazine-list-section">
                <h3>Arsip Terpublikasi</h3>
                <div className="magazine-grid">
                    {magazines.map(mag => (
                        <div key={mag.id} className="mag-card">
                            <img src={mag.cover_url} alt={mag.title} />
                            <div className="mag-info">
                                <span className="mag-type">{mag.jenis}</span>
                                <h4>{mag.title}</h4>
                                <span className="mag-meta">Angkatan {mag.angkatan}</span>
                                <div className="mag-actions">
                                    <button onClick={() => handleEditClick(mag)} className="btn-edit-small"><Edit size={14}/> Edit</button>
                                    <button onClick={() => handleDelete(mag.id)} className="btn-delete-small"><Trash2 size={14}/></button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {magazines.length === 0 && <p className="empty-text">Belum ada dokumen yang diunggah.</p>}
                </div>
            </div>

            <style>{`
                .magazine-manager { font-family: 'Poppins', sans-serif; color: var(--text); padding-bottom: 50px; }
                .inline-icon { display: inline-block; vertical-align: middle; margin-right: 10px; margin-bottom: 4px; }
                h2 { font-size: 1.8rem; margin-bottom: 30px; }
                
                .upload-form-card { background: var(--bg-light); border: 1px solid var(--border); padding: 30px; border-radius: 16px; margin-bottom: 40px; transition: all 0.3s; }
                .upload-form-card.editing-mode { border: 2px dashed #3b82f6; background: rgba(59, 130, 246, 0.02); }
                
                .form-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid var(--border); padding-bottom: 10px; }
                .form-header h3 { margin: 0; }
                .btn-cancel { background: transparent; border: 1px solid var(--text); padding: 6px 12px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 6px; font-weight: 600; font-size: 0.85rem;}
                
                .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                .full-width { grid-column: 1 / -1; }
                .mt-4 { margin-top: 20px; border-bottom: 1px dashed var(--border); padding-bottom: 10px; color: var(--text-muted); }
                
                .form-group label { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; font-weight: 600; margin-bottom: 8px; color: var(--text-muted); }
                .form-group input[type="text"], .form-group textarea, .styled-select { width: 100%; padding: 12px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg); color: var(--text); font-family: inherit; }
                .styled-select { cursor: pointer; }
                
                .file-upload-box { background: rgba(0,0,0,0.03); padding: 15px; border-radius: 8px; border: 1px dashed var(--border); }
                .helper-text { display: block; margin-top: 8px; font-size: 0.75rem; color: #10b981; font-weight: 600; }
                
                .form-actions { margin-top: 30px; display: flex; justify-content: flex-end; }
                .btn-submit { background: #dc2626; color: white; border: none; padding: 12px 30px; border-radius: 8px; font-weight: 600; font-size: 1rem; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: background 0.3s; }
                .btn-submit:hover:not(:disabled) { background: #b91c1c; }
                
                /* LIST */
                .magazine-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 20px; margin-top: 20px; }
                .mag-card { background: var(--bg-light); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; position: relative; }
                .mag-card img { width: 100%; height: 280px; object-fit: cover; border-bottom: 1px solid var(--border); }
                .mag-type { position: absolute; top: 10px; right: 10px; background: #dc2626; color: white; padding: 4px 10px; border-radius: 4px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; }
                .mag-info { padding: 15px; }
                .mag-info h4 { margin: 0 0 5px 0; font-size: 1rem; line-height: 1.3; }
                .mag-meta { font-size: 0.8rem; color: var(--text-muted); display: block; margin-bottom: 15px;}
                .mag-actions { display: flex; gap: 10px; }
                .btn-edit-small { flex: 1; background: var(--text); color: var(--bg); border: none; padding: 8px; border-radius: 4px; cursor: pointer; font-size: 0.8rem; display: flex; align-items: center; justify-content: center; gap: 4px; font-weight: 600; }
                .btn-delete-small { background: #dc2626; color: white; border: none; padding: 8px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center;}
                
                @media (max-width: 768px) { .form-grid { grid-template-columns: 1fr; } }
            `}</style>
        </div>
    );
}