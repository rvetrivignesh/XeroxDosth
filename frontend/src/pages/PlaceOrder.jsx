import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import API from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import './Order.css';

// PDF Page count detector using lightweight binary/text regex search
const detectPdfPages = async (file) => {
    try {
        const slice = file.slice(0, Math.min(file.size, 2 * 1024 * 1024)); // first 2MB
        const buffer = await slice.arrayBuffer();
        const text = new TextDecoder('ascii').decode(new Uint8Array(buffer));
        
        // Match '/Type /Pages' structure or general '/Count'
        const pagesMatches = [...text.matchAll(/\/Type\s*\/Pages[\s\S]*?\/Count\s*(\d+)/gi)];
        if (pagesMatches.length > 0) {
            const counts = pagesMatches.map(m => parseInt(m[1], 10)).filter(c => !isNaN(c));
            if (counts.length > 0) {
                return Math.max(...counts);
            }
        }
        
        // Fallback: general /Count matcher
        const countMatches = [...text.matchAll(/\/Count\s*(\d+)/gi)];
        if (countMatches.length > 0) {
            const counts = countMatches.map(m => parseInt(m[1], 10)).filter(c => !isNaN(c) && c < 5000);
            if (counts.length > 0) {
                return Math.max(...counts);
            }
        }
    } catch (err) {
        console.error('Failed to auto-detect PDF page count:', err);
    }
    return null;
};

