import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Instagram, Upload, PlusCircle, Trash2, RefreshCw, ArrowLeftCircle } from 'lucide-react';

export default function AdminInstagramPromo() {
    const [promos, setPromos] = useState([]);
    const [newPromo, setNewPromo] = useState({ image_url: '', link_url: '', caption: '', file: null });
    const [isUploading, setIsUploading] = useState(false);

    const fetchData = async () => {
        const { data } = await supabase
            .from('ig_promos')
            .select('*')
            .order('created_at', { ascending: false }) 
            .limit(8);
        setPromos(data || []);
    };

    useEffect(() => { fetchData(); }, []);

    const handleNewPromoImage = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setNewPromo(prev => ({ ...prev, file, image_url: URL.createObjectURL(file) }));
    };

    const submitNewPromo = async () => {
        if (!newPromo.file && !newPromo.image_url) return alert("Pilih gambar!");
        setIsUploading(true);
        try {
            let finalImageUrl = newPromo.image_url;
            if (newPromo.file) {
                const fileName = `promo-${Date.now()}.${newPromo.file.name.split('.').pop()}`;
                await supabase.storage.from('news-images').upload(fileName, newPromo.file);
                finalImageUrl = supabase.storage.from('news-images').getPublicUrl(fileName).data.publicUrl;
            }

            await supabase.from('ig_promos').insert({
                image_url: finalImageUrl,
                link_url: newPromo.link_url,
                caption: newPromo.caption
            });

            setNewPromo({ image_url: '', link_url: '', caption: '', file: null });
            fetchData();
            alert("Berhasil!");
        } catch (error) { alert(error.message); }
        finally { setIsUploading(false); }
    };

    const deletePromo = async (id) => {
        if(!confirm("Hapus?")) return;
        await supabase.from('ig_promos').delete().eq('id', id);
        fetchData();
    };

    return (
        <div className="promo-container">
            <div className="promo-grid-layout">
                {/* LEFT: FORM */}
                <div className="promo-card form-card">
                    <div className="card-header">
                        <h3><PlusCircle size={18}/> Tambah Postingan Baru</h3>
                    </div>
                    <div className="form-content">
                        <label className={`upload-area ${newPromo.image_url ? 'has-img' : ''}`}>
                            {newPromo.image_url ? (
                                <img src={newPromo.image_url} />
                            ) : (
                                <div className="up-placeholder"><Upload size={32}/><span>Upload (4:5)</span></div>
                            )}
                            <input type="file" onChange={handleNewPromoImage} hidden />
                        </label>
                        
                        <div className="fields">
                            <div className="field-group">
                                <label>Caption</label>
                                <textarea 
                                    value={newPromo.caption} 
                                    onChange={(e) => setNewPromo({...newPromo, caption: e.target.value})}
                                    placeholder="Tulis caption..."
                                />
                            </div>
                            <div className="field-group">
                                <label>Link Postingan</label>
                                <input 
                                    type="text" 
                                    value={newPromo.link_url} 
                                    onChange={(e) => setNewPromo({...newPromo, link_url: e.target.value})}
                                    placeholder="https://..."
                                />
                            </div>
                            <button onClick={submitNewPromo} disabled={isUploading} className="btn-save-promo">
                                {isUploading ? <RefreshCw className="spin" /> : 'Tayangkan'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* RIGHT: LIST */}
                <div className="promo-list">
                    <div className="list-header"><h3>Status Etalase</h3></div>
                    <div className="display-grid">
                        {promos.map((item, idx) => (
                            <div key={item.id} className="display-card">
                                <div className="card-top">
                                    <span className="idx">#{idx+1}</span>
                                    <button onClick={() => deletePromo(item.id)} className="del-btn"><Trash2 size={14}/></button>
                                </div>
                                <img src={item.image_url} />
                                <div className="card-bot">
                                    <p>{item.caption}</p>
                                    <a href={item.link_url} target="_blank">Lihat IG</a>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <style>{`
                .promo-grid-layout { display: grid; grid-template-columns: 350px 1fr; gap: 30px; align-items: start; }
                .promo-card { background: #fff; border: 1px solid var(--admin-border); border-radius: 16px; overflow: hidden; }
                .card-header, .list-header { padding: 20px; border-bottom: 1px solid #f1f5f9; }
                .card-header h3, .list-header h3 { margin: 0; font-size: 1rem; font-weight: 700; }
                .form-content { padding: 20px; }
                .upload-area { display: block; width: 100%; aspect-ratio: 4/5; background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; cursor: pointer; overflow: hidden; margin-bottom: 20px; }
                .upload-area img { width: 100%; height: 100%; object-fit: cover; }
                .up-placeholder { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; color: #64748b; font-weight: 600; font-size: 0.9rem; }
                .fields { display: flex; flex-direction: column; gap: 15px; }
                .field-group label { display: block; font-size: 0.8rem; font-weight: 700; color: #64748b; margin-bottom: 6px; }
                .field-group input, .field-group textarea { width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; font-family: inherit; font-size: 0.9rem; }
                .btn-save-promo { background: #dc2626; color: white; border: none; padding: 12px; border-radius: 8px; font-weight: 700; cursor: pointer; margin-top: 10px; }
                
                .display-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 20px; }
                .display-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; }
                .card-top { padding: 10px; display: flex; justify-content: space-between; align-items: center; }
                .idx { font-size: 0.7rem; font-weight: 800; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; }
                .del-btn { border: none; background: #fee2e2; color: #dc2626; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; }
                .display-card img { width: 100%; aspect-ratio: 4/5; object-fit: cover; }
                .card-bot { padding: 12px; flex: 1; display: flex; flex-direction: column; justify-content: space-between; }
                .card-bot p { font-size: 0.8rem; margin: 0 0 10px 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
                .card-bot a { font-size: 0.75rem; font-weight: 700; color: #3b82f6; }

                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { 100% { transform: rotate(360deg); } }

                @media (max-width: 900px) { .promo-grid-layout { grid-template-columns: 1fr; } }
            `}</style>
        </div>
    );
}
