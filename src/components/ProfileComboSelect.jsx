import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { ChevronDown, Search, User, Check, X } from 'lucide-react';

export default function ProfileComboSelect({
    value = '',
    onChange,
    mode = 'id',
    multiple = false,
    label = 'Pilih Profil',
    placeholder = 'Pilih...',
}) {
    const [profiles, setProfiles] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [isManualMode, setIsManualMode] = useState(false);
    const [manualInput, setManualInput] = useState('');
    const containerRef = useRef(null);
    const searchInputRef = useRef(null);
    const manualInputRef = useRef(null);

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

    // Close on outside click
    useEffect(() => {
        const handler = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Parse values
    const parsedValues = typeof value === 'string' && value.trim() !== '' 
        ? value.split(',').map(v => v.trim()).filter(Boolean)
        : [];

    const filteredProfiles = profiles.filter(p =>
        p.full_name?.toLowerCase().includes(search.toLowerCase())
    );

    const handleSelect = (itemValue) => {
        if (!itemValue) return;

        let newValues = [];
        if (multiple) {
            // Toggle selection
            if (parsedValues.includes(itemValue)) {
                newValues = parsedValues.filter(v => v !== itemValue);
            } else {
                newValues = [...parsedValues, itemValue];
            }
            onChange(newValues.join(', '));
        } else {
            newValues = [itemValue];
            onChange(newValues.join(', '));
            setIsOpen(false); // Close if single select
        }
        setSearch(''); // Reset search
        setIsManualMode(false);
        setManualInput('');
        if (multiple) {
            searchInputRef.current?.focus();
        }
    };

    const handleManualSubmit = () => {
        if (manualInput.trim()) {
            handleSelect(manualInput.trim());
        } else {
            setIsManualMode(false);
            setTimeout(() => searchInputRef.current?.focus(), 50);
        }
    };

    const handleRemove = (e, itemValueToRemove) => {
        e.stopPropagation();
        const newValues = parsedValues.filter(v => v !== itemValueToRemove);
        onChange(newValues.join(', '));
    };

    // Determine what to show in the main box
    const getDisplayText = () => {
        if (parsedValues.length === 0) return <span className="pcs-placeholder">{placeholder}</span>;
        
        return (
            <div className="pcs-selected-list">
                {parsedValues.map(val => {
                    let profile = null;
                    let displayName = val;
                    if (mode === 'id') {
                        profile = profiles.find(p => p.id === val);
                        displayName = profile ? profile.full_name : val;
                    } else {
                        profile = profiles.find(p => p.full_name === val);
                    }

                    return (
                        <span key={val} className="pcs-selected-item">
                            {profile?.avatar_url ? (
                                <img src={profile.avatar_url} alt="" className="pcs-selected-avatar" />
                            ) : (
                                <div className="pcs-selected-avatar-placeholder"><User size={10} /></div>
                            )}
                            <span className="pcs-selected-text">{displayName}</span>
                            <button type="button" className="pcs-remove-btn" onClick={(e) => handleRemove(e, val)}>
                                <X size={12} />
                            </button>
                        </span>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="pcs-wrapper" ref={containerRef}>
            {label && <label className="pcs-label">{label}</label>}

            {/* MAIN DROPDOWN BOX */}
            <div 
                className={`pcs-main-box ${isOpen ? 'focused' : ''}`} 
                onClick={() => {
                    setIsOpen(!isOpen);
                    if (!isOpen) {
                        setIsManualMode(false);
                        setManualInput('');
                        setTimeout(() => searchInputRef.current?.focus(), 50);
                    }
                }}
            >
                <div className="pcs-display-area">
                    {getDisplayText()}
                </div>
                <div className="pcs-indicator">
                    <ChevronDown size={16} className={`pcs-chevron ${isOpen ? 'rotated' : ''}`} />
                </div>
            </div>

            {/* DROPDOWN MENU */}
            {isOpen && (
                <div className="pcs-dropdown-menu">
                    {isManualMode ? (
                        <div className="pcs-manual-form">
                            <div className="pcs-manual-header">Tulis Nama Manual</div>
                            <input 
                                ref={manualInputRef}
                                type="text"
                                className="pcs-manual-input"
                                placeholder="Masukkan nama..."
                                value={manualInput}
                                onChange={e => setManualInput(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') handleManualSubmit();
                                    if (e.key === 'Escape') {
                                        setIsManualMode(false);
                                        setTimeout(() => searchInputRef.current?.focus(), 50);
                                    }
                                }}
                            />
                            <div className="pcs-manual-actions">
                                <button type="button" className="pcs-btn-cancel" onClick={(e) => {
                                    e.stopPropagation();
                                    setIsManualMode(false);
                                    setTimeout(() => searchInputRef.current?.focus(), 50);
                                }}>Batal</button>
                                <button type="button" className="pcs-btn-save" onClick={(e) => {
                                    e.stopPropagation();
                                    handleManualSubmit();
                                }}>Tambahkan</button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="pcs-search-container">
                                <Search size={14} className="pcs-search-icon" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    className="pcs-search-input"
                                    placeholder="Cari nama..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>

                            <div className="pcs-list">
                                {/* MANUAL ENTRY OPTION ALWAYS AT TOP IF MODE IS TEXT */}
                                {mode === 'text' && (
                                    <div 
                                        className="pcs-item pcs-manual-item" 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsManualMode(true);
                                            setManualInput(search);
                                            setTimeout(() => manualInputRef.current?.focus(), 50);
                                        }}
                                    >
                                        <div className="pcs-avatar-placeholder"><User size={14} /></div>
                                        <div className="pcs-item-info">
                                            <span className="pcs-name">Tulis nama manual...</span>
                                            <span className="pcs-sub">Tambahkan user yang belum terdaftar</span>
                                        </div>
                                    </div>
                                )}

                                {filteredProfiles.length === 0 ? (
                                    <div className="pcs-empty">Tidak ada profil tersedia</div>
                                ) : (
                                    filteredProfiles.map((p) => {
                                        const itemVal = mode === 'id' ? p.id : p.full_name;
                                        const isSelected = parsedValues.includes(itemVal);
                                        
                                        return (
                                            <div
                                                key={p.id}
                                                className={`pcs-item ${isSelected ? 'selected' : ''}`}
                                                onClick={() => handleSelect(itemVal)}
                                            >
                                                {p.avatar_url ? (
                                                    <img src={p.avatar_url} alt="" className="pcs-avatar" />
                                                ) : (
                                                    <div className="pcs-avatar-placeholder"><User size={14} /></div>
                                                )}
                                                <div className="pcs-item-info">
                                                    <span className="pcs-name">{p.full_name}</span>
                                                </div>
                                                {isSelected && <Check size={16} className="pcs-check-icon" />}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}

            <style>{`
                .pcs-wrapper {
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    font-family: 'Poppins', sans-serif;
                    width: 100%;
                }
                .pcs-label {
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: var(--text);
                }
                
                /* MAIN BOX (Murni Dropdown Look) */
                .pcs-main-box {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    min-height: 42px;
                    padding: 8px 12px;
                    background: var(--bg-light);
                    border: 1px solid var(--border);
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .pcs-main-box:hover {
                    border-color: var(--text-muted);
                }
                .pcs-main-box.focused {
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                    background: var(--bg);
                }
                
                .pcs-display-area {
                    flex: 1;
                    min-width: 0;
                    display: flex;
                    align-items: center;
                }
                .pcs-placeholder {
                    color: var(--text-muted);
                    font-size: 0.85rem;
                }
                .pcs-indicator {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--text-muted);
                    margin-left: 8px;
                }
                .pcs-chevron {
                    transition: transform 0.2s;
                }
                .pcs-chevron.rotated {
                    transform: rotate(180deg);
                }

                /* COMMA SEPARATED LIST IN MAIN BOX */
                .pcs-selected-list {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                    align-items: center;
                }
                .pcs-selected-item {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 0.85rem;
                    color: var(--text);
                    background: var(--border-muted, #f3f4f6);
                    padding: 2px 8px 2px 4px;
                    border-radius: 12px;
                    border: 1px solid var(--border);
                    width: 160px; /* Panjang tag dibuat sama persis */
                    justify-content: space-between;
                }
                .pcs-selected-text {
                    flex: 1;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .pcs-selected-avatar {
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    object-fit: cover;
                }
                .pcs-selected-avatar-placeholder {
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: var(--bg-light);
                    border: 1px solid var(--border);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--text-muted);
                }
                .pcs-remove-btn {
                    background: transparent;
                    border: none;
                    color: var(--text-muted);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 2px;
                    margin-right: -4px;
                }
                .pcs-remove-btn:hover {
                    color: #ef4444;
                }

                /* DROPDOWN MENU */
                .pcs-dropdown-menu {
                    position: absolute;
                    top: calc(100% + 4px);
                    left: 0;
                    right: 0;
                    z-index: 1000;
                    background: var(--bg);
                    border: 1px solid var(--border);
                    border-radius: 8px;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
                    overflow: hidden;
                    animation: pcs-slideIn 0.15s ease;
                }
                @keyframes pcs-slideIn {
                    from { opacity: 0; transform: translateY(-4px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                /* SEARCH BOX INSIDE DROPDOWN */
                .pcs-search-container {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 12px;
                    border-bottom: 1px solid var(--border);
                    background: var(--bg-light);
                }
                .pcs-search-icon {
                    color: var(--text-muted);
                }
                .pcs-search-input {
                    flex: 1;
                    border: none;
                    background: transparent;
                    outline: none;
                    font-size: 0.85rem;
                    font-family: inherit;
                    color: var(--text);
                }
                .pcs-search-input::placeholder {
                    color: var(--text-muted);
                }

                /* LIST */
                .pcs-list {
                    max-height: 250px;
                    overflow-y: auto;
                    padding: 6px;
                }
                .pcs-list::-webkit-scrollbar {
                    width: 6px;
                }
                .pcs-list::-webkit-scrollbar-thumb {
                    background: var(--border);
                    border-radius: 10px;
                }
                
                .pcs-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 8px 10px;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.15s;
                }
                .pcs-item:hover {
                    background: var(--border-muted, #f3f4f6);
                }
                .pcs-item.selected {
                    background: rgba(59, 130, 246, 0.08);
                }
                .pcs-manual-item {
                    border-bottom: 1px dashed var(--border);
                    margin-bottom: 4px;
                    border-radius: 0;
                }
                .pcs-manual-item:hover {
                    background: rgba(16, 185, 129, 0.08);
                }
                
                .pcs-avatar {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    object-fit: cover;
                    flex-shrink: 0;
                }
                .pcs-avatar-placeholder {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: var(--bg-light);
                    border: 1px solid var(--border);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--text-muted);
                    flex-shrink: 0;
                }
                .pcs-item-info {
                    display: flex;
                    flex-direction: column;
                    flex: 1;
                    min-width: 0;
                }
                .pcs-name {
                    font-size: 0.88rem;
                    font-weight: 500;
                    color: var(--text);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .pcs-sub {
                    font-size: 0.7rem;
                    color: var(--text-muted);
                }
                .pcs-check-icon {
                    color: #3b82f6;
                    flex-shrink: 0;
                }
                .pcs-empty {
                    padding: 16px;
                    text-align: center;
                    color: var(--text-muted);
                    font-size: 0.85rem;
                }

                /* MANUAL FORM IN DROPDOWN */
                .pcs-manual-form {
                    padding: 12px;
                }
                .pcs-manual-header {
                    font-size: 0.8rem;
                    font-weight: 600;
                    margin-bottom: 8px;
                    color: var(--text);
                }
                .pcs-manual-input {
                    width: 100%;
                    padding: 8px 12px;
                    border: 1px solid var(--border);
                    border-radius: 6px;
                    font-size: 0.85rem;
                    margin-bottom: 12px;
                    outline: none;
                    font-family: inherit;
                }
                .pcs-manual-input:focus {
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
                }
                .pcs-manual-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 8px;
                }
                .pcs-btn-cancel, .pcs-btn-save {
                    padding: 6px 12px;
                    font-size: 0.8rem;
                    border-radius: 4px;
                    cursor: pointer;
                    font-weight: 500;
                    border: none;
                }
                .pcs-btn-cancel {
                    background: transparent;
                    color: var(--text-muted);
                }
                .pcs-btn-cancel:hover {
                    background: var(--border-muted, #f3f4f6);
                    color: var(--text);
                }
                .pcs-btn-save {
                    background: #3b82f6;
                    color: white;
                }
                .pcs-btn-save:hover {
                    background: #2563eb;
                }
            `}</style>
        </div>
    );
}
