import React, { useState, useEffect } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { supabase } from '../lib/supabase';
import { Image as ImageIcon, X, Send, Save } from 'lucide-react';

// Terima "Paket Data" dari Server (Astro)
const ArticleEditor = ({ serverUser, serverCategories, serverArticle, serverSelectedCategories }) => {
  const [user] = useState(serverUser);
  
  // State langsung diisi dari data Server (Tidak perlu loading lagi!)
  const [title, setTitle] = useState(serverArticle?.title || '');
  const [content, setContent] = useState(serverArticle?.content || ''); 
  const [coverUrl, setCoverUrl] = useState(serverArticle?.cover_url || ''); 
  const [status, setStatus] = useState(serverArticle?.status || 'draft');
  const [articleId, setArticleId] = useState(serverArticle?.id || null);
  
  const [availableCategories] = useState(serverCategories || []);
  const [selectedCategories, setSelectedCategories] = useState(serverSelectedCategories || []);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  // LOGIKA AUTOSAVE LOCALSTORAGE (Tetap dipertahankan karena ini fitur UX yang bagus!)
  useEffect(() => {
    if (!serverArticle) {
        // Jika buat berita baru, cek apakah ada draft di LocalStorage
        const localTitle = localStorage.getItem('draft_title');
        const localContent = localStorage.getItem('draft_content');
        if (localTitle) setTitle(localTitle);
        if (localContent) setContent(localContent);
    } else {
        // Jika sedang edit draft dari database, bersihkan snooze alert
        localStorage.removeItem(`snooze_draft_${serverArticle.id}`);
    }
  }, [serverArticle]);

  // Simpan otomatis ke LocalStorage setiap detik saat mengetik (hanya untuk berita baru)
  useEffect(() => {
    if (!articleId) {
        const timeout = setTimeout(() => {
            localStorage.setItem('draft_title', title);
            localStorage.setItem('draft_content', content);
        }, 1000);
        return () => clearTimeout(timeout);
    }
  }, [title, content, articleId]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${file.name.replace(/\.[^/.]+$/, "").replace(/\s/g, '-')}.${fileExt}`;
        const { error } = await supabase.storage.from('news-images').upload(fileName, file);
        if (error) throw error;
        const { data } = supabase.storage.from('news-images').getPublicUrl(fileName);
        setCoverUrl(data.publicUrl); 
    } catch (error) { alert('Upload error: ' + error.message); } 
    finally { setIsUploading(false); }
  };

  const removeImage = () => setCoverUrl('');

  const toggleCategory = (categoryId) => {
      setSelectedCategories(prev => 
          prev.includes(categoryId) 
          ? prev.filter(id => id !== categoryId) 
          : [...prev, categoryId]
      );
  };

  const handleSave = async (targetStatus) => {
    if (!title) return alert("Judul wajib diisi!");
    if (targetStatus === 'pending' && !content) return alert("Konten kosong!");
    if (targetStatus === 'pending' && selectedCategories.length === 0) return alert("Pilih minimal 1 kategori!");
    
    setIsSaving(true);

    const slugGen = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now();
    const payload = {
        title, content, cover_url: coverUrl, status: targetStatus,
        slug: articleId ? undefined : slugGen, author_id: user.id, updated_at: new Date(),
    };
    if (articleId) delete payload.slug; 

    try {
        let result = articleId 
            ? await supabase.from('articles').update(payload).eq('id', articleId).select().single()
            : await supabase.from('articles').insert([payload]).select().single();

        if (result.error) throw result.error;
        const newArticleId = result.data.id;

        if (newArticleId) {
            await supabase.from('article_categories').delete().eq('article_id', newArticleId);
            if (selectedCategories.length > 0) {
                const pivotInserts = selectedCategories.map(catId => ({ article_id: newArticleId, category_id: catId }));
                await supabase.from('article_categories').insert(pivotInserts);
            }
        }

        setArticleId(newArticleId); setLastSaved(new Date()); setStatus(targetStatus);
        
        if (targetStatus === 'pending') {
            localStorage.removeItem('draft_title'); localStorage.removeItem('draft_content');
            localStorage.removeItem(`snooze_draft_${newArticleId}`);
            alert('Terkirim ke redaksi!'); window.location.href = '/'; 
        }
    } catch (error) { alert("Error: " + error.message); } 
    finally { setIsSaving(false); }
  };

  return (
    <div className="editor-container">
      <div className="editor-header">
        <div><h2 className="page-title">{articleId ? 'Edit Berita' : 'Tulis Berita'}</h2>{lastSaved && <p className="save-status">Disimpan: {lastSaved.toLocaleTimeString()}</p>}</div>
        <div className="action-buttons">
            <button className="btn-cancel" onClick={() => window.history.back()}><X size={18} /> Batal</button>
            <button className="btn-draft" onClick={() => handleSave('draft')} disabled={isSaving}><Save size={18} /> {isSaving ? '...' : 'Draft'}</button>
            <button className="btn-submit" onClick={() => handleSave('pending')} disabled={isSaving}><Send size={18} /> Kirim</button>
        </div>
      </div>

      <div className="form-group">
        <label className="label">Judul Headline</label>
        <input type="text" className="input-title" placeholder="Judul Berita yang Menarik..." value={title} onChange={(e) => setTitle(e.target.value)}/>
      </div>

      <div className="form-group">
        <label className="label">Pilih Kategori (Bisa lebih dari 1)</label>
        <div className="category-grid">
            {availableCategories.map(cat => (
                <label key={cat.id} className={`cat-checkbox ${selectedCategories.includes(cat.id) ? 'active' : ''}`}>
                    <input 
                        type="checkbox" 
                        checked={selectedCategories.includes(cat.id)} 
                        onChange={() => toggleCategory(cat.id)}
                    />
                    <span>{cat.name}</span>
                </label>
            ))}
        </div>
      </div>

      <div className="form-group">
        <label className="label">Gambar Sampul</label>
        {!coverUrl ? (
            <div className="upload-box">
                <input type="file" accept="image/*" id="cover-upload" onChange={handleImageUpload} disabled={isUploading} className="hidden-input"/>
                <label htmlFor="cover-upload" className="upload-label">{isUploading ? <span>Uploading...</span> : <><ImageIcon size={24}/><span>Upload Cover</span></>}</label>
            </div>
        ) : (
            <div className="preview-box">
                <img src={coverUrl} alt="Cover Preview" className="cover-preview" />
                <button onClick={removeImage} className="btn-remove-img"><X size={16} /></button>
            </div>
        )}
      </div>

      <div className="form-group">
        <label className="label">Isi Berita (Markdown Mode)</label>
        <div className="markdown-wrapper">
            <MDEditor value={content} onChange={setContent} height={500} preview="edit" className="custom-md-editor" />
        </div>
        <p className="markdown-hint">Gunakan <b>**tebal**</b>, <i>*miring*</i>, atau <code># Judul Besar</code>. Klik logo mata di editor untuk melihat hasil.</p>
      </div>

      <style>{`
        /* CSS ANDA SAMA PERSIS 100%, HANYA DI POTONG DI SINI AGAR RAPI */
        .editor-container { max-width: 800px; margin: 0 auto; padding: 40px 20px 100px 20px; }
        .editor-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 1px solid var(--border); padding-bottom: 20px; }
        .page-title { font-size: 1.5rem; font-weight: 500; color: var(--text); margin: 0; }
        .save-status { font-size: 0.8rem; color: var(--text-muted); margin: 5px 0 0 0; }
        .action-buttons { display: flex; gap: 10px; }
        .action-buttons button { display: flex; align-items: center; gap: 6px; padding: 10px 20px; border-radius: 8px; font-weight: 500; cursor: pointer; font-size: 0.9rem; transition: all 0.2s; }
        .btn-cancel { background: transparent; border: 1px solid var(--border); color: var(--text); }
        .btn-draft { background: var(--bg-light); border: 1px solid var(--border); color: var(--text); }
        .btn-submit { background: var(--text); border: 1px solid var(--text); color: var(--bg); }
        .form-group { margin-bottom: 25px; }
        .label { display: block; margin-bottom: 10px; font-weight: 500; color: var(--text-muted); }
        .input-title { width: 100%; padding: 15px; font-size: 1.5rem; font-weight: 500; background: var(--bg-light); border: 1px solid var(--border); color: var(--text); border-radius: 12px; font-family: 'Poppins', sans-serif; transition: all 0.2s ease; }
        .input-title:focus { outline: none; border-color: var(--text); box-shadow: 0 0 0 1px var(--text); }
        .category-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
        .cat-checkbox { display: flex; align-items: center; gap: 10px; padding: 10px 15px; background: var(--bg-light); border: 1px solid var(--border); border-radius: 8px; cursor: pointer; font-size: 0.9rem; color: var(--text-muted); transition: all 0.2s ease; user-select: none; }
        .cat-checkbox input { accent-color: var(--text); width: 16px; height: 16px; cursor: pointer; }
        .cat-checkbox:hover { border-color: var(--text); color: var(--text); }
        .cat-checkbox.active { border-color: var(--text); background: var(--bg); color: var(--text); box-shadow: 0 0 0 1px var(--text); }
        .hidden-input { display: none; }
        .upload-box { border: 2px dashed var(--border); border-radius: 12px; background: var(--bg-light); padding: 40px; text-align: center; cursor: pointer; color: var(--text-muted); transition: all 0.2s ease; }
        .upload-box:hover, .upload-box:focus-within { border-color: var(--text); color: var(--text); background: var(--bg); }
        .upload-label { display: flex; flex-direction: column; align-items: center; gap: 10px; cursor: pointer; }
        .preview-box { position: relative; border-radius: 12px; overflow: hidden; border: 1px solid var(--border); max-height: 400px; }
        .cover-preview { width: 100%; height: 100%; object-fit: cover; display: block; }
        .btn-remove-img { position: absolute; top: 15px; right: 15px; background: rgba(0,0,0,0.6); color: white; border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; transition: background 0.2s; }
        .btn-remove-img:hover { background: #ef4444; }
        .markdown-wrapper { border-radius: 8px; overflow: hidden; border: 1px solid var(--border); transition: all 0.2s ease; }
        .markdown-wrapper:focus-within { border-color: var(--text); box-shadow: 0 0 0 1px var(--text); }
        .custom-md-editor.w-md-editor { background-color: var(--bg-light) !important; color: var(--text) !important; border: none !important; box-shadow: none !important; }
        .custom-md-editor .w-md-editor-toolbar { background-color: var(--bg-light) !important; border-bottom: 1px solid var(--border) !important; }
        .custom-md-editor .w-md-editor-toolbar li button { color: var(--text) !important; }
        .custom-md-editor .w-md-editor-toolbar li button:hover { background-color: var(--border) !important; color: var(--text) !important; }
        .custom-md-editor .w-md-editor-text-input, .custom-md-editor .w-md-editor-text-pre > code, .custom-md-editor .w-md-editor-text-pre { color: var(--text) !important; font-family: ui-monospace, SFMono-Regular, SF Mono, Consolas, Liberation Mono, Menlo, monospace !important; font-size: 0.95rem !important; line-height: 1.6 !important; }
        .custom-md-editor .wmde-markdown { background-color: var(--bg-light) !important; color: var(--text) !important; font-family: 'Poppins', sans-serif !important; font-size: 1rem !important; line-height: 1.8 !important; }
        .custom-md-editor .wmde-markdown h1, .custom-md-editor .wmde-markdown h2, .custom-md-editor .wmde-markdown h3 { font-weight: 600 !important; border-bottom: none !important; font-family: 'Poppins', sans-serif !important; }
        .markdown-hint { font-size: 0.8rem; color: var(--text-muted); margin-top: 8px; }
        @media (max-width: 600px) { .action-buttons button span { display: none; } }
      `}</style>
    </div>
  );
};

export default ArticleEditor;