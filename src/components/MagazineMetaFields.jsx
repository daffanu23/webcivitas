import React, { useState } from 'react';
import ProfileComboSelect from './ProfileComboSelect';

export default function MagazineMetaFields({ 
    initialPimpinanUmum = '',
    initialPimpinanRedaksi = '',
    initialRedakturPelaksana = '',
    initialEditor = '',
    initialLayouter = '',
    initialRedaksi = ''
}) {
    const [pimpinanUmum, setPimpinanUmum] = useState(initialPimpinanUmum);
    const [pimpinanRedaksi, setPimpinanRedaksi] = useState(initialPimpinanRedaksi);
    const [redakturPelaksana, setRedakturPelaksana] = useState(initialRedakturPelaksana);
    const [editor, setEditor] = useState(initialEditor);
    const [layouter, setLayouter] = useState(initialLayouter);
    const [redaksi, setRedaksi] = useState(initialRedaksi);

    const renderMetaItem = (label, value, setter, isMulti) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '14px 0', borderBottom: '1px dashed var(--border-muted)' }}>
            <span style={{ color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.95rem' }}>{label}</span>
            <ProfileComboSelect
                value={value}
                onChange={setter}
                mode="text"
                multiple={isMulti}
                placeholder={`Pilih ${label}...`}
                label={null}
            />
        </div>
    );

    return (
        <div className="mag-meta-fields-wrapper" style={{ display: 'flex', flexDirection: 'column' }}>
            {renderMetaItem("Pimpinan Umum", pimpinanUmum, setPimpinanUmum, false)}
            {renderMetaItem("Pimpinan Redaksi", pimpinanRedaksi, setPimpinanRedaksi, false)}
            {renderMetaItem("Redaktur Pelaksana", redakturPelaksana, setRedakturPelaksana, false)}
            {renderMetaItem("Penyunting", editor, setEditor, true)}
            {renderMetaItem("Tata Letak (Layout)", layouter, setLayouter, true)}
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '14px 0' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.95rem' }}>Tim Redaksi</span>
                <ProfileComboSelect
                    value={redaksi}
                    onChange={(val) => setRedaksi(val)}
                    mode="text"
                    multiple={true}
                    placeholder="Pilih Tim Redaksi..."
                    label={null}
                />
            </div>

            {/* Hidden inputs to sync state to Astro form */}
            <input type="hidden" id="input-mag-pimpinan-umum" value={pimpinanUmum || ''} />
            <input type="hidden" id="input-mag-pimpinan-redaksi" value={pimpinanRedaksi || ''} />
            <input type="hidden" id="input-mag-redaktur-pelaksana" value={redakturPelaksana || ''} />
            <input type="hidden" id="input-mag-editor" value={editor || ''} />
            <input type="hidden" id="input-mag-layouter" value={layouter || ''} />
            <input type="hidden" id="input-mag-redaksi" value={redaksi || ''} />

            <style>{`
                /* Tambahan styling agar rapi */
                .mag-meta-fields-wrapper .pcs-wrapper {
                    margin-bottom: 0;
                }
                .mag-meta-fields-wrapper .pcs-label {
                    display: block;
                    font-size: 0.85rem;
                    color: var(--text-muted);
                    margin-bottom: 4px;
                }
            `}</style>
        </div>
    );
}
