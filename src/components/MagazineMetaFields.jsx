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

    return (
        <div className="mag-meta-fields-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div className="mag-meta-row" style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 200px' }}>
                    <ProfileComboSelect
                        value={pimpinanUmum}
                        onChange={(val) => setPimpinanUmum(val)}
                        mode="text"
                        multiple={false}
                        label="Pimpinan Umum"
                        placeholder="Pilih Pimpinan Umum..."
                    />
                </div>
                <div style={{ flex: '1 1 200px' }}>
                    <ProfileComboSelect
                        value={pimpinanRedaksi}
                        onChange={(val) => setPimpinanRedaksi(val)}
                        mode="text"
                        multiple={false}
                        label="Pimpinan Redaksi"
                        placeholder="Pilih Pimpinan Redaksi..."
                    />
                </div>
                <div style={{ flex: '1 1 200px' }}>
                    <ProfileComboSelect
                        value={redakturPelaksana}
                        onChange={(val) => setRedakturPelaksana(val)}
                        mode="text"
                        multiple={false}
                        label="Redaktur Pelaksana"
                        placeholder="Pilih Redaktur Pelaksana..."
                    />
                </div>
            </div>

            <div className="mag-meta-row" style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 200px' }}>
                    <ProfileComboSelect
                        value={editor}
                        onChange={(val) => setEditor(val)}
                        mode="text"
                        multiple={true}
                        label="Penyunting"
                        placeholder="Pilih Penyunting..."
                    />
                </div>
                <div style={{ flex: '1 1 200px' }}>
                    <ProfileComboSelect
                        value={layouter}
                        onChange={(val) => setLayouter(val)}
                        mode="text"
                        multiple={true}
                        label="Tata Letak (Layout)"
                        placeholder="Pilih Layouter..."
                    />
                </div>
                <div style={{ flex: '1 1 200px' }}>
                    <ProfileComboSelect
                        value={redaksi}
                        onChange={(val) => setRedaksi(val)}
                        mode="text"
                        multiple={true}
                        label="Tim Redaksi"
                        placeholder="Pilih Tim Redaksi..."
                    />
                </div>
            </div>

            {/* Hidden Inputs untuk ditangkap oleh Vanilla JS di Astro */}
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