export const PlaceOrder = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const location = useLocation();

    // Stepper Wizard State
    const [step, setStep] = useState(1);
    const [serviceType, setServiceType] = useState('PRINT'); // 'PRINT' | 'DELIVERY' | 'RECORD'

    const [shops, setShops] = useState([]);
    const [selectedShop, setSelectedShop] = useState(null);
    const [shopId, setShopId] = useState('');
    const [shopSearch, setShopSearch] = useState('');
    
    const [files, setFiles] = useState([]);
    const [dragActive, setDragActive] = useState(false);

    // Document and specs state
    const [docPages, setDocPages] = useState(0); // Auto-populated or manual override
    const [bwPages, setBwPages] = useState(0);
    const [colorPages, setColorPages] = useState(0);
    const [colorPageNumbersText, setColorPageNumbersText] = useState('');
    const [copies, setCopies] = useState(1);
    const [printSide, setPrintSide] = useState('SINGLE_SIDE');
    const [binding, setBinding] = useState('NONE');
    
    // Fulfillment and Customer info
    const [fulfillmentType, setFulfillmentType] = useState('PICKUP');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [customerContact, setCustomerContact] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    
    // Record specific details
    const [recordFromPage, setRecordFromPage] = useState(1);
    const [recordPickupLocation, setRecordPickupLocation] = useState('');
    const [recordPickupTime, setRecordPickupTime] = useState(() => {
        const d = new Date();
        d.setHours(d.getHours() + 2); // default pickup in 2 hours
        return d.toISOString().slice(0, 16);
    });
    const [recordBindingType, setRecordBindingType] = useState('SPIRAL');
    const [recordDeliveryOption, setRecordDeliveryOption] = useState('PICKUP');
    const [recordDeliveryAddress, setRecordDeliveryAddress] = useState('');

    // Default deadline: tomorrow at current time
    const [requiredBy, setRequiredBy] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d.toISOString().slice(0, 16);
    });

    const [instructions, setInstructions] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingShops, setLoadingShops] = useState(true);

    const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png'];
    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

    // Pre-populate customerContact and customerEmail from logged-in user context
    useEffect(() => {
        if (user) {
            if (user.phone && !customerContact) {
                setCustomerContact(user.phone);
            }
            if (user.email && !customerEmail) {
                setCustomerEmail(user.email);
            }
        }
    }, [user, customerContact, customerEmail]);

    // Fetch shops
    useEffect(() => {
        const fetchShops = async () => {
            try {
                const res = await API.get('/shops/approved');
                const list = res.data?.data || [];
                setShops(list);
                
                const searchParams = new URLSearchParams(location.search);
                const queryShopId = searchParams.get('shopId') || location.state?.shopId;

                if (queryShopId && list.some(s => s._id === queryShopId)) {
                    setShopId(queryShopId);
                    const found = list.find((s) => s._id === queryShopId);
                    setSelectedShop(found || null);
                    // Automatically skip to details if shop selected via query params
                    setStep(3);
                } else if (list.length > 0) {
                    setShopId(list[0]._id);
                    setSelectedShop(list[0]);
                }
            } catch (err) {
                console.error('Failed to fetch shops:', err);
                showToast('Failed to load shop listings', 'error');
            } finally {
                setLoadingShops(false);
            }
        };
        fetchShops();
    }, [location]);

    // Keep fulfillment types in sync with shop capabilities
    useEffect(() => {
        if (selectedShop) {
            if (serviceType === 'DELIVERY') {
                setFulfillmentType('DELIVERY');
            } else if (serviceType === 'PRINT') {
                setFulfillmentType('PICKUP');
            }
        }
    }, [selectedShop, serviceType]);

    // Sync colorPageNumbersText with colorPages count to trim excess numbers if colorPages is reduced
    useEffect(() => {
        if (!colorPageNumbersText.trim()) return;
        const parts = colorPageNumbersText.split(',');
        const pageNumbers = parts
            .map((p) => parseInt(p.trim(), 10))
            .filter((num) => !isNaN(num) && num >= 1 && num <= docPages);
        
        const uniquePages = [...new Set(pageNumbers)];
        if (uniquePages.length > colorPages) {
            const trimmed = uniquePages.slice(0, colorPages);
            setColorPageNumbersText(trimmed.join(', '));
        }
    }, [colorPages, docPages, colorPageNumbersText]);

    const handleColorPageNumbersChange = (val) => {
        let sanitized = val.replace(/[^0-9,\s]/g, '');
        const parts = sanitized.split(',');
        const validated = [];
        
        for (let part of parts) {
            const trimmed = part.trim();
            if (!trimmed) {
                validated.push('');
                continue;
            }
            const num = parseInt(trimmed, 10);
            if (isNaN(num)) continue;
            
            const capped = Math.min(docPages, Math.max(1, num));
            const activeCount = validated.filter(p => p !== '').length;
            if (activeCount >= colorPages) {
                break;
            }
            validated.push(capped.toString());
        }

        const trailingComma = sanitized.endsWith(',') ? ',' : '';
        const trailingSpace = sanitized.endsWith(' ') ? ' ' : '';
        
        const finalActiveCount = validated.filter(p => p !== '').length;
        const finalComma = finalActiveCount >= colorPages ? '' : trailingComma;
        const finalSpace = finalActiveCount >= colorPages ? '' : trailingSpace;

        const joined = validated.filter((p, i) => p !== '' || i === validated.length - 1).join(', ');
        setColorPageNumbersText(joined + finalComma + finalSpace);
    };

    const handleBwPagesChange = (val) => {
        const num = Math.min(docPages, Math.max(0, Number(val)));
        setBwPages(num);
        setColorPages(docPages - num);
    };

    const handleColorPagesChange = (val) => {
        const num = Math.min(docPages, Math.max(0, Number(val)));
        setColorPages(num);
        setBwPages(docPages - num);
    };

    const handleDocPagesChange = (val) => {
        const num = Math.max(1, Number(val));
        setDocPages(num);
        const newColor = Math.min(colorPages, num);
        setColorPages(newColor);
        setBwPages(num - newColor);
    };

    // Calculate pages that will actually be printed
    const pagesToPrint = useMemo(() => {
        if (serviceType === 'RECORD') {
            const startFrom = Number(recordFromPage || 1);
            if (startFrom > 1 && docPages >= startFrom) {
                return Math.max(0, docPages - startFrom + 1);
            }
            return docPages;
        }
        return docPages;
    }, [docPages, recordFromPage, serviceType]);

    // Calculate estimated cost
    const estimatedCost = useMemo(() => {
        if (!selectedShop || !selectedShop.pricing) return null;
        const p = selectedShop.pricing;

        let printedBw = bwPages;
        let printedColor = colorPages;

        if (serviceType === 'RECORD') {
            const totalRemaining = pagesToPrint;
            printedColor = Math.min(colorPages, totalRemaining);
            printedBw = Math.max(0, totalRemaining - printedColor);
        }

        const bwCost = printedBw * (p.bwPerPage || 1);
        const colorCost = printedColor * (p.colorPerPage || 5);
        
        let bindingCost = 0;
        const activeBinding = serviceType === 'RECORD' ? recordBindingType : binding;
        if (activeBinding === 'SPIRAL') bindingCost = p.spiralBinding || 30;
        if (activeBinding === 'BOOK') bindingCost = p.bookBinding || 50;

        const subtotal = (bwCost + colorCost + bindingCost) * Number(copies || 1);
        
        let deliveryCharge = 0;
        const isDelivery = serviceType === 'RECORD' ? (recordDeliveryOption === 'DELIVERY') : (fulfillmentType === 'DELIVERY');
        if (isDelivery && selectedShop.isDeliveryAvailable) {
            deliveryCharge = 15;
        }

        return subtotal + deliveryCharge;
    }, [selectedShop, bwPages, colorPages, copies, binding, fulfillmentType, serviceType, recordBindingType, recordDeliveryOption, pagesToPrint]);

    // Shop listings filter
    const filteredShops = useMemo(() => {
        return shops.filter((shop) => {
            const matchesSearch = shop.shopName.toLowerCase().includes(shopSearch.toLowerCase()) ||
                                 shop.location?.address.toLowerCase().includes(shopSearch.toLowerCase());
            
            if (serviceType === 'DELIVERY') {
                return matchesSearch && shop.isDeliveryAvailable;
            }
            return matchesSearch;
        });
    }, [shops, shopSearch, serviceType]);

    // Drag-and-drop file helpers
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

        incomingFiles.forEach(async (file, i) => {
            const error = validateFile(file);
            
            const fileObj = {
                id: Date.now() + i + Math.random(),
                file,
                progress: 0,
                status: error ? 'failed' : 'pending',
                error: error,
                metadata: null,
                pageCount: 0
            };
            
            newFileObjects.push(fileObj);

            if (!error && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) {
                const detected = await detectPdfPages(file);
                if (detected) {
                    fileObj.pageCount = detected;
                    setDocPages((prev) => {
                        const newTotal = prev === 0 ? detected : prev + detected;
                        setBwPages(newTotal);
                        return newTotal;
                    });
                    showToast(`Auto-detected ${detected} pages in PDF: ${file.name}`, 'success');
                }
            }
        });

        setFiles((prev) => [...prev, ...newFileObjects]);

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
        setFiles((prev) => {
            const filtered = prev.filter((f) => f.id !== fileObj.id);
            if (fileObj.pageCount) {
                setDocPages((prevPages) => {
                    const newTotal = Math.max(0, prevPages - fileObj.pageCount);
                    setBwPages(newTotal);
                    return newTotal;
                });
            }
            return filtered;
        });
    };

    const handleRetryUpload = (fileObj) => {
        uploadSingleFile(fileObj);
    };

    // Form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!shopId.trim()) {
            showToast('Please select a target shop', 'error');
            return;
        }

        if (pagesToPrint < 1) {
            showToast('Total pages to print must be at least 1', 'error');
            return;
        }

        if (!customerContact.trim()) {
            showToast('Please fill in your contact phone number', 'error');
            return;
        }

        if (!customerEmail.trim()) {
            showToast('Please fill in your email address', 'error');
            return;
        }

        if (Number(bwPages) + Number(colorPages) !== Number(docPages)) {
            showToast('The sum of Black & White and Color pages must strictly equal the Total Pages', 'error');
            return;
        }

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
            showToast('Required deadline must be in the future', 'error');
            return;
        }

        if (serviceType === 'RECORD') {
            if (!recordPickupLocation.trim()) {
                showToast('Please provide a record pickup location', 'error');
                return;
            }
            if (recordDeliveryOption === 'DELIVERY' && !recordDeliveryAddress.trim()) {
                showToast('Please provide a delivery address', 'error');
                return;
            }
        } else {
            if (fulfillmentType === 'DELIVERY' && !deliveryAddress.trim()) {
                showToast('Please provide a delivery address', 'error');
                return;
            }
        }

        setLoading(true);
        try {
            let finalInstructions = instructions;
            let finalFulfillment = fulfillmentType;
            let finalAddress = deliveryAddress.trim();
            let finalBinding = binding;

            if (serviceType === 'RECORD') {
                finalInstructions = `[Record Pickup & Binding]
- Continue Printing from Page: ${recordFromPage}
- Record Pickup Location: ${recordPickupLocation}
- Record Pickup Time: ${new Date(recordPickupTime).toLocaleString()}
- Delivery Option: ${recordDeliveryOption === 'DELIVERY' ? 'Home Delivery' : 'Self Pickup'}
- Instructions: ${instructions || 'None'}`;

                finalFulfillment = recordDeliveryOption;
                finalAddress = recordDeliveryOption === 'DELIVERY' ? recordDeliveryAddress.trim() : '';
                finalBinding = recordBindingType;
            }

            const payload = {
                shop: shopId.trim(),
                documents: uploadedDocs,
                bwPages: Number(bwPages),
                colorPages: Number(colorPages),
                copies: Number(copies),
                printSide,
                binding: finalBinding,
                fulfillmentType: finalFulfillment,
                deliveryAddress: finalAddress,
                requiredBy: new Date(requiredBy).toISOString(),
                customerContact: customerContact.trim(),
                customerEmail: customerEmail.trim(),
                instructions: finalInstructions
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

    const renderStepper = () => (
        <div className="stepper-indicator">
            <button 
                type="button" 
                className={`step-node ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}
                onClick={() => step > 1 && setStep(1)}
            >
                <span className="step-number">{step > 1 ? '✓' : '1'}</span>
                <span className="step-label">Service</span>
            </button>
            <div className="step-line"></div>
            <button 
                type="button" 
                className={`step-node ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}
                disabled={step < 2}
                onClick={() => step > 2 && setStep(2)}
            >
                <span className="step-number">{step > 2 ? '✓' : '2'}</span>
                <span className="step-label">Shop</span>
            </button>
            <div className="step-line"></div>
            <div className={`step-node ${step >= 3 ? 'active' : ''}`}>
                <span className="step-number">3</span>
                <span className="step-label">Details</span>
            </div>
        </div>
    );

    return (
        <div className="page-container order-wizard-page">
            {renderStepper()}

            {/* STEP 1: Select Service */}
            {step === 1 && (
                <div className="step-container service-selection-step fade-in">
                    <div className="step-header">
                        <h2>Select Printing Service</h2>
                        <p>Choose the method of printing that matches your needs.</p>
                    </div>

                    <div className="service-cards-grid">
                        <div 
                            className="service-card"
                            onClick={() => {
                                setServiceType('PRINT');
                                setFulfillmentType('PICKUP');
                                setStep(2);
                            }}
                        >
                            <div className="service-icon">📄</div>
                            <h3>Print Documents</h3>
                            <p>Upload digital files for printing. Collect the printed copy yourself from the selected shop.</p>
                            <button type="button" className="btn btn-secondary btn-sm">Select Service</button>
                        </div>

                        <div 
                            className="service-card"
                            onClick={() => {
                                setServiceType('DELIVERY');
                                setFulfillmentType('DELIVERY');
                                setStep(2);
                            }}
                        >
                            <div className="service-icon">🚚</div>
                            <h3>Home Delivery</h3>
                            <p>Upload documents and get them printed and delivered straight to your hostel or room.</p>
                            <button type="button" className="btn btn-secondary btn-sm">Select Service</button>
                        </div>

                        <div 
                            className="service-card"
                            onClick={() => {
                                setServiceType('RECORD');
                                setStep(2);
                            }}
                        >
                            <div className="service-icon">📘</div>
                            <h3>Record Pickup & Binding</h3>
                            <p>Submit written logs. We will collect them, print remaining PDF sheets, bind them, and deliver.</p>
                            <button type="button" className="btn btn-secondary btn-sm">Select Service</button>
                        </div>
                    </div>
                </div>
            )}

            {/* STEP 2: Shop Selection */}
            {step === 2 && (
                <div className="step-container shop-selection-step fade-in">
                    <div className="step-header">
                        <h2>Select Xerox Shop</h2>
                        <p>Showing approved print shops near your location.</p>
                    </div>

                    <div className="search-filter-row">
                        <input 
                            type="text" 
                            placeholder="🔍 Search shop name or location..." 
                            value={shopSearch}
                            onChange={(e) => setShopSearch(e.target.value)}
                            className="shop-search-input"
                        />
                    </div>

                    {loadingShops ? (
                        <div className="skeleton-container">
                            <div className="skeleton-card"></div>
                            <div className="skeleton-card"></div>
                        </div>
                    ) : filteredShops.length > 0 ? (
                        <div className="shop-list">
                            {filteredShops.map((s) => {
                                return (
                                    <div key={s._id} className="shop-list-card">
                                        <div className="shop-card-main">
                                            <h3>{s.shopName}</h3>
                                            <p className="shop-location-text">📍 {s.location?.address}</p>

                                            <div className="shop-badges">
                                                <span className="badge">B&W: ₹{s.pricing?.bwPerPage}/pg</span>
                                                <span className="badge">Color: ₹{s.pricing?.colorPerPage}/pg</span>
                                                {s.isDeliveryAvailable && <span className="badge delivery-badge">Delivery Available</span>}
                                            </div>
                                        </div>
                                        <div className="shop-card-actions">
                                            <button 
                                                type="button" 
                                                className="btn btn-primary"
                                                onClick={() => {
                                                    setShopId(s._id);
                                                    setSelectedShop(s);
                                                    setStep(3);
                                                }}
                                            >
                                                Select Shop
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="empty-state text-center">
                            <p>No shops found matching your search criteria.</p>
                        </div>
                    )}

                    <div className="navigation-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>
                            Back to Step 1
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 3: Specifications & Summary */}
            {step === 3 && (
                <div className="step-container specs-step fade-in">
                    <div className="specs-layout-grid">
                        
                        {/* Specifications Form Column */}
                        <div className="specs-form-container card">
                            <div className="step-header">
                                <h2>Configure Specifications</h2>
                                <p>Provide details for: <strong>{selectedShop?.shopName}</strong></p>
                            </div>

                            <form onSubmit={handleSubmit} className="order-form">
                                
                                {/* A. PRINT DOCUMENT SPECIFIC FIELDS */}
                                {(serviceType === 'PRINT' || serviceType === 'DELIVERY') && (
                                    <>
                                        {/* Drag and Drop File Input */}
                                        <div className="form-group">
                                            <label>Upload Documents ({files.length}/10) *</label>
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
                                                <button type="button" className="btn btn-secondary btn-xs" style={{ pointerEvents: 'none', marginTop: '0.5rem', marginBottom: '0.25rem' }}>Browse Files</button>
                                                <div className="upload-dropzone-subtext">
                                                    PDF, Word, Slides, Sheets, Images up to 100MB
                                                </div>
                                            </div>

                                            {/* File List Queue */}
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
                                                                                 ['doc', 'docx'].includes(ext) ? '📘' : '📄'}
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
                                                                                <div className="file-progress-bar" style={{ width: `${fileObj.progress}%` }}></div>
                                                                            </div>
                                                                        )}
                                                                        {fileObj.error && (
                                                                            <div className="error-message-text">{fileObj.error}</div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="file-item-actions">
                                                                    {fileObj.status === 'failed' && (
                                                                        <button type="button" className="btn btn-secondary btn-xs" onClick={() => handleRetryUpload(fileObj)}>Retry</button>
                                                                    )}
                                                                    <button type="button" className="remove-doc-btn" onClick={() => handleRemoveFile(fileObj)}>Remove</button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        {/* Total Pages override and Color Calculations */}
                                        <div className="form-group">
                                            <label htmlFor="docPages">Total Pages (Detected/Manual) *</label>
                                            <input
                                                id="docPages"
                                                type="number"
                                                min={1}
                                                value={docPages}
                                                onChange={(e) => handleDocPagesChange(e.target.value)}
                                                required
                                            />
                                        </div>

                                        <div className="form-row">
                                            <div className="form-group">
                                                <label htmlFor="bwPages">B&W Pages</label>
                                                <input
                                                    id="bwPages"
                                                    type="number"
                                                    min={0}
                                                    value={bwPages}
                                                    onChange={(e) => handleBwPagesChange(e.target.value)}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label htmlFor="colorPages">Color Pages</label>
                                                <input
                                                    id="colorPages"
                                                    type="number"
                                                    min={0}
                                                    value={colorPages}
                                                    onChange={(e) => handleColorPagesChange(e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="colorPageNumbersText">Specific Color Page Numbers (Optional)</label>
                                            <input
                                                id="colorPageNumbersText"
                                                type="text"
                                                placeholder="e.g. 1, 5, 8, 12"
                                                value={colorPageNumbersText}
                                                onChange={(e) => handleColorPageNumbersChange(e.target.value)}
                                            />
                                        </div>

                                        {/* Printing Options */}
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
                                                <select id="printSide" value={printSide} onChange={(e) => setPrintSide(e.target.value)}>
                                                    <option value="SINGLE_SIDE">Single Sided</option>
                                                    <option value="DOUBLE_SIDE">Double Sided</option>
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label htmlFor="binding">Binding option *</label>
                                                <select id="binding" value={binding} onChange={(e) => setBinding(e.target.value)}>
                                                    <option value="NONE">None</option>
                                                    <option value="SPIRAL">Spiral Binding</option>
                                                    <option value="BOOK">Book Binding</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* Delivery/Fulfillment */}
                                        {serviceType === 'DELIVERY' && (
                                            <div className="form-group delivery-input-block">
                                                <label htmlFor="deliveryAddress">Hostel / Room Delivery Address *</label>
                                                <textarea
                                                    id="deliveryAddress"
                                                    rows={2}
                                                    placeholder="Specify building name, room number, floor..."
                                                    value={deliveryAddress}
                                                    onChange={(e) => setDeliveryAddress(e.target.value)}
                                                    required
                                                />
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* B. RECORD PICKUP & BINDING SPECIFIC FIELDS */}
                                {serviceType === 'RECORD' && (
                                    <>
                                        <div className="form-group">
                                            <label>Upload PDF for Remaining Sheets *</label>
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
                                                    style={{ display: 'none' }}
                                                    onChange={handleFileSelect}
                                                    accept=".pdf"
                                                />
                                                <div className="upload-dropzone-icon">📓</div>
                                                <div className="upload-dropzone-text">Drag & Drop record PDF file here</div>
                                                <button type="button" className="btn btn-secondary btn-xs" style={{ pointerEvents: 'none', marginTop: '0.5rem', marginBottom: '0.25rem' }}>Browse Files</button>
                                            </div>

                                            {files.length > 0 && (
                                                <div className="file-list">
                                                    {files.map((fileObj) => (
                                                        <div key={fileObj.id} className="file-item-card">
                                                            <div className="file-item-info">
                                                                <span className="file-item-preview">📕</span>
                                                                <div className="file-item-meta">
                                                                    <div className="file-item-name">{fileObj.file.name}</div>
                                                                    <div className="file-item-size-status">
                                                                        <span>{(fileObj.file.size / (1024 * 1024)).toFixed(2)} MB</span>
                                                                        <span className={`file-status-tag ${fileObj.status}`}>{fileObj.status}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <button type="button" className="remove-doc-btn" onClick={() => handleRemoveFile(fileObj)}>Remove</button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="form-row">
                                            <div className="form-group">
                                                <label htmlFor="docPages">Total Pages in PDF *</label>
                                                <input
                                                    id="docPages"
                                                    type="number"
                                                    min={1}
                                                    value={docPages}
                                                    onChange={(e) => handleDocPagesChange(e.target.value)}
                                                    required
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label htmlFor="recordFromPage">Continue Printing from Page *</label>
                                                <input
                                                    id="recordFromPage"
                                                    type="number"
                                                    min={1}
                                                    value={recordFromPage}
                                                    onChange={(e) => setRecordFromPage(Math.max(1, Number(e.target.value)))}
                                                    required
                                                />
                                                <small className="field-help">We print from this page to end of PDF.</small>
                                            </div>
                                        </div>

                                        <div className="form-row">
                                            <div className="form-group">
                                                <label htmlFor="recordPickupLocation">Record Pickup Location *</label>
                                                <input
                                                    id="recordPickupLocation"
                                                    type="text"
                                                    placeholder="e.g. Hostel 4, Room 302"
                                                    value={recordPickupLocation}
                                                    onChange={(e) => setRecordPickupLocation(e.target.value)}
                                                    required
                                                />
                                            </div>
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
                                        </div>

                                        <div className="form-row">
                                            <div className="form-group">
                                                <label htmlFor="recordBindingType">Binding Type *</label>
                                                <select id="recordBindingType" value={recordBindingType} onChange={(e) => setRecordBindingType(e.target.value)}>
                                                    <option value="SPIRAL">Spiral Binding</option>
                                                    <option value="BOOK">Book Binding</option>
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label htmlFor="recordDeliveryOption">Final Delivery Option *</label>
                                                <select id="recordDeliveryOption" value={recordDeliveryOption} onChange={(e) => setRecordDeliveryOption(e.target.value)}>
                                                    <option value="PICKUP">Self Pickup from Shop</option>
                                                    <option value="DELIVERY">Delivery to Location</option>
                                                </select>
                                            </div>
                                        </div>

                                        {recordDeliveryOption === 'DELIVERY' && (
                                            <div className="form-group">
                                                <label htmlFor="recordDeliveryAddress">Delivery Address *</label>
                                                <textarea
                                                    id="recordDeliveryAddress"
                                                    rows={2}
                                                    placeholder="Specify building name, room number..."
                                                    value={recordDeliveryAddress}
                                                    onChange={(e) => setRecordDeliveryAddress(e.target.value)}
                                                    required
                                                />
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* Common inputs (Contact, Deadline, Instructions) */}
                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="customerContact">Your Phone Number *</label>
                                        <input
                                            id="customerContact"
                                            type="tel"
                                            placeholder="Enter phone number"
                                            value={customerContact}
                                            onChange={(e) => setCustomerContact(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="customerEmail">Your Email Address *</label>
                                        <input
                                            id="customerEmail"
                                            type="email"
                                            placeholder="Enter email address"
                                            value={customerEmail}
                                            onChange={(e) => setCustomerEmail(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group deadline-row-full">
                                        <label htmlFor="requiredBy">Required Completion Deadline *</label>
                                        <input
                                            id="requiredBy"
                                            type="datetime-local"
                                            value={requiredBy}
                                            onChange={(e) => setRequiredBy(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="instructions">Special Instructions (Optional)</label>
                                    <textarea
                                        id="instructions"
                                        rows={2}
                                        placeholder="e.g. Single sided print, specific page requests..."
                                        value={instructions}
                                        onChange={(e) => setInstructions(e.target.value)}
                                    />
                                </div>

                                <div className="specs-actions">
                                    <button type="button" className="btn btn-secondary" onClick={() => setStep(2)}>
                                        Back to Step 2
                                    </button>
                                    <button type="submit" className="btn btn-primary" disabled={loading}>
                                        {loading ? <div className="spinner"></div> : 'Place Order'}
                                    </button>
                                </div>

                            </form>
                        </div>

                        {/* Sticky Order Summary Column (Desktop) */}
                        <div className="summary-sidebar-container">
                            <div className="summary-sidebar card">
                                <h3>Order Summary</h3>
                                <hr />
                                <div className="summary-details">
                                    <div className="summary-row">
                                        <span>Service Type</span>
                                        <strong>
                                            {serviceType === 'PRINT' && 'Print Documents'}
                                            {serviceType === 'DELIVERY' && 'Home Delivery'}
                                            {serviceType === 'RECORD' && 'Record Binding'}
                                        </strong>
                                    </div>
                                    <div className="summary-row">
                                        <span>Xerox Shop</span>
                                        <strong>{selectedShop?.shopName || 'N/A'}</strong>
                                    </div>

                                    {serviceType === 'RECORD' ? (
                                        <>
                                            <div className="summary-row">
                                                <span>PDF Total Pages</span>
                                                <strong>{docPages} pages</strong>
                                            </div>
                                            <div className="summary-row">
                                                <span>Print From Page</span>
                                                <strong>{recordFromPage}</strong>
                                            </div>
                                            <div className="summary-row">
                                                <span>Pages to Print</span>
                                                <strong>{pagesToPrint} pages</strong>
                                            </div>
                                            <div className="summary-row">
                                                <span>Binding Choice</span>
                                                <strong>{recordBindingType}</strong>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="summary-row">
                                                <span>Total Pages</span>
                                                <strong>{docPages} pages</strong>
                                            </div>
                                            <div className="summary-row">
                                                <span>B&W Pages</span>
                                                <strong>{bwPages} pages</strong>
                                            </div>
                                            <div className="summary-row">
                                                <span>Color Pages</span>
                                                <strong>{colorPages} pages</strong>
                                            </div>
                                            <div className="summary-row">
                                                <span>Copies</span>
                                                <strong>{copies} copies</strong>
                                            </div>
                                            <div className="summary-row">
                                                <span>Binding Option</span>
                                                <strong>{binding}</strong>
                                            </div>
                                        </>
                                    )}

                                    <div className="summary-row">
                                        <span>Fulfillment Option</span>
                                        <strong>
                                            {serviceType === 'RECORD' 
                                                ? (recordDeliveryOption === 'DELIVERY' ? 'Hostel Delivery' : 'Pickup')
                                                : (fulfillmentType === 'DELIVERY' ? 'Hostel Delivery' : 'Self Pickup')
                                            }
                                        </strong>
                                    </div>

                                    <div className="summary-row documents-preview-row">
                                        <span>Documents</span>
                                        <div className="summary-docs-list">
                                            {files.length > 0 ? (
                                                files.map(f => <div key={f.id} className="summary-doc-tag">📄 {f.file.name}</div>)
                                            ) : (
                                                <span className="no-docs-tag">No documents uploaded</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="summary-price-box">
                                    <span>Estimated Cost</span>
                                    <div className="price-tag">₹{estimatedCost || 0}</div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
};

export default PlaceOrder;
