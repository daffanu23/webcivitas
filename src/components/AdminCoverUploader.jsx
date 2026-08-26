import React, { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import imageCompression from 'browser-image-compression';
import { ImageIcon, RefreshCw, UploadCloud, CheckCircle } from 'lucide-react';

export default function AdminCoverUploader({ id, currentCoverUrl, type = 'article' }) {
    const [status, setStatus] = useState('idle'); // idle, compressing, uploading, success, error
    const [statusMessage, setStatusMessage] = useState('');
    const fileInputRef = useRef(null);

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            // 1. COMPRESS
            setStatus('compressing');
            setStatusMessage('Mengompres...');
            const compressedFile = await imageCompression(file, {
                maxSizeMB: 0.25, // Target max 250KB
                maxWidthOrHeight: 1200, // Dimensi pas untuk web
                useWebWorker: true,
                fileType: 'image/webp' // Konversi langsung ke webp di client!
            });

            const bucketName = type === 'article' ? 'news-images' : 'magazine_covers';
            const tableName = type === 'article' ? 'articles' : 'magazines';

            // 2. UPLOAD TO SUPABASE
            setStatus('uploading');
            setStatusMessage('Mengunggah...');
            const fileExt = 'webp'; 
            const fileName = `cover-${Date.now()}.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage
                .from(bucketName)
                .upload(fileName, compressedFile);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from(bucketName).getPublicUrl(fileName);
            const newCoverUrl = data.publicUrl;

            // 3. DELETE OLD COVER FROM SUPABASE STORAGE
            if (currentCoverUrl) {
                try {
                    const urlParts = currentCoverUrl.split('/');
                    const oldFileName = urlParts[urlParts.length - 1];
                    const decodedOldFileName = decodeURIComponent(oldFileName);
                    
                    if (decodedOldFileName) {
                        await supabase.storage.from(bucketName).remove([decodedOldFileName]);
                    }
                } catch (delErr) {
                    console.warn("Gagal menghapus cover lama:", delErr);
                }
            }

            // 4. UPDATE DB
            setStatusMessage('Menyimpan ke DB...');
            const { error: dbError } = await supabase
                .from(tableName)
                .update({ cover_url: newCoverUrl })
                .eq('id', id);

            if (dbError) throw dbError;

            // 5. FINISH
            setStatus('success');
            setStatusMessage('Berhasil!');
            
            // Reload page supaya gambar baru ter-load (cache akan ter-refresh)
            setTimeout(() => {
                window.location.reload();
            }, 1000);

        } catch (error) {
            console.error("Upload error:", error);
            setStatus('error');
            setStatusMessage('Gagal: ' + error.message);
            setTimeout(() => setStatus('idle'), 3000);
        }
    };

    return (
        <div className="admin-cover-uploader-wrapper">
            <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                style={{ display: 'none' }} 
            />
            
            <button 
                type="button"
                className={`btn-change-cover ${status !== 'idle' ? 'processing' : ''} ${status === 'success' ? 'success' : ''}`}
                onClick={() => status === 'idle' && fileInputRef.current?.click()}
                disabled={status !== 'idle' && status !== 'error'}
            >
                {status === 'idle' && (
                    <>
                        <ImageIcon size={16} />
                        <span>Ganti Cover</span>
                    </>
                )}
                {status === 'compressing' && (
                    <>
                        <RefreshCw size={16} className="spin" />
                        <span>Mengompres...</span>
                    </>
                )}
                {status === 'uploading' && (
                    <>
                        <UploadCloud size={16} className="pulse" />
                        <span>Mengunggah...</span>
                    </>
                )}
                {status === 'success' && (
                    <>
                        <CheckCircle size={16} />
                        <span>Selesai!</span>
                    </>
                )}
                {status === 'error' && (
                    <span>{statusMessage}</span>
                )}
            </button>

            <style>{`
                .admin-cover-uploader-wrapper {
                    position: absolute;
                    top: 15px;
                    right: 15px;
                    z-index: 50;
                }
                .btn-change-cover {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: rgba(15, 23, 42, 0.75);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    color: white;
                    border: 1px solid rgba(255,255,255,0.2);
                    padding: 8px 16px;
                    border-radius: 50px;
                    font-size: 0.85rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                }
                .btn-change-cover:hover:not(:disabled) {
                    background: rgba(15, 23, 42, 0.95);
                    transform: translateY(-2px);
                    border-color: rgba(255,255,255,0.4);
                }
                .btn-change-cover.processing {
                    background: #f59e0b;
                    color: white;
                    border-color: #f59e0b;
                }
                .btn-change-cover.success {
                    background: #10b981;
                    color: white;
                    border-color: #10b981;
                }
                @keyframes spin { 100% { transform: rotate(360deg); } }
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
                .spin { animation: spin 1s linear infinite; }
                .pulse { animation: pulse 1.5s ease-in-out infinite; }
            `}</style>
        </div>
    );
}
