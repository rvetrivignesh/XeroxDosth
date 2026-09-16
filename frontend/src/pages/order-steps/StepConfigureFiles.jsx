import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrder, parseColorPageNumbers } from '../../context/OrderContext';
import PageDetailsSummary from '../../components/PageDetailsSummary';
import OrderPriceSummary from '../../components/OrderPriceSummary';

export const StepConfigureFiles = () => {
    const {
        serviceType,
        files,
        dragActive,
        instructions,
        setInstructions,
        recordPickupLocation,
        setRecordPickupLocation,
        recordPickupTime,
        setRecordPickupTime,
        recordBindingType,
        setRecordBindingType,
        rates,
        isAllFilesValid,
        handleFiles,
        handleDrag,
        handleDrop,
        handleFileSelect,
        handleRemoveFile,
        updateFileStatus,
        getFileValidationError,
        getFileBwCost,
        getFileColorCost,
        getFileBindingCost,
        getSingleFileTotalCost
    } = useOrder();

    const navigate = useNavigate();

    const handlePrintTypeChange = (fileObj, newType) => {
        const rangeSize = Math.max(1, (fileObj.lastPage || 1) - (fileObj.startPage || 1) + 1);

        if (newType === 'grayscale') {
            updateFileStatus(fileObj.id, {
                printType: 'grayscale',
                colorPages: 0,
                colorPageNumbersText: '',
                bwPages: rangeSize
            });
        } else if (newType === 'color') {
            updateFileStatus(fileObj.id, {
                printType: 'color',
                colorPages: rangeSize,
                colorPageNumbersText: '',
                bwPages: 0,
                printSide: 'SINGLE_SIDE' // Color is always single-sided
            });
        } else if (newType === 'mixed') {
            const colorNumbers = parseColorPageNumbers(fileObj.colorPageNumbersText);
            const colorCount = colorNumbers.length;
            const bwCount = Math.max(0, rangeSize - colorCount);
            updateFileStatus(fileObj.id, {
                printType: 'mixed',
                colorPages: colorCount,
                bwPages: bwCount
            });
        }
    };

    const handleRangeChange = (fileObj, field, val) => {
        const numVal = Math.max(1, Number(val) || 1);
        const newStart = field === 'startPage' ? numVal : (fileObj.startPage || 1);
        const newLast = field === 'lastPage' ? numVal : (fileObj.lastPage || 1);
        const rangeSize = Math.max(1, newLast - newStart + 1);

        if (fileObj.printType === 'grayscale') {
            updateFileStatus(fileObj.id, {
                [field]: numVal,
                bwPages: rangeSize,
                colorPages: 0
            });
        } else if (fileObj.printType === 'color') {
            updateFileStatus(fileObj.id, {
                [field]: numVal,
                bwPages: 0,
                colorPages: rangeSize
            });
        } else {
            const colorNumbers = parseColorPageNumbers(fileObj.colorPageNumbersText);
            const colorCount = colorNumbers.length;
            const bwCount = Math.max(0, rangeSize - colorCount);
            updateFileStatus(fileObj.id, {
                [field]: numVal,
                bwPages: bwCount,
                colorPages: colorCount
            });
        }
    };

    const handleColorNumbersChange = (fileObj, text) => {
        const rangeSize = Math.max(1, (fileObj.lastPage || 1) - (fileObj.startPage || 1) + 1);
        const colorNumbers = parseColorPageNumbers(text);
        const colorCount = colorNumbers.length;
        const bwCount = Math.max(0, rangeSize - colorCount);

        updateFileStatus(fileObj.id, {
            colorPageNumbersText: text,
            colorPages: colorCount,
            bwPages: bwCount
        });
    };

    return (
        <div className="step-container specs-step fade-in">
            <div className="step-header">
                <h2>
                    {serviceType === 'RECORD' ? 'Step 1 — Upload Record PDF & Config' : 'Configure Printing Details'}
                </h2>
            </div>

            <div className="specs-layout-grid">
                <div className="specs-form-container card" style={{ padding: '1.5rem' }}>
                    {/* File Upload Dropzone */}
                    <div className="form-group">
                        <label>Upload Files ({files.length}/10) {serviceType === 'RECORD' ? '(Optional)' : '*'}</label>
                        <div
                            className={`upload-dropzone ${dragActive ? 'dragover' : ''}`}
                            onDragEnter={handleDrag}
                            onDragOver={handleDrag}
                            onDragLeave={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => document.getElementById('file-input-browse').click()}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    document.getElementById('file-input-browse').click();
                                }
                            }}
                        >
                            <input
                                id="file-input-browse"
                                type="file"
                                multiple={serviceType !== 'RECORD'}
                                style={{ display: 'none' }}
                                onChange={handleFileSelect}
                                accept=".pdf,.jpg,.jpeg,.png,.webp"
                            />
                            <div className="upload-dropzone-icon-wrapper">
                                <svg className="upload-dropzone-svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="17 8 12 3 7 8"></polyline>
                                    <line x1="12" y1="3" x2="12" y2="15"></line>
                                </svg>
                            </div>
                            <div className="upload-dropzone-content">
                                <div className="upload-dropzone-text">
                                    Drag &amp; drop files here, or
                                </div>
                                <button 
                                    type="button" 
                                    className="btn btn-primary upload-btn-catchy" 
                                    style={{ pointerEvents: 'none' }}
                                >
                                    <svg className="upload-btn-plus-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="12" y1="5" x2="12" y2="19"></line>
                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                    </svg>
                                    <span>Upload Files</span>
                                </button>
                                <div className="upload-dropzone-subtext">
                                    PDF and Images (JPG, PNG, WEBP) only up to 10MB
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Files List Configuration */}
                    {files.length > 0 && (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 600 }}>Configure Files</label>
                            
                            {files.map((fileObj) => {
                                const validationError = getFileValidationError(fileObj);
                                const isImage = fileObj.file?.type?.startsWith('image/') || 
                                                fileObj.type?.startsWith('image/') || 
                                                !(fileObj.file?.name || fileObj.name || '').toLowerCase().endsWith('.pdf');
                                const fileName = fileObj.file?.name || fileObj.name || 'Document';
                                const printType = fileObj.printType || 'grayscale';

                                return (
                                    <div 
                                        key={fileObj.id} 
                                        className={`file-card-container ${validationError ? 'has-error' : ''}`}
                                    >
                                        {/* Header (Collapsed View) */}
                                        <div 
                                            className="file-card-header"
                                            onClick={() => updateFileStatus(fileObj.id, { isCollapsed: !fileObj.isCollapsed })}
                                        >
                                            <div className="file-card-header-left">
                                                <span className="file-card-icon">{isImage ? '🖼️' : '📕'}</span>
                                                <div style={{ minWidth: 0 }}>
                                                    {fileObj.status === 'success' && fileObj.metadata?.url ? (
                                                        <a 
                                                            href={fileObj.metadata.url} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="file-card-name-sec"
                                                            style={{ textDecoration: 'underline', color: 'inherit', fontWeight: 'inherit', display: 'block' }}
                                                            title={fileName}
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            {fileName} ↗
                                                        </a>
                                                    ) : (
                                                        <div className="file-card-name-sec" title={fileName}>{fileName}</div>
                                                    )}
                                                    <div className="file-card-summary-sec">
                                                        {fileObj.status === 'success' ? (
                                                            <PageDetailsSummary doc={fileObj} />
                                                        ) : (
                                                            <span style={{ textTransform: 'uppercase', fontWeight: 600, color: fileObj.status === 'failed' ? '#ef4444' : 'var(--text-muted)' }}>
                                                                {fileObj.status} {fileObj.progress > 0 && fileObj.status === 'uploading' ? `(${fileObj.progress}%)` : ''}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="file-card-header-right" onClick={(e) => e.stopPropagation()}>
                                                {fileObj.status === 'success' && (
                                                    <button 
                                                        type="button" 
                                                        className="btn btn-secondary btn-xs"
                                                        onClick={() => updateFileStatus(fileObj.id, { isCollapsed: !fileObj.isCollapsed })}
                                                    >
                                                        {fileObj.isCollapsed ? 'Expand ⚙️' : 'Collapse ▴'}
                                                    </button>
                                                )}
                                                <button 
                                                    type="button" 
                                                    className="btn btn-danger btn-xs" 
                                                    onClick={() => handleRemoveFile(fileObj)}
                                                >
                                                    Remove 🗑️
                                                </button>
                                            </div>
                                        </div>

                                        {/* Error banner */}
                                        {validationError && (
                                            <div className="file-card-error-banner">
                                                ⚠️ {validationError}
                                            </div>
                                        )}

                                        {/* Body (Expanded View) */}
                                        {!fileObj.isCollapsed && fileObj.status === 'success' && (
                                            <div className="file-card-body">
                                                {/* 1. Page Print Range */}
                                                <div className="form-row" style={{ marginBottom: '1.25rem' }}>
                                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                                        <label style={{ fontSize: '0.85rem' }}>Start Page</label>
                                                        <input
                                                            type="number"
                                                            min={1}
                                                            max={fileObj.pageCount || 1}
                                                            value={fileObj.startPage || 1}
                                                            onChange={(e) => handleRangeChange(fileObj, 'startPage', e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                                        <label style={{ fontSize: '0.85rem' }}>Last Page</label>
                                                        <input
                                                            type="number"
                                                            min={1}
                                                            max={fileObj.pageCount || 1}
                                                            value={fileObj.lastPage || fileObj.pageCount || 1}
                                                            onChange={(e) => handleRangeChange(fileObj, 'lastPage', e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                                                    Total pages in document: <strong>{fileObj.pageCount || 1}</strong>
                                                </div>

                                                {/* 2. Print Type Selection */}
                                                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                                                    <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                                                        Print Type
                                                    </label>
                                                    <select
                                                        value={printType}
                                                        onChange={(e) => handlePrintTypeChange(fileObj, e.target.value)}
                                                    >
                                                        <option value="grayscale">📄 Grayscale</option>
                                                        <option value="color">🎨 Color (Single Side)</option>
                                                        <option value="mixed">📑 Mixed (Grayscale &amp; Color)</option>
                                                    </select>
                                                </div>

                                                {/* Mixed Mode: Color Page Numbers Input */}
                                                {printType === 'mixed' && (
                                                    <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                                                        <label style={{ fontSize: '0.85rem' }}>Color Page Numbers</label>
                                                        <input
                                                            type="text"
                                                            placeholder="e.g. 5, 12, 27"
                                                            value={fileObj.colorPageNumbersText || ''}
                                                            onChange={(e) => handleColorNumbersChange(fileObj, e.target.value)}
                                                        />
                                                        <small className="field-help" style={{ fontSize: '0.75rem' }}>
                                                            Specify color page numbers separated by commas. Remaining pages in range will be printed in Grayscale.
                                                        </small>
                                                    </div>
                                                )}

                                                {/* 3. General Print Configs */}
                                                <div className="form-row" style={{ marginBottom: '1.25rem' }}>
                                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                                        <label style={{ fontSize: '0.85rem' }}>Copies</label>
                                                        <input
                                                            type="number"
                                                            min={1}
                                                            value={fileObj.copies === '' ? '' : fileObj.copies}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                updateFileStatus(fileObj.id, { 
                                                                    copies: val === '' ? '' : Math.max(1, parseInt(val, 10) || 1) 
                                                                });
                                                            }}
                                                            onBlur={() => {
                                                                if (!fileObj.copies || Number(fileObj.copies) < 1) {
                                                                    updateFileStatus(fileObj.id, { copies: 1 });
                                                                }
                                                            }}
                                                        />
                                                    </div>

                                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                                        <label style={{ fontSize: '0.85rem' }}>Print Side</label>
                                                        {printType === 'color' ? (
                                                            <select
                                                                value="SINGLE_SIDE"
                                                                disabled
                                                                style={{ backgroundColor: 'var(--bg-input)', cursor: 'not-allowed' }}
                                                            >
                                                                <option value="SINGLE_SIDE">Single-Sided (₹{rates.colourSingleRate}/page)</option>
                                                            </select>
                                                        ) : (
                                                            <select
                                                                value={fileObj.printSide || 'SINGLE_SIDE'}
                                                                onChange={(e) => updateFileStatus(fileObj.id, { printSide: e.target.value })}
                                                            >
                                                                <option value="SINGLE_SIDE">Single-Sided (₹{rates.bwSingleRate}/page)</option>
                                                                <option value="DOUBLE_SIDE">Double-Sided (₹{rates.bwDoubleRate}/sheet)</option>
                                                            </select>
                                                        )}
                                                    </div>

                                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                                        <label style={{ fontSize: '0.85rem' }}>Binding</label>
                                                        <select
                                                            value={fileObj.binding || 'NONE'}
                                                            onChange={(e) => updateFileStatus(fileObj.id, { binding: e.target.value })}
                                                        >
                                                            <option value="NONE">None</option>
                                                            <option value="SPIRAL">Spiral Binding (₹{rates.spiralBindingRate})</option>
                                                            <option value="BOOK">Book Binding (₹{rates.bookBindingRate})</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                {/* 4. Auto-Calculated Data & Subtotal Summary (Replaces inputs & Advanced Options) */}
                                                <div style={{
                                                    backgroundColor: 'var(--bg-hover)',
                                                    border: '1px solid var(--border-color)',
                                                    borderRadius: 'var(--radius-sm)',
                                                    padding: '0.85rem 1rem',
                                                    marginTop: '0.5rem',
                                                    fontSize: '0.85rem',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '0.4rem'
                                                }}>
                                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                                                        📊 Calculated Print Details &amp; Cost
                                                    </div>
                                                    
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', color: 'var(--text-secondary)' }}>
                                                        {(fileObj.bwPages || 0) > 0 && (
                                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                                                📄 <strong>{fileObj.bwPages}</strong> Grayscale page(s) · ₹{getFileBwCost(fileObj).toFixed(2)}
                                                            </span>
                                                        )}
                                                        {(fileObj.colorPages || 0) > 0 && (
                                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#6366f1' }}>
                                                                🎨 <strong>{fileObj.colorPages}</strong> Color page(s) (Single Side) · ₹{getFileColorCost(fileObj).toFixed(2)}
                                                            </span>
                                                        )}
                                                        {fileObj.binding && fileObj.binding !== 'NONE' && (
                                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                                                📘 Binding ({fileObj.binding}) · ₹{getFileBindingCost(fileObj).toFixed(2)}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div style={{ 
                                                        borderTop: '1px dashed var(--border-color)', 
                                                        paddingTop: '0.4rem', 
                                                        marginTop: '0.2rem',
                                                        display: 'flex', 
                                                        justifyContent: 'space-between',
                                                        fontWeight: 600,
                                                        color: 'var(--text-primary)'
                                                    }}>
                                                        <span>Document Total ({fileObj.copies || 1} copy/copies):</span>
                                                        <span style={{ color: 'var(--accent-color)' }}>₹{getSingleFileTotalCost(fileObj).toFixed(2)}</span>
                                                    </div>
                                                </div>

                                            </div>
                                        )}

                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Additional fields for Record Pickup (Step 1 fields) */}
                    {serviceType === 'RECORD' && (
                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Record Pickup Details</h3>
                            
                            <div className="form-group">
                                <label htmlFor="recordPickupLocation">Physical Record Pickup Location *</label>
                                <input
                                    id="recordPickupLocation"
                                    type="text"
                                    placeholder="e.g. Hostel 3, Room 102"
                                    value={recordPickupLocation}
                                    onChange={(e) => setRecordPickupLocation(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="recordPickupTime">Preferred Pickup Time *</label>
                                    <input
                                        id="recordPickupTime"
                                        type="datetime-local"
                                        value={recordPickupTime}
                                        onChange={(e) => setRecordPickupTime(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="recordBindingType">Record Binding Selection *</label>
                                    <select 
                                        id="recordBindingType" 
                                        value={recordBindingType} 
                                        onChange={(e) => setRecordBindingType(e.target.value)}
                                    >
                                        <option value="SPIRAL">Spiral Binding</option>
                                        <option value="BOOK">Book Binding</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Special Instructions */}
                    <div className="form-group" style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                        <label htmlFor="instructions" style={{ fontWeight: 600 }}>Special Instructions (Optional)</label>
                        <textarea
                            id="instructions"
                            rows={2}
                            placeholder="e.g. Single sided print, specific page requests..."
                            value={instructions}
                            onChange={(e) => setInstructions(e.target.value)}
                        />
                    </div>

                    <div className="specs-actions" style={{ marginTop: '2rem' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => navigate('/place-order/shop')}>
                            ← Back
                        </button>
                        <button 
                            type="button" 
                            className="btn btn-primary"
                            onClick={() => navigate('/place-order/order-details')}
                            disabled={
                                !isAllFilesValid || 
                                (serviceType === 'RECORD' && !recordPickupLocation.trim())
                            }
                        >
                            Continue →
                        </button>
                    </div>
                </div>

                {/* Detailed Price Summary Sidebar */}
                <div className="summary-sidebar-container">
                    <OrderPriceSummary isSidebar={true} />
                </div>
            </div>
        </div>
    );
};

export default StepConfigureFiles;
