import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import API from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import './Order.css';

// Enhanced fallback PDF Page count detector using lightweight binary/text regex search
const fallbackDetectPdfPages = async (file) => {
    try {
        let text = '';
        const decoder = new TextDecoder('ascii');
        
        if (file.size <= 4 * 1024 * 1024) {
            const buffer = await file.arrayBuffer();
            text = decoder.decode(new Uint8Array(buffer));
        } else {
            // Read first 2MB
            const sliceStart = file.slice(0, 2 * 1024 * 1024);
            const bufStart = await sliceStart.arrayBuffer();
            const textStart = decoder.decode(new Uint8Array(bufStart));
            
            // Read last 2MB
            const sliceEnd = file.slice(file.size - 2 * 1024 * 1024);
            const bufEnd = await sliceEnd.arrayBuffer();
            const textEnd = decoder.decode(new Uint8Array(bufEnd));
            
            text = textStart + '\n=== SPLIT ===\n' + textEnd;
        }
        
        const pagesMatches = [...text.matchAll(/\/Type\s*\/Pages[\s\S]*?\/Count\s*(\d+)/gi)];
        if (pagesMatches.length > 0) {
            const counts = pagesMatches.map(m => parseInt(m[1], 10)).filter(c => !isNaN(c));
            if (counts.length > 0) {
                return Math.max(...counts);
            }
        }
        
        const countMatches = [...text.matchAll(/\/Count\s*(\d+)/gi)];
        if (countMatches.length > 0) {
            const counts = countMatches.map(m => parseInt(m[1], 10)).filter(c => !isNaN(c) && c < 5000);
            if (counts.length > 0) {
                return Math.max(...counts);
            }
        }
    } catch (err) {
        console.error('Failed to run fallback PDF page count detection:', err);
    }
    return null;
};

// PDF Page count detector using dynamic loading of PDF.js
const detectPdfPages = async (file) => {
    try {
        // Dynamically load pdfjs-dist from a CDN if it's not already loaded
        if (!window.pdfjsLib) {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
                script.onload = () => {
                    // Configure worker Src
                    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                    resolve();
                };
                script.onerror = (err) => reject(new Error('Failed to load PDF.js CDN: ' + err.message));
                document.head.appendChild(script);
            });
        }

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        if (pdf && typeof pdf.numPages === 'number') {
            console.log(`[PDF Detector] PDF.js successfully detected ${pdf.numPages} pages.`);
            return pdf.numPages;
        }
    } catch (err) {
        console.warn('Failed to auto-detect PDF page count with PDF.js, falling back to regex:', err);
    }
    // Fallback to the enhanced regex-based count detection if PDF.js fails or is offline
    return await fallbackDetectPdfPages(file);
};

const parseColorPageNumbers = (text) => {
    if (!text || !text.trim()) return [];
    return text.split(',')
        .map(p => p.trim())
        .filter(Boolean)
        .map(p => parseInt(p, 10))
        .filter(num => !isNaN(num));
};

