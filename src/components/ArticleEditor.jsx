import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { supabase } from '../lib/supabase';
import { Image as ImageIcon, X, Send, Save } from 'lucide-react';

// KONFIGURASI TOOLBAR
const modules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    [{ 'font': [] }],
    ['bold', 'italic', 'underline', 'strike', 'blockquote'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'indent': '-1'}, { 'indent': '+1' }],
    [{ 'align': [] }],
    ['link', 'image'],
    ['clean']
  ],
};

const ArticleEditor = () => {
  // STATE UTAMA
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // STATE EDITOR
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [coverUrl, setCoverUrl] = useState(''); 
  const [status, setStatus] = useState('draft');
  const [articleId, setArticleId] = useState(null);
  
  // STATE UI
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  // --- 1. INIT DATA ---
  useEffect(() => {
    const initEditor = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            window.location.href = '/login';
            return;
        }
        setUser(session.user);

        const params = new URLSearchParams(window.location.search);
        const slug = params.get('slug');

        if (slug) {
            const { data } = await supabase
                .from('articles')
                .select('*')
                .eq('slug', slug)
                .eq('author_id', session.user.id)
                .single();
            
            if (data) {
                setTitle(data.title);
                setContent(data.content);
                setCoverUrl(data.cover_url || ''); 
                setStatus(data.status);
                setArticleId(data.id);
            }
        } else {
            // Load Local Storage (Draft Baru)
            const localTitle = localStorage.getItem('draft_title');
            const localContent = localStorage.getItem('draft_content');
            if (localTitle) setTitle(localTitle);
            if (localContent) setContent(localContent);
        }
        setLoading(false);
    };

    initEditor();
  }, []);

  // --- 2. LOGIC UPLOAD GAMBAR ---
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
        const fileExt = file.name.split('.').pop();
        const fileNameBase = file.name.replace(/\.[^/.]+$/, "").replace(/\s/g, '-');
        const fileName = `${Date.now()}-${fileNameBase}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
            .from('news-images')
            .upload(fileName, file, { cacheControl: '3600', upsert: false });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('news-images').getPublicUrl(fileName);
        setCoverUrl(data.publicUrl); 

    } catch (error) {
        alert('Gagal upload gambar: ' + error.message);
    } finally {
        setIsUploading(false);
    }
  };

  const removeImage = () => {
      setCoverUrl('');
  };

  // --- 3. AUTO SAVE LOCAL ---
  useEffect(() => {
    if (!loading && !articleId) {
        const timeout = setTimeout(() => {
            localStorage.setItem('draft_title', title);
            localStorage.setItem('draft_content', content);
        }, 1000);
        return () => clearTimeout(timeout);
    }
  }, [title, content, loading, articleId]);

  // --- 4. AUTO SAVE DB (DRAFT ONLY) ---
  useEffect(() => {
    const interval = setInterval(() => {
        // Auto-save hanya jika user sedang ngetik dan status bukan published/pending
        if (user && title && !loading && status === 'draft') {
             // Logic save diam-diam bisa ditaruh sini (optional)
        }
    }, 30000);
    return () => clearInterval(interval);
  }, [title, content, user, loading, status]);

  // --- FUNGSI SIMPAN UTAMA ---
  const handleSave = async (targetStatus) => {
    if (!title) return alert("Judul tidak boleh kosong!");
    if (targetStatus === 'pending' && !content) return alert("Isi berita tidak boleh kosong sebelum dikirim!");
    
    setIsSaving(true);

    const slugGen = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now();
    
    const payload = {
        title,
        content,
        cover_url: coverUrl,
        status: targetStatus, // 'draft' atau 'pending'
        slug: articleId ? undefined : slugGen,
        author_id: user.id,
        updated_at: new Date(),
    };
    
    if (articleId) delete payload.slug; 

    try {
        let result;
        if (articleId) {
            result = await supabase.from('articles').update(payload).eq('id', articleId).select().single();
        } else {
            result = await supabase.from('articles').insert([payload]).select().single();
        }

        if (result.error) throw result.error;

        if (result.data) {
            setArticleId(result.data.id);
            setLastSaved(new Date());
            setStatus(targetStatus);
            
            // JIKA SUBMIT (PENDING) -> SELESAI
            if (targetStatus === 'pending') {
                localStorage.removeItem('draft_title');
                localStorage.removeItem('draft_content');
                alert('Berita berhasil dikirim ke meja redaksi untuk diperiksa!');
                window.location.href = '/'; 
            } else {
                // JIKA DRAFT -> Tetap di halaman
                // alert('Draft disimpan.');
            }
        }
    } catch (error) {
        alert("Gagal menyimpan: " + error.message);
    } finally {
        setIsSaving(false);
    }
  };

  if (loading) return <div style={{padding: 50, textAlign:'center'}}>Memuat Editor...</div>;

  return (
    <div className="editor-container">
      {/* HEADER */}
      <div className="editor-header">
        <div>
            <h2 className="page-title">{articleId ? 'Edit Berita' : 'Tulis Berita'}</h2>
            {lastSaved && <p className="save-status">Disimpan: {lastSaved.toLocaleTimeString()}</p>}
        </div>
        <div className="action-buttons">
            <button className="btn-cancel" onClick={() => window.history.back()}>
                <X size={18} /> Batal
            </button>
            
            {/* TOMBOL SAVE DRAFT */}
            <button className="btn-draft" onClick={() => handleSave('draft')} disabled={isSaving}>
                <Save size={18} />
                {isSaving ? 'Menyimpan...' : 'Simpan Draft'}
            </button>
            
            {/* TOMBOL KIRIM KE ADMIN (PENDING) */}
            <button className="btn-submit" onClick={() => handleSave('pending')} disabled={isSaving}>
                <Send size={18} />
                Kirim ke Redaksi
            </button>
        </div>
      </div>

      {/* INPUT JUDUL */}
      <div className="form-group">
        <label className="label">Judul Headline</label>
        <input 
            type="text" className="input-title" placeholder="Judul Berita yang Menarik..." 
            value={title} onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      {/* INPUT COVER IMAGE */}
      <div className="form-group">
        <label className="label">Gambar Sampul</label>
        
        {!coverUrl ? (
            <div className="upload-box">
                <input 
                    type="file" accept="image/*" id="cover-upload" 
                    onChange={handleImageUpload} disabled={isUploading} className="hidden-input"
                />
                <label htmlFor="cover-upload" className="upload-label">
                    {isUploading ? <span>Mengupload...</span> : (
                        <>
                            <ImageIcon size={24} />
                            <span>Klik untuk upload gambar sampul</span>
                        </>
                    )}
                </label>
            </div>
        ) : (
            <div className="preview-box">
                <img src={coverUrl} alt="Cover Preview" className="cover-preview" />
                <button onClick={removeImage} className="btn-remove-img" title="Hapus Gambar"><X size={16} /></button>
            </div>
        )}
      </div>

      {/* EDITOR */}
      <div className="form-group">
        <label className="label">Isi Berita</label>
        <div className="quill-wrapper">
            <ReactQuill theme="snow" value={content} onChange={setContent} modules={modules} placeholder="Mulai menulis..." />
        </div>
      </div>

      <style>{`
        .editor-container { max-width: 900px; margin: 0 auto; padding: 20px 0; padding-bottom: 100px; }
        .editor-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 1px solid var(--border); padding-bottom: 20px; }
        .page-title { font-size: 1.5rem; font-weight: 700; color: var(--text); margin: 0; }
        .save-status { font-size: 0.8rem; color: var(--text-muted); margin: 5px 0 0 0; }
        
        .action-buttons { display: flex; gap: 10px; }
        .action-buttons button { display: flex; align-items: center; gap: 6px; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-size: 0.9rem; }
        
        .btn-cancel { background: transparent; border: 1px solid var(--border); color: var(--text-muted); }
        .btn-cancel:hover { background: var(--bg-light); color: var(--text); }
        
        .btn-draft { background: var(--bg-light); border: 1px solid var(--border); color: var(--text); }
        .btn-draft:hover { border-color: var(--text); }

        .btn-submit { background: var(--text); border: 1px solid var(--text); color: var(--bg); }
        .btn-submit:hover { opacity: 0.9; transform: translateY(-1px); }
        
        .form-group { margin-bottom: 25px; }
        .label { display: block; margin-bottom: 10px; font-weight: 600; color: var(--text-muted); }
        .input-title { width: 100%; padding: 15px; font-size: 1.5rem; font-weight: 700; background: var(--bg-light); border: 1px solid var(--border); color: var(--text); border-radius: 12px; }
        .input-title:focus { outline: 2px solid var(--text); }

        /* UPLOAD STYLE */
        .hidden-input { display: none; }
        .upload-box { border: 2px dashed var(--border); border-radius: 12px; background: var(--bg-light); transition: border-color 0.2s; }
        .upload-box:hover { border-color: var(--text); }
        .upload-label { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 40px; cursor: pointer; color: var(--text-muted); font-weight: 500; }
        .preview-box { position: relative; border-radius: 12px; overflow: hidden; border: 1px solid var(--border); max-height: 400px; }
        .cover-preview { width: 100%; height: 100%; object-fit: cover; display: block; }
        .btn-remove-img { position: absolute; top: 15px; right: 15px; background: rgba(0,0,0,0.6); color: white; border: none; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .btn-remove-img:hover { background: #ef4444; }

        .quill-wrapper { background: var(--bg-light); border-radius: 12px; overflow: hidden; border: 1px solid var(--border); }
        .ql-toolbar { background: var(--bg-light); border-bottom: 1px solid var(--border) !important; border: none !important; }
        .ql-container { border: none !important; min-height: 400px; font-size: 1.1rem; }
        .ql-editor { color: var(--text); min-height: 400px; padding: 20px; } 
        .ql-stroke { stroke: var(--text) !important; } 
        .ql-fill { fill: var(--text) !important; } 
        .ql-picker { color: var(--text) !important; }
        
        @media (max-width: 600px) {
            .editor-header { flex-direction: column; align-items: flex-start; gap: 15px; }
            .action-buttons { width: 100%; justify-content: space-between; }
            .action-buttons button { flex: 1; justify-content: center; padding: 12px; }
            .btn-draft span { display: none; } /* Hide text on mobile if needed */
        }
      `}</style>
    </div>
  );
};

export default ArticleEditor;