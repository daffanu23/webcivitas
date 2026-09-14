import React, { useState, useEffect } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { supabase } from '../lib/supabase';
import imageCompression from 'browser-image-compression';
import { Image as ImageIcon, X, Send, Save } from 'lucide-react';
import ProfileComboSelect from './ProfileComboSelect';

// Terima "Paket Data" dari Server (Astro)
const ArticleEditor = ({ serverUser, serverCategories, serverArticle, serverSelectedCategories }) => {
  const [user] = useState(serverUser);
  
  // State langsung diisi dari data Server (Tidak perlu loading lagi!)
  const [title, setTitle] = useState(serverArticle?.title || '');
  const [content, setContent] = useState(serverArticle?.content || ''); 
  const [coverUrl, setCoverUrl] = useState(serverArticle?.cover_url || ''); 
  const [status, setStatus] = useState(serverArticle?.status || 'draft');
  const [articleId, setArticleId] = useState(serverArticle?.id || null);
  const [editorId, setEditorId] = useState(serverArticle?.editor_id || null);
  const [layouterId, setLayouterId] = useState(serverArticle?.layouter_id || null);
  
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
        // Kompres & konversi ke WebP sebelum upload
        let fileToUpload = file;
        try {
            fileToUpload = await imageCompression(file, {
                maxSizeMB: 0.3,
                maxWidthOrHeight: 1280,
                useWebWorker: true,
                fileType: 'image/webp'
            });
        } catch (compressErr) {
            console.warn("Gagal mengompres gambar, upload file asli:", compressErr);
        }

        const baseName = file.name.replace(/\.[^/.]+$/, "").replace(/\s/g, '-');
        const fileName = `${Date.now()}-${baseName}.webp`;
        const { error } = await supabase.storage.from('news-images').upload(fileName, fileToUpload);
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
        editor_id: editorId || null, layouter_id: layouterId || null,
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
        <label className="label">Tim Produksi Berita</label>
        <div className="crew-grid">
            <ProfileComboSelect
                value={editorId}
                onChange={setEditorId}
                mode="id"
                label="Editor"
                placeholder="Pilih editor artikel..."
            />
            <ProfileComboSelect
                value={layouterId}
                onChange={setLayouterId}
                mode="id"
                label="Layouter"
                placeholder="Pilih layouter artikel..."
            />
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

      
    </div>
  );
};

export default ArticleEditor;
