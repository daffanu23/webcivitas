import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { supabase } from '../lib/supabase';
import { Image as ImageIcon, X } from 'lucide-react';

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
  const [coverUrl, setCoverUrl] = useState(''); // <--- STATE BARU: URL GAMBAR
  const [status, setStatus] = useState('draft');
  const [articleId, setArticleId] = useState(null);
  
  // STATE UI
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false); // <--- Loading Upload
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
                setCoverUrl(data.cover_url || ''); // Load Cover URL
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

  // --- 2. LOGIC UPLOAD GAMBAR (PERBAIKAN) ---
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
        // 1. SANITASI NAMA FILE (Ikuti gaya kode LAMA: spasi jadi strip)
        const fileExt = file.name.split('.').pop();
        const fileNameBase = file.name.replace(/\.[^/.]+$/, "").replace(/\s/g, '-');
        const fileName = `${Date.now()}-${fileNameBase}.${fileExt}`;
        
        console.log("Mengupload:", fileName); // Cek Console

        // 2. UPLOAD KE SUPABASE
        const { error: uploadError } = await supabase.storage
            .from('news-images')
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) throw uploadError;

        // 3. AMBIL PUBLIC URL
        const { data } = supabase.storage
            .from('news-images')
            .getPublicUrl(fileName);

        const publicUrl = data.publicUrl;
        
        console.log("URL Gambar:", publicUrl); // Cek apakah URL valid

        // 4. SET STATE
        setCoverUrl(publicUrl); 

    } catch (error) {
        console.error("Upload Error:", error);
        alert('Gagal upload gambar: ' + error.message);
    } finally {
        setIsUploading(false);
    }
  };

  // Hapus Gambar
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

  // --- 4. AUTO SAVE DB (Setiap 30 detik) ---
  useEffect(() => {
    const interval = setInterval(() => {
        if (user && title && !loading) {
             // Logic save diam-diam (Silent Save) bisa ditaruh sini
        }
    }, 30000);
    return () => clearInterval(interval);
  }, [title, content, user, loading]);

  // --- FUNGSI SIMPAN ---
  const handleSave = async (newStatus) => {
    if (!title) return alert("Judul tidak boleh kosong!");
    setIsSaving(true);

    const slugGen = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now();
    
    const payload = {
        title,
        content,
        cover_url: coverUrl, // <--- SIMPAN URL GAMBAR
        status: newStatus,
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
            
            if (newStatus === 'published') {
                localStorage.removeItem('draft_title');
                localStorage.removeItem('draft_content');
                alert('Berita berhasil diterbitkan!');
                window.location.href = '/'; 
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
            <button className="btn-cancel" onClick={() => window.history.back()}>Cancel</button>
            <button className="btn-draft" onClick={() => handleSave('draft')}>
                {isSaving ? 'Saving...' : 'Save Draft'}
            </button>
            <button className="btn-publish" onClick={() => handleSave('published')}>Publish</button>
        </div>
      </div>

      {/* INPUT JUDUL */}
      <div className="form-group">
        <label className="label">Judul</label>
        <input 
            type="text" className="input-title" placeholder="Judul Berita" 
            value={title} onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      {/* INPUT COVER IMAGE (BARU) */}
      <div className="form-group">
        <label className="label">Gambar Sampul (Cover)</label>
        
        {!coverUrl ? (
            <div className="upload-box">
                <input 
                    type="file" 
                    accept="image/*" 
                    id="cover-upload" 
                    onChange={handleImageUpload}
                    disabled={isUploading}
                    className="hidden-input"
                />
                <label htmlFor="cover-upload" className="upload-label">
                    {isUploading ? (
                        <span>Mengupload...</span>
                    ) : (
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
                <button onClick={removeImage} className="btn-remove-img" title="Hapus Gambar">
                    <X size={16} />
                </button>
            </div>
        )}
      </div>

      {/* EDITOR */}
      <div className="form-group">
        <label className="label">Artikel</label>
        <div className="quill-wrapper">
            <ReactQuill theme="snow" value={content} onChange={setContent} modules={modules} placeholder="Mulai menulis cerita anda..." />
        </div>
      </div>

      <style>{`
        .editor-container { max-width: 900px; margin: 0 auto; padding: 20px 0; padding-bottom: 100px; }
        .editor-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 1px solid var(--border); padding-bottom: 20px; }
        .page-title { font-size: 1.5rem; font-weight: 700; color: var(--text); margin: 0; }
        .save-status { font-size: 0.8rem; color: var(--text-muted); margin: 5px 0 0 0; }
        .action-buttons { display: flex; gap: 10px; }
        .btn-cancel { padding: 10px 20px; background: transparent; border: 1px solid var(--danger); color: var(--danger); border-radius: 8px; font-weight: 600; cursor: pointer; }
        .btn-draft { padding: 10px 20px; background: var(--bg-light); border: 1px solid var(--border); color: var(--text); border-radius: 8px; font-weight: 600; cursor: pointer; }
        .btn-publish { padding: 10px 20px; background: var(--success); border: none; color: white; border-radius: 8px; font-weight: 600; cursor: pointer; }
        
        .form-group { margin-bottom: 25px; }
        .label { display: block; margin-bottom: 10px; font-weight: 600; color: var(--text-muted); }
        .input-title { width: 100%; padding: 15px; font-size: 1.2rem; font-weight: 600; background: var(--bg-light); border: 1px solid var(--border); color: var(--text); border-radius: 12px; }
        .input-title:focus { outline: 2px solid var(--border); }

        /* UPLOAD STYLE */
        .hidden-input { display: none; }
        .upload-box { 
            border: 2px dashed var(--border); border-radius: 12px; background: var(--bg-light);
            transition: border-color 0.2s;
        }
        .upload-box:hover { border-color: var(--text); }
        .upload-label {
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            gap: 10px; padding: 40px; cursor: pointer; color: var(--text-muted); font-weight: 500;
        }
        .preview-box { position: relative; border-radius: 12px; overflow: hidden; border: 1px solid var(--border); max-height: 300px; }
        .cover-preview { width: 100%; height: 100%; object-fit: cover; display: block; }
        .btn-remove-img {
            position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.6); color: white;
            border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer;
            display: flex; align-items: center; justify-content: center; transition: background 0.2s;
        }
        .btn-remove-img:hover { background: var(--danger); }

        .quill-wrapper { background: var(--bg-light); border-radius: 12px; overflow: hidden; border: 1px solid var(--border); }
        .ql-toolbar { background: var(--bg-light); border-bottom: 1px solid var(--border) !important; border: none !important; }
        .ql-container { border: none !important; min-height: 400px; font-size: 1.1rem; }
        .ql-editor { color: var(--text); min-height: 400px; } 
        .ql-stroke { stroke: var(--text) !important; } 
        .ql-fill { fill: var(--text) !important; } 
        .ql-picker { color: var(--text) !important; }
      `}</style>
    </div>
  );
};

export default ArticleEditor;