export const PlaceOrder = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const location = useLocation();

    // Wizard Stepper State: Steps 1 to 5
    const [step, setStep] = useState(1);
    const [serviceType, setServiceType] = useState('PRINT'); // 'PRINT' | 'DELIVERY' | 'RECORD'

    const [shops, setShops] = useState([]);
    const [selectedShop, setSelectedShop] = useState(null);
    const [shopId, setShopId] = useState('');
    const [shopSearch, setShopSearch] = useState('');
    
    const [files, setFiles] = useState([]);
    const [dragActive, setDragActive] = useState(false);

    // Order-Level details
    const [customerContact, setCustomerContact] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [instructions, setInstructions] = useState('');
    const [requiredBy, setRequiredBy] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d.toISOString().slice(0, 16);
    });

    // Advanced Fulfillment & Pricing State
    const [fulfillmentMethod, setFulfillmentMethod] = useState('SHOP_PICKUP'); // 'SHOP_PICKUP' | 'HOME_DELIVERY' | 'RECORD_PICKUP'
    const [deliveryType, setDeliveryType] = useState('NONE'); // 'STANDARD' | 'EXPRESS' | 'NONE'
    const [deliveryDistance, setDeliveryDistance] = useState(0); 
    const [selectedSlabIndex, setSelectedSlabIndex] = useState(-1);
    const [paymentType, setPaymentType] = useState('UPI'); // 'UPI' | 'COD' | 'ONLINE'

    // Regular Print Fulfillment (Legacy)
    const [fulfillmentType, setFulfillmentType] = useState('PICKUP');
    const [deliveryAddress, setDeliveryAddress] = useState('');

    // Record pickup & fulfillment details
    const [recordPickupLocation, setRecordPickupLocation] = useState('');
    const [recordPickupTime, setRecordPickupTime] = useState(() => {
        const d = new Date();
        d.setHours(d.getHours() + 2);
        return d.toISOString().slice(0, 16);
    });
    const [recordBindingType, setRecordBindingType] = useState('SPIRAL');
    const [recordDeliveryOption, setRecordDeliveryOption] = useState('PICKUP');
    const [recordDeliveryAddress, setRecordDeliveryAddress] = useState('');

    const [loading, setLoading] = useState(false);
    const [loadingShops, setLoadingShops] = useState(true);

    const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'webp'];
    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

    // Pre-populate user details
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

    // Keep fulfillmentMethod & deliveryType in sync with Step 1 and Step 4 choices
    useEffect(() => {
        if (selectedShop) {
            if (serviceType === 'DELIVERY') {
                setFulfillmentMethod('HOME_DELIVERY');
                if (selectedShop.homeDelivery) {
                    setDeliveryType('STANDARD');
                } else if (selectedShop.expressPrinting) {
                    setDeliveryType('EXPRESS');
                } else {
                    setDeliveryType('NONE');
                }
            } else if (serviceType === 'RECORD') {
                setFulfillmentMethod('RECORD_PICKUP');
                if (recordDeliveryOption === 'DELIVERY') {
                    if (selectedShop.homeDelivery) {
                        setDeliveryType('STANDARD');
                    } else if (selectedShop.expressPrinting) {
                        setDeliveryType('EXPRESS');
                    } else {
                        setDeliveryType('NONE');
                    }
                } else {
                    setDeliveryType('NONE');
                }
            } else {
                setFulfillmentMethod('SHOP_PICKUP');
                setDeliveryType('NONE');
            }
        }
    }, [selectedShop, serviceType, recordDeliveryOption]);

    // Reset slab selections when deliveryType changes
    useEffect(() => {
        setSelectedSlabIndex(-1);
        setDeliveryDistance(0);
    }, [deliveryType]);

    // Fetch approved shops
    useEffect(() => {
        const fetchShops = async () => {
            try {
                const res = await API.get('/shops/approved');
                let list = res.data?.data || [];
                
                // Do not let a shop owner select their own shop
                if (user) {
                    list = list.filter(s => s.owner !== user._id && s.owner?._id !== user._id);
                }
                
                setShops(list);
                
                const searchParams = new URLSearchParams(location.search);
                const queryShopId = searchParams.get('shopId') || location.state?.shopId;

                if (queryShopId && list.some(s => s._id === queryShopId)) {
                    setShopId(queryShopId);
                    const found = list.find((s) => s._id === queryShopId);
                    setSelectedShop(found || null);
                    setStep(3); // skip straight to specifications config
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

    // Ensure fulfillment matches service type
    useEffect(() => {
        if (selectedShop) {
            if (serviceType === 'DELIVERY') {
                setFulfillmentType('DELIVERY');
            } else if (serviceType === 'PRINT') {
                setFulfillmentType('PICKUP');
            }
        }
    }, [selectedShop, serviceType]);

    // Shop Listings filter
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

    // Drag-and-drop helpers
    const validateFile = (file) => {
        const ext = file.name.split('.').pop().toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
            return 'Unsupported file type. Please upload only PDF or image files.';
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
                error: err.response?.data?.message || err.message || 'Upload failed'
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
            const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
            
            const fileObj = {
                id: Date.now() + i + Math.random(),
                file,
                progress: 0,
                status: error ? 'failed' : 'pending',
                error: error,
                metadata: null,
                
                // Individual file print specifications
                pageCount: 1, // Default to 1 (for images)
                startPage: 1,
                lastPage: 1,
                bwPages: 1,
                colorPages: 0,
                colorPageNumbersText: '',
                copies: 1,
                printSide: 'SINGLE_SIDE',
                binding: 'NONE',
                isCollapsed: false // Expand initially for settings config
            };
            
            newFileObjects.push(fileObj);

            if (!error && isPdf) {
                const detected = await detectPdfPages(file);
                if (detected) {
                    setFiles(prev => prev.map(f => {
                        if (f.id === fileObj.id) {
                            return {
                                ...f,
                                pageCount: detected,
                                lastPage: detected,
                                bwPages: detected
                            };
                        }
                        return f;
                    }));
                    showToast(`Auto-detected ${detected} pages in PDF: ${file.name}`, 'success');
                } else {
                    setFiles(prev => prev.map(f => {
                        if (f.id === fileObj.id) {
                            return {
                                ...f,
                                pageCount: 1,
                                lastPage: 1,
                                bwPages: 1
                            };
                        }
                        return f;
                    }));
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
        setFiles((prev) => prev.filter((f) => f.id !== fileObj.id));
    };

    const handleRetryUpload = (fileObj) => {
        uploadSingleFile(fileObj);
    };

    // File card validation helper
    const getFileValidationError = (f) => {
        if (f.status !== 'success') return null;

        const start = Number(f.startPage || 1);
        const last = Number(f.lastPage || 1);
        const count = Number(f.pageCount || 1);
        const copies = Number(f.copies || 1);

        if (start < 1) return "Start page must be at least 1.";
        if (last > count) return `Last page cannot exceed document total (${count}).`;
        if (start > last) return "Start page cannot be greater than last page.";

        const printedPages = last - start + 1;

        if (f.colorPageNumbersText && f.colorPageNumbersText.trim()) {
            const parts = f.colorPageNumbersText.split(',').map(p => p.trim());
            const pageNumbers = [];
            
            for (const part of parts) {
                if (!part) continue;
                const num = parseInt(part, 10);
                if (isNaN(num) || num.toString() !== part) {
                    return `Invalid page number format: "${part}". Must be valid integers.`;
                }
                pageNumbers.push(num);
            }

            const uniquePages = [...new Set(pageNumbers)];
            if (uniquePages.length !== pageNumbers.length) {
                return "Duplicate color page numbers are not allowed.";
            }

            for (const num of pageNumbers) {
                if (num < start || num > last) {
                    return `Color page number ${num} is outside the selected print range [${start}-${last}].`;
                }
            }

            if (pageNumbers.length > printedPages) {
                return "Number of color pages exceeds total printed pages.";
            }
        }

        if (copies < 1) return "Copies must be at least 1.";

        return null;
    };

    // Verify all uploaded files configurations are valid
    const isAllFilesValid = useMemo(() => {
        const uploaded = files.filter(f => f.status === 'success');
        if (uploaded.length === 0) return false;
        
        return files.every(f => {
            if (f.status === 'failed') return false;
            if (f.status === 'pending' || f.status === 'uploading') return false;
            return getFileValidationError(f) === null;
        });
    }, [files]);

    // Calculate dynamic delivery charge
    const calculatedDeliveryCharge = useMemo(() => {
        const isDelivery = (fulfillmentMethod === 'HOME_DELIVERY') || 
                           (fulfillmentMethod === 'RECORD_PICKUP' && deliveryType !== 'NONE');
        if (!isDelivery || !selectedShop) return 0;
        
        if (deliveryType === 'EXPRESS') {
            if (selectedShop.freeExpressDelivery) return 0;
            const slab = selectedShop.expressDeliveryCharges?.[selectedSlabIndex];
            return slab ? slab.charge : 0;
        } else {
            if (selectedShop.freeDelivery) return 0;
            const slab = selectedShop.deliveryCharges?.[selectedSlabIndex];
            return slab ? slab.charge : 0;
        }
    }, [fulfillmentMethod, deliveryType, selectedSlabIndex, selectedShop]);

    // Calculate dynamic cost estimates
    const estimatedCost = useMemo(() => {
        if (!selectedShop || !selectedShop.pricing) return 0;
        const p = selectedShop.pricing;

        let totalSubtotal = 0;
        files.forEach(f => {
            if (f.status !== 'success') return;
            const bw = Number(f.bwPages || 0);
            const color = Number(f.colorPages || 0);
            const copies = Number(f.copies || 1);
            
            const bwCost = bw * (p.bwPerPage || 1);
            const colorCost = color * (p.colorPerPage || 5);
            
            let fileBindingCost = 0;
            if (f.binding === 'SPIRAL') fileBindingCost = p.spiralBinding || 30;
            if (f.binding === 'BOOK') fileBindingCost = p.bookBinding || 50;
            
            totalSubtotal += (bwCost + colorCost + fileBindingCost) * copies;
        });

        let recordBindingCost = 0;
        if (serviceType === 'RECORD') {
            if (recordBindingType === 'SPIRAL') recordBindingCost = p.spiralBinding || 30;
            if (recordBindingType === 'BOOK') recordBindingCost = p.bookBinding || 50;
        }

        return totalSubtotal + recordBindingCost + calculatedDeliveryCharge;
    }, [files, selectedShop, serviceType, recordBindingType, calculatedDeliveryCharge]);

    // Handle Order Submission
    const handlePlaceOrderSubmit = async () => {
        if (!shopId.trim()) {
            showToast('Please select a target shop', 'error');
            return;
        }

        const uploadedDocs = files.filter(f => f.status === 'success');
        if (uploadedDocs.length === 0) {
            showToast('Please upload at least 1 valid document', 'error');
            return;
        }

        for (const f of uploadedDocs) {
            const err = getFileValidationError(f);
            if (err) {
                showToast(`Validation error in ${f.file.name}: ${err}`, 'error');
                return;
            }
        }

        if (!customerContact.trim() || customerContact.length !== 10) {
            showToast('Please provide a valid 10-digit phone number', 'error');
            return;
        }

        if (!customerEmail.trim()) {
            showToast('Please provide your email address', 'error');
            return;
        }

        if (new Date(requiredBy) <= new Date()) {
            showToast('Required deadline must be in the future', 'error');
            return;
        }

        const isDelivery = (serviceType === 'DELIVERY') || 
                           (serviceType === 'RECORD' && recordDeliveryOption === 'DELIVERY');

        if (serviceType === 'RECORD') {
            if (!recordPickupLocation.trim()) {
                showToast('Please provide a record pickup location', 'error');
                return;
            }
            if (recordDeliveryOption === 'DELIVERY' && !recordDeliveryAddress.trim()) {
                showToast('Please provide a delivery address', 'error');
                return;
            }
        } else if (serviceType === 'DELIVERY') {
            if (!deliveryAddress.trim()) {
                showToast('Please provide a delivery address', 'error');
                return;
            }
        }

        // Validate distance slab selection if delivery is selected and not free
        const isFree = deliveryType === 'EXPRESS' ? selectedShop?.freeExpressDelivery : selectedShop?.freeDelivery;
        if (isDelivery && !isFree) {
            const currentSlabs = deliveryType === 'EXPRESS' ? selectedShop?.expressDeliveryCharges : selectedShop?.deliveryCharges;
            if (!currentSlabs?.length || selectedSlabIndex < 0) {
                showToast('Please select a valid delivery distance range', 'error');
                return;
            }
        }

        setLoading(true);
        try {
            const documentsPayload = uploadedDocs.map(f => ({
                publicId: f.metadata.publicId,
                url: f.metadata.url,
                originalName: f.metadata.originalName,
                size: f.metadata.size,
                mimeType: f.metadata.mimeType,
                pageCount: Number(f.pageCount),
                startPage: Number(f.startPage),
                lastPage: Number(f.lastPage),
                bwPages: Number(f.bwPages),
                colorPages: Number(f.colorPages),
                colorPageNumbersText: f.colorPageNumbersText,
                copies: Number(f.copies),
                printSide: f.printSide,
                binding: f.binding
            }));

            let finalInstructions = instructions;
            let finalAddress = '';
            let finalBinding = 'NONE';
            let finalFulfillmentMethod = 'SHOP_PICKUP';

            if (serviceType === 'RECORD') {
                finalFulfillmentMethod = 'RECORD_PICKUP';
                finalInstructions = `[Record Pickup & Binding]
- Record Pickup Location: ${recordPickupLocation}
- Record Pickup Time: ${new Date(recordPickupTime).toLocaleString()}
- Delivery Option: ${recordDeliveryOption === 'DELIVERY' ? 'Home Delivery' : 'Self Pickup'}
- Instructions: ${instructions || 'None'}`;

                finalAddress = recordDeliveryOption === 'DELIVERY' ? recordDeliveryAddress.trim() : '';
                finalBinding = recordBindingType;
            } else if (serviceType === 'DELIVERY') {
                finalFulfillmentMethod = 'HOME_DELIVERY';
                finalAddress = deliveryAddress.trim();
            } else {
                finalFulfillmentMethod = 'SHOP_PICKUP';
            }

            if (serviceType !== 'RECORD') {
                const hasSpiral = documentsPayload.some(d => d.binding === 'SPIRAL');
                const hasBook = documentsPayload.some(d => d.binding === 'BOOK');
                if (hasSpiral) finalBinding = 'SPIRAL';
                else if (hasBook) finalBinding = 'BOOK';
            }

            const rootBw = documentsPayload.reduce((sum, d) => sum + d.bwPages * d.copies, 0);
            const rootColor = documentsPayload.reduce((sum, d) => sum + d.colorPages * d.copies, 0);
            const rootCopies = 1;
            const rootPrintSide = documentsPayload[0]?.printSide || 'SINGLE_SIDE';

            const payload = {
                shop: shopId.trim(),
                documents: documentsPayload,
                bwPages: rootBw,
                colorPages: rootColor,
                copies: rootCopies,
                printSide: rootPrintSide,
                binding: finalBinding,
                requiredBy: new Date(requiredBy).toISOString(),
                customerContact: customerContact.trim(),
                customerEmail: customerEmail.trim(),
                instructions: finalInstructions,
                
                // Advanced Fulfillment & Pricing
                fulfillmentMethod: finalFulfillmentMethod,
                deliveryType: isDelivery ? deliveryType : 'NONE',
                deliveryDistance: Number(deliveryDistance || 0),
                paymentType: paymentType,

                // Legacy fulfillmentType and address for backward compatibility
                fulfillmentType: isDelivery ? 'DELIVERY' : 'PICKUP',
                deliveryAddress: finalAddress
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

    // Stepper wizard navigation renderer
    const renderStepper = () => {
        const stepLabels = [
            'Service',
            'Shop',
            serviceType === 'RECORD' ? 'Print Details' : 'Configure Files',
            serviceType === 'RECORD' ? 'Fulfillment' : 'Order Details',
            'Review'
        ];

        return (
            <div className="stepper-indicator">
                {stepLabels.map((label, idx) => {
                    const currentStepNum = idx + 1;
                    const isActive = step >= currentStepNum;
                    const isCompleted = step > currentStepNum;
                    
                    return (
                        <React.Fragment key={idx}>
                            <button 
                                type="button" 
                                className={`step-node ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                                onClick={() => {
                                    if (currentStepNum < step) {
                                        setStep(currentStepNum);
                                    }
                                }}
                                disabled={currentStepNum >= step}
                                style={{ cursor: currentStepNum < step ? 'pointer' : 'default' }}
                            >
                                <span className="step-number">{isCompleted ? '✓' : currentStepNum}</span>
                                <span className="step-label">{label}</span>
                            </button>
                            {idx < stepLabels.length - 1 && <div className="step-line"></div>}
                        </React.Fragment>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="order-wizard-page">
            {renderStepper()}

            {/* STEP 1: Service Selection */}
            {step === 1 && (
                <div className="step-container service-step fade-in">
                    <div className="step-header text-center" style={{ marginBottom: '2.5rem' }}>
                        <h1>Select Xerox Service</h1>
                        <p style={{ color: 'var(--text-secondary)' }}>Choose how you want to print or bind your documents.</p>
                    </div>

                    <div className="service-cards-grid">
                        <div 
                            className="service-card"
                            onClick={() => {
                                setServiceType('PRINT');
                                setStep(2);
                            }}
                        >
                            <div className="service-icon">🖨️</div>
                            <h3>Shop Pickup</h3>
                            <p>Upload files online, configure page properties, and collect printed sheets directly from the shop.</p>
                            <button type="button" className="btn btn-secondary btn-sm">Select Service</button>
                        </div>

                        <div 
                            className="service-card"
                            onClick={() => {
                                setServiceType('DELIVERY');
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

            {/* STEP 3: File Configuration (Regular & Record) */}
            {step === 3 && (
                <div className="step-container specs-step fade-in">
                    <div className="step-header">
                        <h2>
                            {serviceType === 'RECORD' ? 'Step 1 — Upload Record PDF & Config' : 'Configure Printing Details'}
                        </h2>
                    </div>

                    <div className="specs-layout-grid">
                        <div className="specs-form-container card" style={{ padding: '1.5rem' }}>
                            {/* File Upload zone */}
                            <div className="form-group">
                                <label>Upload Files ({files.length}/10) *</label>
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
                                        multiple={serviceType !== 'RECORD'}
                                        style={{ display: 'none' }}
                                        onChange={handleFileSelect}
                                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                                    />
                                    <div className="upload-dropzone-icon">📥</div>
                                    <div className="upload-dropzone-text">Drag & Drop files here or click to browse</div>
                                    <button type="button" className="btn btn-secondary btn-xs" style={{ pointerEvents: 'none', marginTop: '0.5rem' }}>Browse Files</button>
                                    <div className="upload-dropzone-subtext" style={{ marginTop: '0.5rem' }}>
                                        PDF and Images (JPG, PNG, WEBP) only up to 100MB
                                    </div>
                                </div>
                            </div>

                            {/* Collapsible File Configuration list */}
                            {files.length > 0 && (
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 600 }}>Configure Files</label>
                                    
                                    {files.map((fileObj) => {
                                        const validationError = getFileValidationError(fileObj);
                                        const isImage = fileObj.file.type.startsWith('image/') || !fileObj.file.name.toLowerCase().endsWith('.pdf');
                                        
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
                                                            <div className="file-card-name-sec" title={fileObj.file.name}>{fileObj.file.name}</div>
                                                            <div className="file-card-summary-sec">
                                                                {fileObj.status === 'success' ? (
                                                                    <span>
                                                                        {fileObj.pageCount} pg(s) • Pages {fileObj.startPage}-{fileObj.lastPage} • {fileObj.bwPages} B&W / {fileObj.colorPages} Color • {fileObj.copies} copy(ies) • {fileObj.printSide === 'SINGLE_SIDE' ? 'Single' : 'Double'} • Binding: {fileObj.binding}
                                                                    </span>
                                                                ) : (
                                                                    <span style={{ textTransform: 'uppercase', fontWeight: 600, color: fileObj.status === 'failed' ? '#ef4444' : 'var(--text-muted)' }}>
                                                                        {fileObj.status} {fileObj.progress > 0 && fileObj.status === 'uploading' ? `(${fileObj.progress}%)` : ''}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="file-card-header-right" onClick={(e) => e.stopPropagation()}>
                                                        <button 
                                                            type="button" 
                                                            className="btn btn-secondary btn-xs"
                                                            onClick={() => updateFileStatus(fileObj.id, { isCollapsed: !fileObj.isCollapsed })}
                                                        >
                                                            {fileObj.isCollapsed ? 'Expand ⚙️' : 'Collapse ▴'}
                                                        </button>
                                                        <button 
                                                            type="button" 
                                                            className="btn btn-danger btn-xs" 
                                                            style={{ backgroundColor: '#fee2e2', color: '#ef4444', border: '1px solid #fca5a5' }}
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
                                                                    max={fileObj.pageCount}
                                                                    value={fileObj.startPage}
                                                                    onChange={(e) => {
                                                                        const startVal = Math.max(1, Number(e.target.value));
                                                                        const rangeSize = fileObj.lastPage - startVal + 1;
                                                                        const colorNumbers = parseColorPageNumbers(fileObj.colorPageNumbersText);
                                                                        const colorCount = colorNumbers.length;
                                                                        const bwCount = Math.max(0, rangeSize - colorCount);
                                                                        updateFileStatus(fileObj.id, { 
                                                                            startPage: startVal,
                                                                            bwPages: bwCount,
                                                                            colorPages: colorCount
                                                                        });
                                                                    }}
                                                                />
                                                            </div>
                                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                                <label style={{ fontSize: '0.85rem' }}>Last Page</label>
                                                                <input 
                                                                    type="number" 
                                                                    min={1} 
                                                                    max={fileObj.pageCount}
                                                                    value={fileObj.lastPage}
                                                                    onChange={(e) => {
                                                                        const lastVal = Math.max(1, Number(e.target.value));
                                                                        const rangeSize = lastVal - fileObj.startPage + 1;
                                                                        const colorNumbers = parseColorPageNumbers(fileObj.colorPageNumbersText);
                                                                        const colorCount = colorNumbers.length;
                                                                        const bwCount = Math.max(0, rangeSize - colorCount);
                                                                        updateFileStatus(fileObj.id, { 
                                                                            lastPage: lastVal,
                                                                            bwPages: bwCount,
                                                                            colorPages: colorCount
                                                                        });
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                                                            Total pages in document: <strong>{fileObj.pageCount}</strong>
                                                        </div>

                                                        {/* 2. Color Settings & Page Numbers */}
                                                        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                                                            <label style={{ fontSize: '0.85rem' }}>Color Page Numbers (Optional)</label>
                                                            <input 
                                                                type="text" 
                                                                placeholder="e.g. 5, 12, 27"
                                                                value={fileObj.colorPageNumbersText}
                                                                onChange={(e) => {
                                                                    const text = e.target.value;
                                                                    const rangeSize = fileObj.lastPage - fileObj.startPage + 1;
                                                                    const colorNumbers = parseColorPageNumbers(text);
                                                                    const colorCount = colorNumbers.length;
                                                                    const bwCount = Math.max(0, rangeSize - colorCount);
                                                                    
                                                                    updateFileStatus(fileObj.id, { 
                                                                        colorPageNumbersText: text,
                                                                        colorPages: colorCount,
                                                                        bwPages: bwCount
                                                                    });
                                                                }}
                                                            />
                                                            <small className="field-help" style={{ fontSize: '0.75rem' }}>
                                                                Specify page numbers separated by commas. Leave empty for B&W only.
                                                            </small>
                                                        </div>

                                                        <div className="form-row" style={{ marginBottom: '1.25rem' }}>
                                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                                <label style={{ fontSize: '0.85rem' }}>
                                                                    B&W Pages (Auto Calculated: ₹{fileObj.bwPages * (selectedShop?.pricing?.bwPerPage || 1)})
                                                                </label>
                                                                <input 
                                                                    type="number"
                                                                    readOnly
                                                                    value={fileObj.bwPages}
                                                                    style={{ backgroundColor: 'var(--bg-input)', cursor: 'not-allowed' }}
                                                                />
                                                            </div>
                                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                                <label style={{ fontSize: '0.85rem' }}>
                                                                    Color Pages (Auto Calculated: ₹{fileObj.colorPages * (selectedShop?.pricing?.colorPerPage || 5)})
                                                                </label>
                                                                <input 
                                                                    type="number"
                                                                    readOnly
                                                                    value={fileObj.colorPages}
                                                                    style={{ backgroundColor: 'var(--bg-input)', cursor: 'not-allowed' }}
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* 3. General Print Configs */}
                                                        <div className="form-row" style={{ marginBottom: 0 }}>
                                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                                <label style={{ fontSize: '0.85rem' }}>Copies</label>
                                                                <input 
                                                                    type="number" 
                                                                    min={1} 
                                                                    value={fileObj.copies}
                                                                    onChange={(e) => updateFileStatus(fileObj.id, { copies: Math.max(1, Number(e.target.value)) })}
                                                                />
                                                            </div>
                                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                                <label style={{ fontSize: '0.85rem' }}>Print Side</label>
                                                                <select 
                                                                    value={fileObj.printSide}
                                                                    onChange={(e) => updateFileStatus(fileObj.id, { printSide: e.target.value })}
                                                                >
                                                                    <option value="SINGLE_SIDE">Single-Sided</option>
                                                                    <option value="DOUBLE_SIDE">Double-Sided</option>
                                                                </select>
                                                            </div>
                                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                                <label style={{ fontSize: '0.85rem' }}>Binding</label>
                                                                <select 
                                                                    value={fileObj.binding}
                                                                    onChange={(e) => updateFileStatus(fileObj.id, { binding: e.target.value })}
                                                                >
                                                                    <option value="NONE">None</option>
                                                                    <option value="SPIRAL">Spiral Binding</option>
                                                                    <option value="BOOK">Book Binding</option>
                                                                </select>
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

                            <div className="specs-actions" style={{ marginTop: '2rem' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setStep(2)}>
                                    ← Back
                                </button>
                                <button 
                                    type="button" 
                                    className="btn btn-primary"
                                    onClick={() => setStep(4)}
                                    disabled={
                                        files.length === 0 || 
                                        !isAllFilesValid || 
                                        (serviceType === 'RECORD' && !recordPickupLocation.trim())
                                    }
                                >
                                    Continue →
                                </button>
                            </div>
                        </div>

                        {/* Cost estimates sidebar */}
                        <div className="summary-sidebar-container">
                            <div className="summary-sidebar card">
                                <h3>Price Summary</h3>
                                <hr />
                                <div className="summary-details">
                                    <div className="summary-row">
                                        <span>Uploaded files</span>
                                        <strong>{files.length}</strong>
                                    </div>
                                    <div className="summary-row">
                                        <span>Fulfillment Capability</span>
                                        <strong>{selectedShop?.isDeliveryAvailable ? 'Delivery available' : 'Pickup only'}</strong>
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

            {/* STEP 4: Fulfillment / Order Details (Regular & Record) */}
            {step === 4 && (
                <div className="step-container specs-step fade-in">
                    <div className="step-header">
                        <h2>
                            {serviceType === 'RECORD' ? 'Step 2 — Pickup / Delivery' : 'Order Details & Fulfillment'}
                        </h2>
                        <p>Complete your contact and delivery preferences.</p>
                    </div>

                    <div className="specs-layout-grid">
                        <div className="specs-form-container card" style={{ padding: '1.5rem' }}>
                            {/* Fulfillment method display / selection */}
                            {serviceType === 'RECORD' ? (
                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="recordDeliveryOption">Fulfillment Method *</label>
                                        <select 
                                            id="recordDeliveryOption" 
                                            value={recordDeliveryOption} 
                                            onChange={(e) => setRecordDeliveryOption(e.target.value)}
                                        >
                                            <option value="PICKUP">Self Pickup from Shop</option>
                                            <option value="DELIVERY">Delivery to Location</option>
                                        </select>
                                    </div>
                                </div>
                            ) : (
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Fulfillment Method</label>
                                        <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontWeight: 600 }}>
                                            {fulfillmentMethod === 'HOME_DELIVERY' ? '🚚 Home Delivery' : '🏪 Shop Pickup'}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Delivery Type & Distance Slab (if delivery is selected) */}
                            {((serviceType === 'RECORD' && recordDeliveryOption === 'DELIVERY') || serviceType === 'DELIVERY') && (
                                <>
                                    {/* Delivery Address block */}
                                    <div className="form-group">
                                        <label htmlFor="deliveryAddressInput">Hostel / Room Delivery Address *</label>
                                        <textarea
                                            id="deliveryAddressInput"
                                            rows={2}
                                            placeholder="Specify hostel block, room number, floor..."
                                            value={serviceType === 'RECORD' ? recordDeliveryAddress : deliveryAddress}
                                            onChange={(e) => {
                                                if (serviceType === 'RECORD') {
                                                    setRecordDeliveryAddress(e.target.value);
                                                } else {
                                                    setDeliveryAddress(e.target.value);
                                                }
                                            }}
                                            required
                                        />
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label htmlFor="deliveryType">Delivery Option *</label>
                                            <select
                                                id="deliveryType"
                                                value={deliveryType}
                                                onChange={(e) => setDeliveryType(e.target.value)}
                                            >
                                                {selectedShop?.homeDelivery && <option value="STANDARD">Standard Delivery</option>}
                                                {selectedShop?.expressPrinting && <option value="EXPRESS">Express Delivery</option>}
                                            </select>
                                        </div>
                                        
                                        {/* Distance Slab Selector */}
                                        {((deliveryType === 'EXPRESS' && !selectedShop?.freeExpressDelivery) || 
                                          (deliveryType === 'STANDARD' && !selectedShop?.freeDelivery)) ? (
                                            <div className="form-group">
                                                <label htmlFor="selectedSlab">Distance from Shop *</label>
                                                {((deliveryType === 'EXPRESS' ? selectedShop?.expressDeliveryCharges : selectedShop?.deliveryCharges)?.length > 0) ? (
                                                    <select
                                                        id="selectedSlab"
                                                        value={selectedSlabIndex}
                                                        onChange={(e) => {
                                                            const idx = Number(e.target.value);
                                                            setSelectedSlabIndex(idx);
                                                            const currentSlabs = deliveryType === 'EXPRESS' ? selectedShop?.expressDeliveryCharges : selectedShop?.deliveryCharges;
                                                            if (idx >= 0 && currentSlabs?.[idx]) {
                                                                setDeliveryDistance(currentSlabs[idx].from);
                                                            } else {
                                                                setDeliveryDistance(0);
                                                            }
                                                        }}
                                                        required
                                                    >
                                                        <option value={-1}>-- Select Distance --</option>
                                                        {(deliveryType === 'EXPRESS' ? selectedShop?.expressDeliveryCharges : selectedShop?.deliveryCharges)?.map((slab, idx) => (
                                                            <option key={idx} value={idx}>
                                                                {slab.from} - {slab.to} KM (₹{slab.charge})
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <div style={{ padding: '0.75rem', backgroundColor: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', fontWeight: 600 }}>
                                                        ⚠️ No pricing slabs configured by shop
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="form-group">
                                                <label>Delivery Cost</label>
                                                <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', color: 'var(--success-color)', fontWeight: 600 }}>
                                                    🆓 Free Delivery Included
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            {/* Contact Details */}
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="customerContact">Your Phone Number *</label>
                                    <input
                                        id="customerContact"
                                        type="tel"
                                        placeholder="10-digit number"
                                        value={customerContact}
                                        onChange={(e) => setCustomerContact(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                        required
                                        maxLength={10}
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

                            {/* Payment Method Selector */}
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="paymentType">Intended Payment Method *</label>
                                    <select
                                        id="paymentType"
                                        value={paymentType}
                                        onChange={(e) => setPaymentType(e.target.value)}
                                    >
                                        <option value="UPI">📱 UPI Payment</option>
                                        {selectedShop?.isCodAvailable && <option value="COD">💵 Cash on Delivery (COD)</option>}
                                    </select>
                                    <small style={{ display: 'block', marginTop: '0.25rem', color: 'var(--text-secondary)' }}>
                                        Note: You will pay after the shop reviews and accepts the order.
                                    </small>
                                </div>
                            </div>

                            {/* Deadline Picker */}
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

                            {/* Special instructions */}
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

                            <div className="specs-actions" style={{ marginTop: '2rem' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setStep(3)}>
                                    ← Back
                                </button>
                                <button 
                                    type="button" 
                                    className="btn btn-primary"
                                    onClick={() => setStep(5)}
                                    disabled={
                                        !customerContact.trim() || 
                                        customerContact.length !== 10 ||
                                        !customerEmail.trim() ||
                                        new Date(requiredBy) <= new Date() ||
                                        (((serviceType === 'DELIVERY') || (serviceType === 'RECORD' && recordDeliveryOption === 'DELIVERY')) && (
                                            !(serviceType === 'RECORD' ? recordDeliveryAddress.trim() : deliveryAddress.trim()) ||
                                            (((deliveryType === 'EXPRESS' && !selectedShop?.freeExpressDelivery) || (deliveryType === 'STANDARD' && !selectedShop?.freeDelivery)) && (
                                                selectedSlabIndex < 0 ||
                                                !(deliveryType === 'EXPRESS' ? selectedShop?.expressDeliveryCharges : selectedShop?.deliveryCharges)?.length
                                            ))
                                        ))
                                    }
                                >
                                    Continue to Review →
                                </button>
                            </div>
                        </div>

                        {/* Price summary sidebar */}
                        <div className="summary-sidebar-container">
                            <div className="summary-sidebar card">
                                <h3>Price Summary</h3>
                                <hr />
                                <div className="summary-details">
                                    <div className="summary-row">
                                        <span>Fulfillment Option</span>
                                        <strong>
                                            {fulfillmentMethod === 'HOME_DELIVERY' 
                                                ? `Home Delivery (${deliveryType})` 
                                                : fulfillmentMethod === 'RECORD_PICKUP'
                                                    ? `Record Pickup (${recordDeliveryOption === 'DELIVERY' ? `Delivery - ${deliveryType}` : 'Pickup'})`
                                                    : 'Shop Pickup'
                                            }
                                        </strong>
                                    </div>
                                    {((fulfillmentMethod === 'HOME_DELIVERY') || (fulfillmentMethod === 'RECORD_PICKUP' && recordDeliveryOption === 'DELIVERY')) && (
                                        <div className="summary-row">
                                            <span>Delivery Charge</span>
                                            <strong>₹{calculatedDeliveryCharge}</strong>
                                        </div>
                                    )}
                                    <div className="summary-row">
                                        <span>Payment Intended</span>
                                        <strong>{paymentType}</strong>
                                    </div>
                                    <div className="summary-row">
                                        <span>Deadline</span>
                                        <strong>{requiredBy ? new Date(requiredBy).toLocaleString() : 'N/A'}</strong>
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

            {/* STEP 5: Dedicated Review Order Page */}
            {step === 5 && (
                <div className="step-container fade-in">
                    <div className="step-header text-center" style={{ marginBottom: '2.5rem' }}>
                        <h2>Review Your Order</h2>
                        <p style={{ color: 'var(--text-secondary)' }}>Review all configurations and finalize your print order request.</p>
                    </div>

                    <div className="review-order-page">
                        {/* A. Service and Shop details */}
                        <div className="review-section">
                            <h3>Service & Shop</h3>
                            <div className="review-grid">
                                <div className="review-grid-item">
                                    <span>Selected Service</span>
                                    <strong>
                                        {serviceType === 'PRINT' && 'Direct Printing'}
                                        {serviceType === 'DELIVERY' && 'Home Delivery'}
                                        {serviceType === 'RECORD' && 'Record Pickup & Binding'}
                                    </strong>
                                </div>
                                <div className="review-grid-item">
                                    <span>Xerox Partner</span>
                                    <strong>{selectedShop?.shopName}</strong>
                                </div>
                                <div className="review-grid-item">
                                    <span>Shop Location</span>
                                    <strong>📍 {selectedShop?.location?.address}</strong>
                                </div>
                            </div>
                        </div>

                        {/* B. Fulfillment, Contact & Deadlines */}
                        <div className="review-section">
                            <h3>Fulfillment & Details</h3>
                            <div className="review-grid">
                                <div className="review-grid-item">
                                    <span>Fulfillment Option</span>
                                    <strong>
                                        {fulfillmentMethod === 'HOME_DELIVERY' 
                                            ? `Hostel/Room Delivery (${deliveryType})` 
                                            : fulfillmentMethod === 'RECORD_PICKUP'
                                                ? `Record Pickup (${recordDeliveryOption === 'DELIVERY' ? `Hostel/Room Delivery - ${deliveryType}` : 'Self Pickup from Shop'})`
                                                : 'Self Pickup from Shop'
                                        }
                                    </strong>
                                </div>
                                {((fulfillmentMethod === 'HOME_DELIVERY') || (fulfillmentMethod === 'RECORD_PICKUP' && recordDeliveryOption === 'DELIVERY')) && (
                                    <>
                                        <div className="review-grid-item" style={{ gridColumn: '1 / -1' }}>
                                            <span>Delivery Address</span>
                                            <strong>{serviceType === 'RECORD' ? recordDeliveryAddress : deliveryAddress}</strong>
                                        </div>
                                        {!((deliveryType === 'EXPRESS' && selectedShop?.freeExpressDelivery) || (deliveryType === 'STANDARD' && selectedShop?.freeDelivery)) && (
                                            <div className="review-grid-item">
                                                <span>Distance Range</span>
                                                <strong>
                                                    {(() => {
                                                        const currentSlabs = deliveryType === 'EXPRESS' ? selectedShop?.expressDeliveryCharges : selectedShop?.deliveryCharges;
                                                        const slab = currentSlabs?.[selectedSlabIndex];
                                                        return slab ? `${slab.from} - ${slab.to} KM` : 'N/A';
                                                    })()}
                                                </strong>
                                            </div>
                                        )}
                                    </>
                                )}
                                {serviceType === 'RECORD' && (
                                    <>
                                        <div className="review-grid-item">
                                            <span>Record Pickup Location</span>
                                            <strong>{recordPickupLocation}</strong>
                                        </div>
                                        <div className="review-grid-item">
                                            <span>Record Pickup Time</span>
                                            <strong>{new Date(recordPickupTime).toLocaleString()}</strong>
                                        </div>
                                        <div className="review-grid-item">
                                            <span>Record Binding Type</span>
                                            <strong>{recordBindingType === 'SPIRAL' ? 'Spiral Binding' : 'Book Binding'}</strong>
                                        </div>
                                    </>
                                )}
                                <div className="review-grid-item">
                                    <span>Phone Number</span>
                                    <strong>{customerContact}</strong>
                                </div>
                                <div className="review-grid-item">
                                    <span>Email Address</span>
                                    <strong>{customerEmail}</strong>
                                </div>
                                <div className="review-grid-item">
                                    <span>Intended Payment Method</span>
                                    <strong>
                                        {paymentType === 'UPI' && '📱 UPI Payment'}
                                        {paymentType === 'ONLINE' && '💳 Online Payment'}
                                        {paymentType === 'COD' && '💵 Cash on Delivery (COD)'}
                                    </strong>
                                </div>
                                <div className="review-grid-item">
                                    <span>Deadline Needed By</span>
                                    <strong>{new Date(requiredBy).toLocaleString()}</strong>
                                </div>
                            </div>
                            
                            {instructions && (
                                <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                                    <small style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Special Instructions</small>
                                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{instructions}</span>
                                </div>
                            )}
                        </div>

                        {/* C. Documents and Printing Config details */}
                        <div className="review-section">
                            <h3>Uploaded Documents ({files.length})</h3>
                            <div className="review-doc-list">
                                {files.map((fileObj, idx) => {
                                    const isPdf = fileObj.file.name.toLowerCase().endsWith('.pdf');
                                    return (
                                        <div key={idx} className="review-doc-card">
                                            <div className="review-doc-details">
                                                <strong style={{ fontSize: '0.95rem' }}>
                                                    {isPdf ? '📕' : '🖼️'} {fileObj.file.name}
                                                </strong>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                                    Pages: {fileObj.startPage}–{fileObj.lastPage} ({fileObj.pageCount} total) • B&W: {fileObj.bwPages} • Color: {fileObj.colorPages} 
                                                    {fileObj.colorPageNumbersText ? ` [Pages: ${fileObj.colorPageNumbersText}]` : ''} • Copies: {fileObj.copies} • Print Side: {fileObj.printSide === 'SINGLE_SIDE' ? 'Single-Sided' : 'Double-Sided'} • Binding: {fileObj.binding}
                                                </span>
                                            </div>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                                {(fileObj.file.size / (1024 * 1024)).toFixed(2)} MB
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* D. Pricing & Costs Table */}
                        <div className="review-section">
                            <h3>Cost Details</h3>
                            <div className="review-cost-table">
                                <div className="review-cost-row">
                                    <span>Black & White Printing (₹{selectedShop?.pricing?.bwPerPage || 1}/pg)</span>
                                    <span>
                                        {files.reduce((sum, f) => sum + Number(f.bwPages || 0) * Number(f.copies || 1), 0)} pages = ₹{files.reduce((sum, f) => sum + Number(f.bwPages || 0) * Number(f.copies || 1) * (selectedShop?.pricing?.bwPerPage || 1), 0)}
                                    </span>
                                </div>
                                <div className="review-cost-row">
                                    <span>Color Printing (₹{selectedShop?.pricing?.colorPerPage || 5}/pg)</span>
                                    <span>
                                        {files.reduce((sum, f) => sum + Number(f.colorPages || 0) * Number(f.copies || 1), 0)} pages = ₹{files.reduce((sum, f) => sum + Number(f.colorPages || 0) * Number(f.copies || 1) * (selectedShop?.pricing?.colorPerPage || 5), 0)}
                                    </span>
                                </div>
                                <div className="review-cost-row">
                                    <span>Binding Costs</span>
                                    <span>
                                        ₹{files.reduce((sum, f) => {
                                            if (f.status !== 'success') return sum;
                                            const copies = Number(f.copies || 1);
                                            let fileBindingCost = 0;
                                            if (f.binding === 'SPIRAL') fileBindingCost = selectedShop.pricing.spiralBinding || 30;
                                            if (f.binding === 'BOOK') fileBindingCost = selectedShop.pricing.bookBinding || 50;
                                            return sum + fileBindingCost * copies;
                                        }, 0) + (serviceType === 'RECORD' ? (recordBindingType === 'SPIRAL' ? selectedShop.pricing.spiralBinding || 30 : selectedShop.pricing.bookBinding || 50) : 0)}
                                    </span>
                                </div>
                                {((fulfillmentMethod === 'HOME_DELIVERY') || (fulfillmentMethod === 'RECORD_PICKUP' && recordDeliveryOption === 'DELIVERY')) && (
                                    <div className="review-cost-row">
                                        <span>Delivery Charge ({deliveryType} Delivery)</span>
                                        <span>₹{calculatedDeliveryCharge}</span>
                                    </div>
                                )}
                                <div className="review-cost-row total">
                                    <span>Estimated Total</span>
                                    <span>₹{estimatedCost || 0}</span>
                                </div>
                            </div>
                        </div>

                        {/* Bottom checkout buttons */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginTop: '1.5rem' }}>
                            <button 
                                type="button" 
                                className="btn btn-secondary" 
                                style={{ padding: '0.85rem 1.5rem', fontWeight: 600 }}
                                onClick={() => setStep(4)}
                                disabled={loading}
                            >
                                ← Back & Edit
                            </button>
                            <button 
                                type="button" 
                                className="btn btn-primary" 
                                style={{ padding: '0.85rem 2rem', fontWeight: 600 }}
                                onClick={handlePlaceOrderSubmit}
                                disabled={loading || files.length === 0 || !isAllFilesValid}
                            >
                                {loading ? <div className="spinner"></div> : 'Place Order →'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlaceOrder;
