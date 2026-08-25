import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { ChevronDown, Search, User, X, Type } from 'lucide-react';

/**
 * ProfileComboSelect — Searchable combo dropdown untuk memilih profil.
 *
 * Props:
 *   value       — UUID (mode='id') atau nama string (mode='text')
 *   onChange     — callback(newValue)
 *   mode         — 'id' | 'text'  (default 'id')
 *   label        — label di atas field
 *   placeholder  — placeholder teks
 */
export default function ProfileComboSelect({
    value = '',
    onChange,
    mode = 'id',
    label = 'Pilih Profil',
    placeholder = 'Cari atau ketik nama...',
}) {
    const [profiles, setProfiles] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [isManual, setIsManual] = useState(false);
    const [manualValue, setManualValue] = useState('');
    const containerRef = useRef(null);
    const inputRef = useRef(null);

    // Fetch profiles once
    useEffect(() => {
        const fetchProfiles = async () => {
            const { data } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url')
                .not('full_name', 'is', null)
                .order('full_name', { ascending: true });
            setProfiles(data || []);
        };
        fetchProfiles();
    }, []);

    // Determine display name from value
    const getDisplayName = useCallback(() => {
        if (!value) return '';
        if (mode === 'id') {
            const found = profiles.find(p => p.id === value);
            return found ? found.full_name : '';
        }
        return value; // mode text — value IS the name
    }, [value, mode, profiles]);

    // Detect manual mode on mount (for text mode, if value doesn't match any profile)
    useEffect(() => {
        if (mode === 'text' && value) {
            const found = profiles.find(p => p.full_name === value);
            if (!found && profiles.length > 0) {
                setIsManual(true);
                setManualValue(value);
            }
        }
    }, [value, profiles, mode]);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
                setSearch('');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const filteredProfiles = profiles.filter(p =>
        p.full_name?.toLowerCase().includes(search.toLowerCase())
    );

    const handleSelect = (profile) => {
        if (mode === 'id') {
            onChange(profile.id);
        } else {
            onChange(profile.full_name);
        }
        setIsManual(false);
        setManualValue('');
        setIsOpen(false);
        setSearch('');
    };

    const handleClear = (e) => {
        e.stopPropagation();
        onChange(mode === 'id' ? null : '');
        setIsManual(false);
        setManualValue('');
        setSearch('');
    };

    const handleManualToggle = () => {
        setIsManual(true);
        setIsOpen(false);
        setSearch('');
        // If there was a selected value, clear it
        if (value) {
            onChange(mode === 'id' ? null : '');
        }
        setTimeout(() => inputRef.current?.focus(), 50);
    };

    const handleManualChange = (e) => {
        const val = e.target.value;
        setManualValue(val);
        if (mode === 'text') {
            onChange(val);
        }
    };

    const handleBackToDropdown = () => {
        setIsManual(false);
        setManualValue('');
        onChange(mode === 'id' ? null : '');
    };

    const displayName = getDisplayName();
    const selectedProfile = mode === 'id' ? profiles.find(p => p.id === value) : null;

    return (
        <div className="pcs-container" ref={containerRef}>
            {label && <label className="pcs-label">{label}</label>}

            {isManual ? (
                /* MANUAL INPUT MODE */
                <div className="pcs-manual-wrap">
                    <input
                        ref={inputRef}
                        type="text"
                        className="pcs-manual-input"
                        placeholder="Ketik nama manual..."
                        value={manualValue}
                        onChange={handleManualChange}
                    />
                    <button
                        type="button"
                        className="pcs-manual-back"
                        onClick={handleBackToDropdown}
                        title="Kembali ke dropdown"
                    >
                        <ChevronDown size={14} />
                    </button>
                </div>
            ) : (
                /* DROPDOWN MODE */
                <div
                    className={`pcs-trigger ${isOpen ? 'open' : ''} ${value ? 'has-value' : ''}`}
                    onClick={() => { setIsOpen(!isOpen); }}
                >
                    <div className="pcs-trigger-content">
                        {value ? (
                            <div className="pcs-selected">
                                {selectedProfile?.avatar_url ? (
                                    <img src={selectedProfile.avatar_url} alt="" className="pcs-avatar-sm" />
                                ) : (
                                    <div className="pcs-avatar-placeholder"><User size={12} /></div>
                                )}
                                <span>{displayName}</span>
                            </div>
                        ) : (
                            <span className="pcs-placeholder">{placeholder}</span>
                        )}
                    </div>
                    <div className="pcs-trigger-actions">
                        {value && (
                            <button type="button" className="pcs-clear-btn" onClick={handleClear}>
                                <X size={13} />
                            </button>
                        )}
                        <ChevronDown size={15} className={`pcs-chevron ${isOpen ? 'rotated' : ''}`} />
                    </div>
                </div>
            )}

            {/* DROPDOWN PANEL */}
            {isOpen && !isManual && (
                <div className="pcs-dropdown">
                    <div className="pcs-search-wrap">
                        <Search size={14} className="pcs-search-icon" />
                        <input
                            type="text"
                            className="pcs-search-input"
                            placeholder="Cari nama..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>

                    <div className="pcs-list">
                        {filteredProfiles.length === 0 ? (
                            <div className="pcs-empty">Tidak ada profil ditemukan</div>
                        ) : (
                            filteredProfiles.map((p) => (
                                <div
                                    key={p.id}
                                    className={`pcs-item ${
                                        (mode === 'id' && value === p.id) ||
                                        (mode === 'text' && value === p.full_name)
                                            ? 'active' : ''
                                    }`}
                                    onClick={(e) => { e.stopPropagation(); handleSelect(p); }}
                                >
                                    {p.avatar_url ? (
                                        <img src={p.avatar_url} alt="" className="pcs-avatar" />
                                    ) : (
                                        <div className="pcs-avatar-placeholder"><User size={14} /></div>
                                    )}
                                    <span className="pcs-name">{p.full_name}</span>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="pcs-footer">
                        <button
                            type="button"
                            className="pcs-manual-btn"
                            onClick={(e) => { e.stopPropagation(); handleManualToggle(); }}
                        >
                            <Type size={13} />
                            <span>Ketik Manual</span>
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                .pcs-container {
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    font-family: 'Poppins', sans-serif;
                }
                .pcs-label {
                    font-size: 0.8rem;
                    font-weight: 600;
                    color: var(--text-muted);
                }
                /* TRIGGER */
                .pcs-trigger {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 10px 12px;
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    background: var(--bg-light);
                    cursor: pointer;
                    transition: all 0.2s;
                    min-height: 44px;
                }
                .pcs-trigger:hover {
                    border-color: var(--text-muted);
                }
                .pcs-trigger.open {
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                }
                .pcs-trigger-content {
                    flex: 1;
                    min-width: 0;
                }
                .pcs-placeholder {
                    color: var(--text-muted);
                    font-size: 0.88rem;
                }
                .pcs-selected {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 0.9rem;
                    font-weight: 500;
                    color: var(--text);
                }
                .pcs-trigger-actions {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    flex-shrink: 0;
                }
                .pcs-clear-btn {
                    width: 22px;
                    height: 22px;
                    border-radius: 6px;
                    border: none;
                    background: rgba(239, 68, 68, 0.1);
                    color: #ef4444;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.15s;
                }
                .pcs-clear-btn:hover {
                    background: #ef4444;
                    color: white;
                }
                .pcs-chevron {
                    color: var(--text-muted);
                    transition: transform 0.2s;
                }
                .pcs-chevron.rotated {
                    transform: rotate(180deg);
                }
                /* AVATAR */
                .pcs-avatar, .pcs-avatar-sm {
                    width: 26px;
                    height: 26px;
                    border-radius: 50%;
                    object-fit: cover;
                    flex-shrink: 0;
                }
                .pcs-avatar-sm {
                    width: 22px;
                    height: 22px;
                }
                .pcs-avatar-placeholder {
                    width: 26px;
                    height: 26px;
                    border-radius: 50%;
                    background: var(--bg-light);
                    border: 1px solid var(--border);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--text-muted);
                    flex-shrink: 0;
                }
                .pcs-selected .pcs-avatar-placeholder {
                    width: 22px;
                    height: 22px;
                }
                /* DROPDOWN */
                .pcs-dropdown {
                    position: absolute;
                    top: calc(100% + 4px);
                    left: 0;
                    right: 0;
                    z-index: 1000;
                    background: var(--bg);
                    border: 1px solid var(--border);
                    border-radius: 14px;
                    box-shadow: 0 12px 36px rgba(0, 0, 0, 0.12);
                    overflow: hidden;
                    animation: pcs-slideIn 0.15s ease;
                }
                @keyframes pcs-slideIn {
                    from { opacity: 0; transform: translateY(-6px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .pcs-search-wrap {
                    position: relative;
                    padding: 10px 12px;
                    border-bottom: 1px solid var(--border-muted);
                }
                .pcs-search-icon {
                    position: absolute;
                    left: 22px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: var(--text-muted);
                    pointer-events: none;
                }
                .pcs-search-input {
                    width: 100%;
                    padding: 9px 10px 9px 32px;
                    border: 1px solid var(--border);
                    border-radius: 10px;
                    background: var(--bg-light);
                    color: var(--text);
                    font-family: inherit;
                    font-size: 0.85rem;
                    outline: none;
                    transition: border-color 0.2s;
                }
                .pcs-search-input:focus {
                    border-color: #3b82f6;
                }
                .pcs-list {
                    max-height: 200px;
                    overflow-y: auto;
                    padding: 6px;
                }
                .pcs-list::-webkit-scrollbar {
                    width: 5px;
                }
                .pcs-list::-webkit-scrollbar-thumb {
                    background: var(--border);
                    border-radius: 10px;
                }
                .pcs-item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 9px 10px;
                    border-radius: 10px;
                    cursor: pointer;
                    transition: all 0.15s;
                }
                .pcs-item:hover {
                    background: var(--bg-light);
                }
                .pcs-item.active {
                    background: rgba(59, 130, 246, 0.08);
                    color: #3b82f6;
                    font-weight: 600;
                }
                .pcs-name {
                    font-size: 0.88rem;
                    font-weight: 500;
                }
                .pcs-empty {
                    padding: 18px 12px;
                    text-align: center;
                    color: var(--text-muted);
                    font-size: 0.85rem;
                }
                .pcs-footer {
                    padding: 8px 10px;
                    border-top: 1px solid var(--border-muted);
                }
                .pcs-manual-btn {
                    width: 100%;
                    padding: 9px;
                    border-radius: 10px;
                    border: 1px dashed var(--border);
                    background: transparent;
                    color: var(--text-muted);
                    font-family: inherit;
                    font-size: 0.82rem;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    cursor: pointer;
                    transition: all 0.15s;
                }
                .pcs-manual-btn:hover {
                    border-color: var(--text);
                    color: var(--text);
                    background: var(--bg-light);
                }
                /* MANUAL INPUT */
                .pcs-manual-wrap {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .pcs-manual-input {
                    flex: 1;
                    padding: 10px 12px;
                    border: 1px solid #f59e0b;
                    border-radius: 12px;
                    background: rgba(245, 158, 11, 0.05);
                    color: var(--text);
                    font-family: inherit;
                    font-size: 0.9rem;
                    outline: none;
                    transition: all 0.2s;
                }
                .pcs-manual-input:focus {
                    border-color: #f59e0b;
                    box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.12);
                }
                .pcs-manual-input::placeholder {
                    color: #f59e0b;
                    opacity: 0.6;
                }
                .pcs-manual-back {
                    width: 36px;
                    height: 36px;
                    border-radius: 10px;
                    border: 1px solid var(--border);
                    background: var(--bg-light);
                    color: var(--text-muted);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    flex-shrink: 0;
                    transition: all 0.2s;
                }
                .pcs-manual-back:hover {
                    background: var(--text);
                    color: var(--bg);
                    border-color: var(--text);
                }
            `}</style>
        </div>
    );
}
