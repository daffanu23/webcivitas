import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
    FileText, 
    BookOpen, 
    Instagram, 
    LogOut, 
    ChevronRight,
    User,
    Menu,
    X,
    LayoutDashboard
} from 'lucide-react';

import AdminMejaRedaksi from './admin/AdminMejaRedaksi';
import AdminInstagramPromo from './admin/AdminInstagramPromo';
import AdminMagazineManager from './MagazineManager'; 

export default function AdminPanel({ serverCategories, serverArticles, userId }) {
    const [activeTab, setActiveTab] = useState('redaksi');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const menuItems = [
        { id: 'redaksi', label: 'Meja Redaksi', icon: <FileText size={18} /> },
        { id: 'magazines', label: 'Edisi Khusus', icon: <BookOpen size={18} /> },
        { id: 'instagram', label: 'Promo Instagram', icon: <Instagram size={18} /> },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'redaksi': return <AdminMejaRedaksi serverCategories={serverCategories} serverArticles={serverArticles} />;
            case 'magazines': return <AdminMagazineManager userId={userId} />;
            case 'instagram': return <AdminInstagramPromo />;
            default: return <AdminMejaRedaksi serverCategories={serverCategories} serverArticles={serverArticles} />;
        }
    };

    return (
        <div className={`admin-portal ${isSidebarOpen ? 'sb-open' : 'sb-closed'}`}>
            {/* SIDEBAR: Mengikuti style Navbar Anda */}
            <aside className="portal-sidebar">
                <div className="sb-inner">
                    <div className="sb-nav-group">
                        <span className="sb-label">Navigasi Admin</span>
                        {menuItems.map((item) => (
                            <button 
                                key={item.id}
                                className={`sb-link ${activeTab === item.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(item.id)}
                            >
                                <span className="sb-icon">{item.icon}</span>
                                <span className="sb-text">{item.label}</span>
                                {activeTab === item.id && <div className="sb-active-indicator" />}
                            </button>
                        ))}
                    </div>

                    <div className="sb-nav-group mt-auto">
                        <span className="sb-label">Sistem</span>
                        <a href="/profile" className="sb-link">
                            <span className="sb-icon"><User size={18} /></span>
                            <span className="sb-text">Profil Saya</span>
                        </a>
                        <form action="/api/auth/logout" method="GET" style={{ width: '100%' }}>
                            <button type="submit" className="sb-link logout">
                                <span className="sb-icon"><LogOut size={18} /></span>
                                <span className="sb-text">Keluar Panel</span>
                            </button>
                        </form>
                    </div>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className="portal-main">
                <div className="portal-header">
                    <button className="sb-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
                        <span>Menu</span>
                    </button>
                    <div className="breadcrumb">
                        <LayoutDashboard size={14} />
                        <span className="sep">/</span>
                        <span className="current">{menuItems.find(i => i.id === activeTab)?.label}</span>
                    </div>
                </div>

                <div className="portal-body">
                    {renderContent()}
                </div>
            </main>

            <style>{`
                .admin-portal {
                    display: flex;
                    min-height: calc(100vh - 60px);
                    background-color: var(--bg);
                    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                }

                /* SIDEBAR - Integrasi dengan Navbar */
                .portal-sidebar {
                    width: 280px;
                    background-color: var(--bg);
                    border-right: 1px solid var(--border-muted);
                    position: sticky;
                    top: 60px;
                    height: calc(100vh - 60px);
                    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                    z-index: 50;
                }

                .sb-closed .portal-sidebar {
                    width: 0;
                    opacity: 0;
                    pointer-events: none;
                }

                .sb-inner {
                    padding: 30px 15px;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    gap: 40px;
                }

                .sb-nav-group { display: flex; flex-direction: column; gap: 4px; }
                .sb-label {
                    font-size: 0.65rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 1.5px;
                    color: var(--text-muted);
                    padding: 0 15px 10px 15px;
                    opacity: 0.6;
                }

                .sb-link {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 15px;
                    border-radius: 12px;
                    color: var(--text-muted);
                    font-weight: 500;
                    font-size: 0.9rem;
                    border: none;
                    background: transparent;
                    cursor: pointer;
                    transition: all 0.2s;
                    text-align: left;
                    position: relative;
                }

                .sb-link:hover {
                    color: var(--text);
                    background-color: var(--bg-light);
                }

                .sb-link.active {
                    color: var(--text);
                    background-color: var(--bg-light);
                    font-weight: 600;
                }

                .sb-active-indicator {
                    position: absolute;
                    left: 0;
                    width: 3px;
                    height: 16px;
                    background-color: #dc2626;
                    border-radius: 0 4px 4px 0;
                }

                .logout:hover { color: #dc2626; background: rgba(220, 38, 38, 0.05); }
                .mt-auto { margin-top: auto; }

                /* MAIN AREA */
                .portal-main {
                    flex: 1;
                    min-width: 0;
                    display: flex;
                    flex-direction: column;
                }

                .portal-header {
                    height: 50px;
                    padding: 0 30px;
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    border-bottom: 1px solid var(--border-muted);
                }

                .sb-toggle {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: var(--bg-light);
                    border: 1px solid var(--border);
                    padding: 6px 12px;
                    border-radius: 8px;
                    color: var(--text);
                    font-size: 0.75rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .sb-toggle:hover { border-color: var(--text); }

                .breadcrumb {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 0.8rem;
                    color: var(--text-muted);
                }
                .breadcrumb .sep { opacity: 0.3; }
                .breadcrumb .current { color: var(--text); font-weight: 600; }

                .portal-body {
                    padding: 40px;
                    max-width: 1300px;
                    width: 100%;
                    margin: 0 auto;
                    flex: 1;
                }

                @media (max-width: 1024px) {
                    .portal-sidebar {
                        position: fixed;
                        top: 60px;
                        left: -280px;
                        height: calc(100vh - 60px);
                    }
                    .sb-open .portal-sidebar { left: 0; box-shadow: 20px 0 50px rgba(0,0,0,0.1); }
                    .portal-body { padding: 20px; }
                }
            `}</style>
        </div>
    );
}
