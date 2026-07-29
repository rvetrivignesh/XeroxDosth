import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { useToast } from '../context/ToastContext';
import './Order.css';

export const PlaceOrder = () => {
    const { showToast } = useToast();
    const navigate = useNavigate();

    const [shops, setShops] = useState([]);
    const [selectedShop, setSelectedShop] = useState(null);
    const [shopId, setShopId] = useState('');
    
    const [files, setFiles] = useState([]);
    const [dragActive, setDragActive] = useState(false);

    const [bwPages, setBwPages] = useState(0);
    const [colorPages, setColorPages] = useState(0);
    const [copies, setCopies] = useState(1);
    const [printSide, setPrintSide] = useState('SINGLE_SIDE');
    const [binding, setBinding] = useState('NONE');
    
    const [fulfillmentType, setFulfillmentType] = useState('PICKUP');
    const [deliveryAddress, setDeliveryAddress] = useState('');

    // Default deadline: tomorrow at current time
    const [requiredBy, setRequiredBy] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d.toISOString().slice(0, 16);
    });

    const [paymentMethod, setPaymentMethod] = useState('ONLINE');
    const [instructions, setInstructions] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingShops, setLoadingShops] = useState(true);

    const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png'];
    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

    useEffect(() => {
        const fetchShops = async () => {
            try {
                const res = await API.get('/shops/approved');
                const list = res.data?.data || [];
                setShops(list);
                if (list.length > 0) {
                    setShopId(list[0]._id);
                    setSelectedShop(list[0]);
                }
            } catch (err) {
                console.error('Failed to fetch shops:', err);
            } finally {
                setLoadingShops(false);
            }
        };
        fetchShops();
    }, []);

    const handleShopSelect = (id) => {
        setShopId(id);
        const s = shops.find((item) => item._id === id);
        setSelectedShop(s || null);
    };

    const totalPages = Number(bwPages || 0) + Number(colorPages || 0);

    // Estimate cost
    const calculateCost = () => {
        if (!selectedShop || !selectedShop.pricing) return null;
        const p = selectedShop.pricing;
        const bwCost = Number(bwPages || 0) * (p.bwPerPage || 1);
        const colorCost = Number(colorPages || 0) * (p.colorPerPage || 5);
        let bindingCost = 0;
        if (binding === 'SPIRAL') bindingCost = p.spiralBinding || 30;
        if (binding === 'BOOK') bindingCost = p.bookBinding || 50;

        const subtotal = (bwCost + colorCost + bindingCost) * Number(copies || 1);
        return subtotal;
    };

    const estimatedCost = calculateCost();

    const validateFile = (file) => {
        const ext = file.name.split('.').pop().toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
            return `Unsupported file format. Allowed: ${ALLOWED_EXTENSIONS.join(', ').toUpperCase()}`;
        }
        if (file.size > MAX_FILE_SIZE) {
            return 'File size exceeds the 100 MB limit.';
        }
        return null;
    };

    const updateFileStatus = (id, updates) => {
        setFiles((prev) =>
            prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
        );
    };

    const uploadSingleFile = async (fileObj) => {
        updateFileStatus(fileObj.id, { status: 'uploading', progress: 0, error: null });

        const formData = new FormData();
        formData.append('document', fileObj.file);

        try {
            const res = await API.post('/uploads', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    updateFileStatus(fileObj.id, { progress: percentCompleted });
                }
            });

            const uploadedData = res.data.data;
            updateFileStatus(fileObj.id, {
                status: 'success',
                progress: 100,
                metadata: uploadedData
            });
        } catch (err) {
            updateFileStatus(fileObj.id, {
                status: 'failed',
                error: err.message || 'Upload failed'
            });
        }
    };

    const handleFiles = (incomingFiles) => {
        const currentCount = files.length;
        if (currentCount + incomingFiles.length > 10) {
            showToast('Maximum of 10 documents per order', 'error');
            return;
        }

        const newFileObjects = [];

        for (let i = 0; i < incomingFiles.length; i++) {
            const file = incomingFiles[i];
            const error = validateFile(file);
            
            const fileObj = {
                id: Date.now() + i + Math.random(),
                file,
                progress: 0,
                status: error ? 'failed' : 'pending',
                error: error,
                metadata: null
            };
            
            newFileObjects.push(fileObj);
        }

        setFiles((prev) => [...prev, ...newFileObjects]);

        // Start upload for valid pending files
        newFileObjects.forEach((fileObj) => {
            if (fileObj.status === 'pending') {
                uploadSingleFile(fileObj);
            }
        });
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFiles(Array.from(e.dataTransfer.files));
        }
    };

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFiles(Array.from(e.target.files));
        }
    };

    const handleRemoveFile = async (fileObj) => {
        if (fileObj.status === 'success' && fileObj.metadata?.publicId) {
            try {
                await API.delete(`/uploads?publicId=${encodeURIComponent(fileObj.metadata.publicId)}`);
            } catch (err) {
                console.error('Failed to delete from Cloudinary:', err);
            }
        }
        setFiles((prev) => prev.filter((f) => f.id !== fileObj.id));
    };

    const handleRetryUpload = (fileObj) => {
        uploadSingleFile(fileObj);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!shopId.trim()) {
            showToast('Please select a target shop', 'error');
            return;
        }

        if (totalPages < 1) {
            showToast('Total pages must be at least 1 (set Black & White or Color pages)', 'error');
            return;
        }

        if (fulfillmentType === 'DELIVERY' && !deliveryAddress.trim()) {
            showToast('Please provide a delivery address for home delivery', 'error');
            return;
        }

        // Validate document inputs
        const uploadedDocs = files
            .filter((f) => f.status === 'success')
            .map((f) => f.metadata);

        if (uploadedDocs.length === 0) {
            showToast('Please upload at least 1 valid document', 'error');
            return;
        }

        if (files.some((f) => f.status === 'uploading')) {
            showToast('Please wait for all file uploads to finish', 'error');
            return;
        }

        if (new Date(requiredBy) <= new Date()) {
            showToast('Required by deadline must be a future date', 'error');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                shop: shopId.trim(),
                documents: uploadedDocs,
                bwPages: Number(bwPages),
                colorPages: Number(colorPages),
                copies: Number(copies),
                printSide,
                binding,
                fulfillmentType,
                deliveryAddress: fulfillmentType === 'DELIVERY' ? deliveryAddress.trim() : '',
                requiredBy: new Date(requiredBy).toISOString(),
                paymentMethod,
                instructions
            };

            await API.post('/orders', payload);
            showToast('Order placed successfully!', 'success');
            navigate('/my-orders');
        } catch (err) {
            showToast(err.response?.data?.message || err.message || 'Failed to place order', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-container">
            <div className="order-form-card card">
                <div className="form-header">
                    <h2>Place a Print Order</h2>
                    <p>Enter print specifications and upload files to create your job.</p>
                </div>

                <form onSubmit={handleSubmit} className="order-form">
                    {/* Target Shop Selector */}
                    <div className="form-group">
                        <label htmlFor="shopSelect">Select Xerox Shop *</label>
                        {loadingShops ? (
                            <div className="spinner"></div>
                        ) : shops.length > 0 ? (
                            <select
                                id="shopSelect"
                                value={shopId}
                                onChange={(e) => handleShopSelect(e.target.value)}
                                required
                            >
                                {shops.map((s) => (
                                    <option key={s._id} value={s._id}>
                                        {s.shopName} - {s.location?.address}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <input
                                id="shopSelect"
                                type="text"
                                placeholder="Enter Shop Mongo ID..."
                                value={shopId}
                                onChange={(e) => setShopId(e.target.value)}
                                required
                            />
                        )}
                        {selectedShop && selectedShop.pricing && (
                            <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                Rates: B&W ₹{selectedShop.pricing.bwPerPage}/pg | Color ₹{selectedShop.pricing.colorPerPage}/pg | Spiral ₹{selectedShop.pricing.spiralBinding} | Book ₹{selectedShop.pricing.bookBinding}
                            </div>
                        )}
                    </div>

                    {/* Fulfillment Option (Pickup vs Delivery) */}
                    <div className="form-group" style={{ padding: '1rem', backgroundColor: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                        <label style={{ fontWeight: 600, marginBottom: '0.75rem', display: 'block' }}>Order Fulfillment Option *</label>
                        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                <input
                                    type="radio"
                                    name="fulfillmentType"
                                    value="PICKUP"
                                    checked={fulfillmentType === 'PICKUP'}
                                    onChange={(e) => setFulfillmentType(e.target.value)}
                                />
                                <span>Pickup</span>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                <input
                                    type="radio"
                                    name="fulfillmentType"
                                    value="DELIVERY"
                                    checked={fulfillmentType === 'DELIVERY'}
                                    onChange={(e) => setFulfillmentType(e.target.value)}
                                />
                                <span>Delivery</span>
                            </label>
                        </div>

                        {fulfillmentType === 'DELIVERY' && (
                            <div style={{ marginTop: '1rem' }}>
                                <label htmlFor="deliveryAddress">Delivery Address *</label>
                                <textarea
                                    id="deliveryAddress"
                                    rows={2}
                                    placeholder="Room / Hostel / Department, Street address, Landmark..."
                                    value={deliveryAddress}
                                    onChange={(e) => setDeliveryAddress(e.target.value)}
                                    required
                                />
                            </div>
                        )}
                    </div>

                    {/* Documents Upload Section */}
                    <div className="documents-section">
                        <div className="section-title-row">
                            <h3>Upload Documents ({files.length}/10) *</h3>
                        </div>

                        {/* Drag and Drop Zone */}
                        <div
                            className={`upload-dropzone ${dragActive ? 'dragover' : ''}`}
                            onDragEnter={handleDrag}
                            onDragOver={handleDrag}
                            onDragLeave={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => document.getElementById('file-input-browse').click()}
                        >
                            <input
                                id="file-input-browse"
                                type="file"
                                multiple
                                style={{ display: 'none' }}
                                onChange={handleFileSelect}
                                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png"
                            />
                            <div className="upload-dropzone-icon">📥</div>
                            <div className="upload-dropzone-text">Drag & Drop files here or click to browse</div>
                            <div className="upload-dropzone-subtext">
                                Supported formats: PDF, DOC, PPT, XLS, images (max 100MB per file)
                            </div>
                        </div>

                        {/* Upload Queue list */}
                        {files.length > 0 && (
                            <div className="file-list">
                                {files.map((fileObj) => {
                                    const isImage = fileObj.file.type.startsWith('image/');
                                    const ext = fileObj.file.name.split('.').pop().toLowerCase();
                                    
                                    return (
                                        <div key={fileObj.id} className="file-item-card">
                                            <div className="file-item-info">
                                                <div className="file-item-preview">
                                                    {isImage ? (
                                                        <img src={URL.createObjectURL(fileObj.file)} alt="preview" />
                                                    ) : (
                                                        <span>
                                                            {ext === 'pdf' ? '📕' : 
                                                             ['doc', 'docx'].includes(ext) ? '📘' : 
                                                             ['xls', 'xlsx'].includes(ext) ? '📗' : 
                                                             ['ppt', 'pptx'].includes(ext) ? '📙' : '📄'}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="file-item-meta">
                                                    <div className="file-item-name" title={fileObj.file.name}>
                                                        {fileObj.file.name}
                                                    </div>
                                                    <div className="file-item-size-status">
                                                        <span>{(fileObj.file.size / (1024 * 1024)).toFixed(2)} MB</span>
                                                        <span className={`file-status-tag ${fileObj.status}`}>
                                                            {fileObj.status.toUpperCase()}
                                                        </span>
                                                    </div>
                                                    {fileObj.status === 'uploading' && (
                                                        <div className="file-progress-bar-container">
                                                            <div
                                                                className="file-progress-bar"
                                                                style={{ width: `${fileObj.progress}%` }}
                                                            ></div>
                                                        </div>
                                                    )}
                                                    {fileObj.error && (
                                                        <div style={{ color: 'var(--error-text)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                                                            {fileObj.error}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="file-item-actions">
                                                {fileObj.status === 'failed' && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-secondary btn-sm"
                                                        onClick={() => handleRetryUpload(fileObj)}
                                                    >
                                                        Retry
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    className="remove-doc-btn"
                                                    onClick={() => handleRemoveFile(fileObj)}
                                                    style={{ border: 'none', background: 'none', marginLeft: '0.5rem' }}
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Page Counts Breakdown */}
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="bwPages">B&W Pages</label>
                            <input
                                id="bwPages"
                                type="number"
                                min={0}
                                value={bwPages}
                                onChange={(e) => setBwPages(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="colorPages">Color Pages</label>
                            <input
                                id="colorPages"
                                type="number"
                                min={0}
                                value={colorPages}
                                onChange={(e) => setColorPages(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label>Total Computed Pages</label>
                            <div className="computed-total-badge">
                                {totalPages} pages
                            </div>
                        </div>
                    </div>

                    {/* Copies & Preferences */}
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="copies">Number of Copies *</label>
                            <input
                                id="copies"
                                type="number"
                                min={1}
                                value={copies}
                                onChange={(e) => setCopies(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="printSide">Print Side *</label>
                            <select
                                id="printSide"
                                value={printSide}
                                onChange={(e) => setPrintSide(e.target.value)}
                            >
                                <option value="SINGLE_SIDE">Single Sided</option>
                                <option value="DOUBLE_SIDE">Double Sided</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="binding">Binding Option *</label>
                            <select
                                id="binding"
                                value={binding}
                                onChange={(e) => setBinding(e.target.value)}
                            >
                                <option value="NONE">None</option>
                                <option value="SPIRAL">Spiral Binding</option>
                                <option value="BOOK">Book Binding</option>
                            </select>
                        </div>
                    </div>

                    {/* Estimated Cost Box */}
                    {estimatedCost !== null && (
                        <div style={{
                            padding: '1rem 1.25rem',
                            backgroundColor: 'var(--bg-hover)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--accent-color)',
                            display: 'flex',
                            justify: 'space-between',
                            alignItems: 'center',
                            marginBottom: '1.25rem'
                        }}>
                            <div>
                                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Estimated Order Total</span>
                                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-color)' }}>₹{estimatedCost}</div>
                            </div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Calculation based on selected shop pricing rates</span>
                        </div>
                    )}

                    {/* Deadline & Payment */}
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="requiredBy">Required Deadline *</label>
                            <input
                                id="requiredBy"
                                type="datetime-local"
                                value={requiredBy}
                                onChange={(e) => setRequiredBy(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="paymentMethod">Payment Method *</label>
                            <select
                                id="paymentMethod"
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                            >
                                <option value="ONLINE">Online Payment</option>
                                <option value="COD">Cash on Delivery (COD)</option>
                            </select>
                        </div>
                    </div>

                    {/* Additional Instructions */}
                    <div className="form-group">
                        <label htmlFor="instructions">Special Instructions (Optional)</label>
                        <textarea
                            id="instructions"
                            rows={3}
                            placeholder="e.g. Use glossy paper for cover page, print page 1 separately..."
                            value={instructions}
                            onChange={(e) => setInstructions(e.target.value)}
                        />
                    </div>

                    <button type="submit" className="btn btn-primary submit-btn" disabled={loading}>
                        {loading ? <div className="spinner"></div> : 'Confirm & Place Order'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default PlaceOrder;

