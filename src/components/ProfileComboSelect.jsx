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
                                <img src={profile.avatar_url} alt="" className="pcs-selected-avatar" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                            ) : null}
                            <div className="pcs-selected-avatar-placeholder" style={{ display: profile?.avatar_url ? 'none' : 'flex' }}><User size={10} /></div>
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
                                                    <img src={p.avatar_url} alt="" className="pcs-avatar" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                                                ) : null}
                                                <div className="pcs-avatar-placeholder" style={{ display: p.avatar_url ? 'none' : 'flex' }}><User size={14} /></div>
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

            
        </div>
    );
}

