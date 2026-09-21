import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import API from '../services/api';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';

const OrderContext = createContext();

// PDF Page count detector fallback
const fallbackDetectPdfPages = async (file) => {
    try {
        let text = '';
        const decoder = new TextDecoder('ascii');
        
        if (file.size <= 4 * 1024 * 1024) {
            const buffer = await file.arrayBuffer();
            text = decoder.decode(new Uint8Array(buffer));
        } else {
            const sliceStart = file.slice(0, 2 * 1024 * 1024);
            const bufStart = await sliceStart.arrayBuffer();
            const textStart = decoder.decode(new Uint8Array(bufStart));
            
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

// PDF Page count detector using PDF.js CDN
const detectPdfPages = async (file) => {
    try {
        if (!window.pdfjsLib) {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
                script.onload = () => {
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
            return pdf.numPages;
        }
    } catch (err) {
        console.warn('Failed to auto-detect PDF page count with PDF.js, falling back to regex:', err);
    }
    return await fallbackDetectPdfPages(file);
};

export const parseColorPageNumbers = (text) => {
    if (!text || !text.trim()) return [];
    return text.split(',')
        .map(p => p.trim())
        .filter(Boolean)
        .map(p => parseInt(p, 10))
        .filter(num => !isNaN(num));
};

const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const SESSION_STORAGE_KEY = 'xeroxdosth_order_draft';

export const OrderProvider = ({ children }) => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const location = useLocation();

    // Load initial draft from sessionStorage if available
    const getSavedDraft = () => {
        try {
            const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) {
            console.error('Failed to parse draft from sessionStorage', e);
        }
        return null;
    };

    const draft = useMemo(() => getSavedDraft(), []);

    const [serviceType, setServiceType] = useState(draft?.serviceType || 'DELIVERY');
    const [shops, setShops] = useState([]);
    const [selectedShop, setSelectedShop] = useState(draft?.selectedShop || null);
    const [shopId, setShopId] = useState(draft?.shopId || '');
    const [shopSearch, setShopSearch] = useState('');
    
    const [files, setFiles] = useState(draft?.files || []);
    const [dragActive, setDragActive] = useState(false);

    // Order-Level details
    const [customerContact, setCustomerContact] = useState(draft?.customerContact || '');
    const [customerEmail, setCustomerEmail] = useState(draft?.customerEmail || '');
    const [instructions, setInstructions] = useState(draft?.instructions || '');
    const [requiredBy, setRequiredBy] = useState(() => {
        if (draft?.requiredBy && new Date(draft.requiredBy) > new Date()) {
            return draft.requiredBy;
        }
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d.toISOString().slice(0, 16);
    });

    // Fulfillment & Payment details
    const [fulfillmentMethod, setFulfillmentMethod] = useState(draft?.fulfillmentMethod || 'HOME_DELIVERY');
    const [deliveryType, setDeliveryType] = useState(draft?.deliveryType || 'NONE');
    const [deliveryDistance, setDeliveryDistance] = useState(draft?.deliveryDistance || 0);
    const [paymentType, setPaymentType] = useState(draft?.paymentType || 'UPI');

    const [fulfillmentType, setFulfillmentType] = useState(draft?.fulfillmentType || 'DELIVERY');
    const [deliveryAddress, setDeliveryAddress] = useState(draft?.deliveryAddress || '');

    // Record pickup details
    const [recordPickupLocation, setRecordPickupLocation] = useState(draft?.recordPickupLocation || '');
    const [recordPickupTime, setRecordPickupTime] = useState(() => {
        if (draft?.recordPickupTime) return draft.recordPickupTime;
        const d = new Date();
        d.setHours(d.getHours() + 2);
        return d.toISOString().slice(0, 16);
    });
    const [recordBindingType, setRecordBindingType] = useState(draft?.recordBindingType || 'SPIRAL');
    const [recordDeliveryOption, setRecordDeliveryOption] = useState(draft?.recordDeliveryOption || 'PICKUP');
    const [recordDeliveryAddress, setRecordDeliveryAddress] = useState(draft?.recordDeliveryAddress || '');

    const [loading, setLoading] = useState(false);
    const [loadingShops, setLoadingShops] = useState(true);

    // Sync to sessionStorage on state changes
    useEffect(() => {
        try {
            const serializableFiles = files.map(f => ({
                id: f.id,
                name: f.file?.name || f.name || 'document',
                size: f.file?.size || f.size || 0,
                type: f.file?.type || f.type || 'application/pdf',
                status: f.status,
                progress: f.progress,
                metadata: f.metadata,
                error: f.error,
                pageCount: f.pageCount,
                startPage: f.startPage,
                lastPage: f.lastPage,
                printType: f.printType || 'grayscale',
                bwPages: f.bwPages,
                colorPages: f.colorPages,
                colorPageNumbersText: f.colorPageNumbersText,
                copies: f.copies,
                printSide: f.printSide,
                binding: f.binding,
                isCollapsed: f.isCollapsed
            }));

            const stateToSave = {
                serviceType,
                selectedShop,
                shopId,
                files: serializableFiles,
                customerContact,
                customerEmail,
                instructions,
                requiredBy,
                fulfillmentMethod,
                deliveryType,
                deliveryDistance,
                paymentType,
                fulfillmentType,
                deliveryAddress,
                recordPickupLocation,
                recordPickupTime,
                recordBindingType,
                recordDeliveryOption,
                recordDeliveryAddress
            };
            sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(stateToSave));
        } catch (e) {
            console.error('Failed to save order draft to sessionStorage', e);
        }
    }, [
        serviceType, selectedShop, shopId, files, customerContact, customerEmail,
        instructions, requiredBy, fulfillmentMethod, deliveryType, deliveryDistance,
        paymentType, fulfillmentType, deliveryAddress, recordPickupLocation,
        recordPickupTime, recordBindingType, recordDeliveryOption, recordDeliveryAddress
    ]);

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

    // Keep fulfillmentMethod & deliveryType in sync
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

    // Fetch approved shops
    useEffect(() => {
        const fetchShops = async () => {
            try {
                const res = await API.get('/shops/approved');
                let list = res.data?.data || [];
                
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
                    // If shopId was provided via query param/state, redirect directly to configure-files
                    if (location.pathname === '/place-order' || location.pathname === '/place-order/service' || location.pathname === '/place-order/shop') {
                        navigate('/place-order/configure-files', { replace: true });
                    }
                } else if (shopId && list.some(s => s._id === shopId)) {
                    const found = list.find((s) => s._id === shopId);
                    setSelectedShop(found || null);
                } else if (!selectedShop && list.length > 0) {
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
    }, [location.search, location.state]);

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
            const matchesSearch = shop.shopName?.toLowerCase().includes(shopSearch.toLowerCase()) ||
                                 shop.location?.address?.toLowerCase().includes(shopSearch.toLowerCase());
            
            if (serviceType === 'DELIVERY') {
                return matchesSearch && shop.isDeliveryAvailable;
            }
            if (serviceType === 'PRINT') {
                return matchesSearch && shop.isShopPickupAvailable !== false;
            }
            return matchesSearch;
        });
    }, [shops, shopSearch, serviceType]);

    // File validation helper
    const validateFile = (file) => {
        const ext = file.name.split('.').pop().toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
            return 'Unsupported file format. Please upload a PDF or image file (JPG, PNG, or WEBP).';
        }
        if (file.size > MAX_FILE_SIZE) {
            return 'File size exceeds the 10 MB limit. Please upload a smaller file.';
        }
        return null;
    };

    const updateFileStatus = (id, updates) => {
        setFiles((prev) =>
            prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
        );
    };

    const uploadSingleFile = async (fileObj) => {
        if (!fileObj.file || !(fileObj.file instanceof Blob)) {
            return;
        }

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
                name: file.name,
                size: file.size,
                type: file.type,
                progress: 0,
                status: error ? 'failed' : 'pending',
                error: error,
                metadata: null,
                
                // Individual file print specifications
                pageCount: 1,
                startPage: 1,
                lastPage: 1,
                printType: 'grayscale', // 'grayscale' | 'color' | 'mixed'
                bwPages: 1,
                colorPages: 0,
                colorPageNumbersText: '',
                copies: 1,
                printSide: 'SINGLE_SIDE',
                binding: 'NONE',
                isCollapsed: false
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

        const copies = Number(f.copies || 1);
        if (copies < 1) return "Copies must be at least 1.";

        const start = Number(f.startPage || 1);
        const last = Number(f.lastPage || 1);
        const count = Number(f.pageCount || 1);

        if (start < 1) return "Start page must be at least 1.";
        if (last > count) return `Last page cannot exceed document total (${count}).`;
        if (start > last) return "Start page cannot be greater than last page.";

        const printedPages = last - start + 1;

        if (f.printType === 'mixed' && f.colorPageNumbersText && f.colorPageNumbersText.trim()) {
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

        return null;
    };

    // Verify all uploaded files configurations are valid
    const isAllFilesValid = useMemo(() => {
        const uploaded = files.filter(f => f.status === 'success');
        if (serviceType !== 'RECORD') {
            if (files.length === 0 || uploaded.length === 0) return false;
        } else {
            if (files.length === 0) return true;
        }
        
        return files.every(f => {
            if (f.status === 'failed' || f.status === 'pending' || f.status === 'uploading') return false;
            return getFileValidationError(f) === null;
        });
    }, [files, serviceType]);

    // Calculate dynamic delivery charge
    const calculatedDeliveryCharge = useMemo(() => {
        const isDelivery = (fulfillmentMethod === 'HOME_DELIVERY') || 
                           (fulfillmentMethod === 'RECORD_PICKUP' && deliveryType !== 'NONE');
        if (!isDelivery || !selectedShop) return 0;
        
        if (deliveryType === 'EXPRESS') {
            if (selectedShop.freeExpressDelivery) return 0;
            const currentSlabs = selectedShop.expressDeliveryCharges || [];
            return currentSlabs.length > 0 ? currentSlabs[0].charge : 0;
        } else {
            if (selectedShop.freeDelivery) return 0;
            const currentSlabs = selectedShop.deliveryCharges || [];
            return currentSlabs.length > 0 ? currentSlabs[0].charge : 0;
        }
    }, [fulfillmentMethod, deliveryType, selectedShop]);

    // Rates from selected shop
    const rates = useMemo(() => {
        const p = selectedShop?.pricing || {};
        const r = selectedShop?.printingRates || {};
        return {
            bwSingleRate: r.bwSingle ?? p.bwPerPage ?? 0,
            bwDoubleRate: r.bwDouble ?? p.bwPerPage ?? 0,
            colourSingleRate: r.colourSingle ?? p.colorPerPage ?? 0,
            colourDoubleRate: r.colourDouble ?? p.colorPerPage ?? 0,
            spiralBindingRate: r.spiralBinding ?? p.spiralBinding ?? 0,
            bookBindingRate: r.bookBinding ?? p.bookBinding ?? 0,
        };
    }, [selectedShop]);

    // Calculate dynamic cost estimates and details
    const priceDetails = useMemo(() => {
        if (!selectedShop || !selectedShop.pricing) {
            return {
                totalPages: 0,
                bwSheets: 0,
                colorSheets: 0,
                bwCost: 0,
                colorCost: 0,
                bindingCost: 0,
                deliveryCharge: 0,
                total: 0,
                hasColor: false,
                printSideStr: 'Single-Sided',
                doubleBwSheetsTotal: 0,
                singleBwSheetsTotal: 0,
                singleColourSheetsTotal: 0
            };
        }
        
        const { bwSingleRate, bwDoubleRate, colourSingleRate, colourDoubleRate, spiralBindingRate, bookBindingRate } = rates;

        let totalPages = 0;
        let bwSheets = 0;
        let colorSheets = 0;
        let bwCost = 0;
        let colorCost = 0;
        let bindingCost = 0;
        
        let doubleBwSheetsTotal = 0;
        let singleBwSheetsTotal = 0;
        let doubleColourSheetsTotal = 0;
        let singleColourSheetsTotal = 0;

        let hasDouble = false;
        let hasSingle = false;

        files.forEach(f => {
            if (f.status !== 'success') return;
            const copies = Number(f.copies || 1);
            const bw = Number(f.bwPages || 0);
            const color = Number(f.colorPages || 0);
            const printSide = f.printSide || 'SINGLE_SIDE';

            totalPages += (bw + color) * copies;

            const docBwSheets = printSide === 'DOUBLE_SIDE' ? Math.ceil(bw / 2) : bw;
            const docColorSheets = printSide === 'DOUBLE_SIDE' ? Math.ceil(color / 2) : color;

            let docColorCost = 0;
            if (printSide === 'DOUBLE_SIDE') {
                const dSheets = Math.floor(color / 2) * copies;
                const sSheets = (color % 2) * copies;
                doubleColourSheetsTotal += dSheets;
                singleColourSheetsTotal += sSheets;
                docColorCost = (Math.floor(color / 2) * colourDoubleRate + (color % 2) * colourSingleRate) * copies;
                if (dSheets > 0) hasDouble = true;
                if (sSheets > 0) hasSingle = true;
            } else {
                const sSheets = color * copies;
                singleColourSheetsTotal += sSheets;
                docColorCost = color * colourSingleRate * copies;
                if (sSheets > 0) hasSingle = true;
            }

            bwSheets += docBwSheets * copies;
            colorSheets += docColorSheets * copies;

            let docBwCost = 0;
            if (printSide === 'DOUBLE_SIDE') {
                const dSheets = Math.floor(bw / 2) * copies;
                const sSheets = (bw % 2) * copies;
                doubleBwSheetsTotal += dSheets;
                singleBwSheetsTotal += sSheets;
                docBwCost = (Math.floor(bw / 2) * bwDoubleRate + (bw % 2) * bwSingleRate) * copies;
                if (dSheets > 0) hasDouble = true;
                if (sSheets > 0) hasSingle = true;
            } else {
                const sSheets = bw * copies;
                singleBwSheetsTotal += sSheets;
                docBwCost = sSheets * bwSingleRate;
                if (sSheets > 0) hasSingle = true;
            }
            bwCost += docBwCost;
            colorCost += docColorCost;

            if (printSide === 'DOUBLE_SIDE') hasDouble = true;
            if (printSide === 'SINGLE_SIDE') hasSingle = true;

            let fileBindingCost = 0;
            if (f.binding === 'SPIRAL') fileBindingCost = spiralBindingRate;
            if (f.binding === 'BOOK') fileBindingCost = bookBindingRate;

            bindingCost += fileBindingCost * copies;
        });

        if (serviceType === 'RECORD') {
            if (recordBindingType === 'SPIRAL') bindingCost += spiralBindingRate;
            if (recordBindingType === 'BOOK') bindingCost += bookBindingRate;
        }

        let printSideStr = 'Single-Sided';
        if (hasDouble && hasSingle) printSideStr = 'Mixed';
        else if (hasDouble) printSideStr = 'Double-Sided';

        const total = bwCost + colorCost + bindingCost + calculatedDeliveryCharge;

        return {
            totalPages,
            bwSheets,
            colorSheets,
            bwCost,
            colorCost,
            bindingCost,
            deliveryCharge: calculatedDeliveryCharge,
            total,
            hasColor: colorSheets > 0,
            printSideStr,
            doubleBwSheetsTotal,
            singleBwSheetsTotal,
            doubleColourSheetsTotal,
            singleColourSheetsTotal
        };
    }, [files, selectedShop, serviceType, recordBindingType, calculatedDeliveryCharge, rates]);

    const estimatedCost = priceDetails.total;

    // Helper for per-file grayscale cost
    const getFileBwCost = (fileObj) => {
        const bw = Number(fileObj.bwPages || 0);
        if (fileObj.printSide === 'DOUBLE_SIDE') {
            return Math.floor(bw / 2) * rates.bwDoubleRate + (bw % 2) * rates.bwSingleRate;
        } else {
            return bw * rates.bwSingleRate;
        }
    };

    // Helper for per-file color cost
    const getFileColorCost = (fileObj) => {
        const color = Number(fileObj.colorPages || 0);
        if (fileObj.printSide === 'DOUBLE_SIDE') {
            return Math.floor(color / 2) * rates.colourDoubleRate + (color % 2) * rates.colourSingleRate;
        } else {
            return color * rates.colourSingleRate;
        }
    };

    // Helper for per-file binding cost
    const getFileBindingCost = (fileObj) => {
        if (fileObj.binding === 'SPIRAL') return rates.spiralBindingRate;
        if (fileObj.binding === 'BOOK') return rates.bookBindingRate;
        return 0;
    };

    // Helper for total single file cost
    const getSingleFileTotalCost = (fileObj) => {
        const copies = Number(fileObj.copies || 1);
        const bwCost = getFileBwCost(fileObj);
        const colorCost = getFileColorCost(fileObj);
        const bindingCost = getFileBindingCost(fileObj);
        return (bwCost + colorCost + bindingCost) * copies;
    };

    // Handle Order Submission
    const handlePlaceOrderSubmit = async () => {
        const lastOrderTime = localStorage.getItem('last_order_timestamp');
        if (lastOrderTime) {
            const elapsedMs = Date.now() - Number(lastOrderTime);
            const cooldownMs = 2 * 60 * 1000;
            if (elapsedMs < cooldownMs) {
                const secondsLeft = Math.ceil((cooldownMs - elapsedMs) / 1000);
                showToast(`Anti-spam active: Please wait ${secondsLeft}s before placing another order.`, 'error');
                return;
            }
        }

        if (!shopId.trim()) {
            showToast('Please select a target shop', 'error');
            return;
        }

        const uploadedDocs = files.filter(f => f.status === 'success');
        if (serviceType !== 'RECORD' && uploadedDocs.length === 0) {
            showToast('Please upload at least 1 valid document for Home Delivery', 'error');
            return;
        }

        for (const f of uploadedDocs) {
            const err = getFileValidationError(f);
            if (err) {
                const fileName = f.file?.name || f.name || 'document';
                showToast(`Validation error in ${fileName}: ${err}`, 'error');
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

        const isFree = deliveryType === 'EXPRESS' ? selectedShop?.freeExpressDelivery : selectedShop?.freeDelivery;
        if (isDelivery && !isFree) {
            const currentSlabs = deliveryType === 'EXPRESS' ? selectedShop?.expressDeliveryCharges : selectedShop?.deliveryCharges;
            if (!currentSlabs?.length) {
                showToast('Selected shop has no delivery pricing slabs configured for this delivery option', 'error');
                return;
            }
        }

        setLoading(true);
        try {
            let documentsPayload = [];
            if (uploadedDocs.length > 0) {
                documentsPayload = uploadedDocs.map(f => {
                    return {
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
                        colorPageNumbersText: f.colorPageNumbersText || '',
                        copies: Number(f.copies || 1),
                        printSide: f.printSide,
                        binding: f.binding,
                        printColorDoubleSide: f.printSide === 'DOUBLE_SIDE',
                        printingMode: 'regular'
                    };
                });
            } else {
                documentsPayload = [{
                    publicId: `PHYSICAL_DOC_${Date.now()}`,
                    url: 'https://xeroxdosth.local/documents/physical-doc.pdf',
                    originalName: 'Physical Record Document Sheets.pdf',
                    size: 1024,
                    mimeType: 'application/pdf',
                    pageCount: 0,
                    bwPages: 0,
                    colorPages: 0,
                    copies: 1,
                    printSide: 'SINGLE_SIDE',
                    binding: recordBindingType
                }];
            }

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

            const rootBw = documentsPayload.reduce((sum, d) => sum + (d.bwPages || 0) * (d.copies || 1), 0);
            const rootColor = documentsPayload.reduce((sum, d) => sum + (d.colorPages || 0) * (d.copies || 1), 0);
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
                fulfillmentMethod: finalFulfillmentMethod,
                deliveryType: isDelivery ? deliveryType : 'NONE',
                deliveryDistance: Number(deliveryDistance || 0),
                paymentType: paymentType,
                fulfillmentType: isDelivery ? 'DELIVERY' : 'PICKUP',
                deliveryAddress: finalAddress
            };

            await API.post('/orders', payload);
            localStorage.setItem('last_order_timestamp', Date.now().toString());
            sessionStorage.removeItem(SESSION_STORAGE_KEY);
            showToast('Order placed successfully!', 'success');
            navigate('/my-orders');
        } catch (err) {
            showToast(err.response?.data?.message || err.message || 'Failed to place order', 'error');
        } finally {
            setLoading(false);
        }
    };

    const value = {
        serviceType, setServiceType,
        shops, setShops,
        selectedShop, setSelectedShop,
        shopId, setShopId,
        shopSearch, setShopSearch,
        filteredShops,
        files, setFiles,
        dragActive, setDragActive,
        customerContact, setCustomerContact,
        customerEmail, setCustomerEmail,
        instructions, setInstructions,
        requiredBy, setRequiredBy,
        fulfillmentMethod, setFulfillmentMethod,
        deliveryType, setDeliveryType,
        deliveryDistance, setDeliveryDistance,
        paymentType, setPaymentType,
        fulfillmentType, setFulfillmentType,
        deliveryAddress, setDeliveryAddress,
        recordPickupLocation, setRecordPickupLocation,
        recordPickupTime, setRecordPickupTime,
        recordBindingType, setRecordBindingType,
        recordDeliveryOption, setRecordDeliveryOption,
        recordDeliveryAddress, setRecordDeliveryAddress,
        loading, setLoading,
        loadingShops, setLoadingShops,
        rates,
        priceDetails,
        estimatedCost,
        calculatedDeliveryCharge,
        isAllFilesValid,
        handleFiles,
        handleDrag,
        handleDrop,
        handleFileSelect,
        handleRemoveFile,
        handleRetryUpload,
        updateFileStatus,
        getFileValidationError,
        getFileBwCost,
        getFileColorCost,
        getFileBindingCost,
        getSingleFileTotalCost,
        handlePlaceOrderSubmit
    };

    return (
        <OrderContext.Provider value={value}>
            {children}
        </OrderContext.Provider>
    );
};

export const useOrder = () => {
    const context = useContext(OrderContext);
    if (!context) {
        throw new Error('useOrder must be used within an OrderProvider');
    }
    return context;
};

export default OrderContext;
