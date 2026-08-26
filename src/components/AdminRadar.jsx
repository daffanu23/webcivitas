import React, { useState, useEffect } from 'react';
import { AlertCircle, Clock } from 'lucide-react';

export default function AdminRadar() {
    const [pendingArticles, setPendingArticles] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPending = async () => {
            try {
                const res = await fetch('/api/admin/pending-articles');
                if (!res.ok) {
                    // Not an admin or not logged in
                    setLoading(false);
                    return; 
                }
                const data = await res.json();
                setPendingArticles(data || []);
            } catch (err) {
                console.error("Error fetching pending articles:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchPending();
    }, []);

    if (loading) return null; 
    if (pendingArticles.length === 0) return null;

    return (
        <div className="admin-radar-section container">
            <div className="admin-radar-header">
                <div className="radar-title">
                    <AlertCircle size={20} />
                    <h3>Menunggu Persetujuan Anda</h3>
                </div>
                <span className="radar-badge">{pendingArticles.length} Draft</span>
            </div>
            
            <div className="radar-grid">
                {pendingArticles.map((item) => (
                    <a key={item.id} href={`/berita/${item.slug}`} className="radar-card">
                        <div className="radar-img-box">
                            <img src={item.cover_url} alt={item.title} />
                            <div className="radar-status">
                                <Clock size={12} /> Pending
                            </div>
                        </div>
                        <div className="radar-info">
                            <h4>{item.title}</h4>
                            <p>Oleh: {item.profiles?.full_name || 'Redaksi'}</p>
                        </div>
                    </a>
                ))}
            </div>
        </div>
    );
}
