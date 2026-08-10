import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { useToast } from '../context/ToastContext';
import './ShopForm.css';

const DAYS_OF_WEEK = [
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
    'SUNDAY'
];

export const UpdateShop = () => {
    const { showToast } = useToast();

    const [shopName, setShopName] = useState('');
    const [upiId, setUpiId] = useState('');
    const [upiQrCode, setUpiQrCode] = useState('');
    const [qrUploading, setQrUploading] = useState(false);
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [description, setDescription] = useState('');
    const [address, setAddress] = useState('');
    const [googleMapsLink, setGoogleMapsLink] = useState('');
    const [isCodAvailable, setIsCodAvailable] = useState(false);
    const [openTime, setOpenTime] = useState('09:00 AM');
    const [closeTime, setCloseTime] = useState('08:00 PM');
    const [openDays, setOpenDays] = useState([]);

    // Granular printing rates state
    const [bwSingle, setBwSingle] = useState('1');
    const [bwDouble, setBwDouble] = useState('1.5');
    const [colourSingle, setColourSingle] = useState('5');
    const [colourDouble, setColourDouble] = useState('8');
    const [spiralBinding, setSpiralBinding] = useState('30');
    const [bookBinding, setBookBinding] = useState('50');

    // Home Delivery state
    const [homeDelivery, setHomeDelivery] = useState(false);
    const [freeDelivery, setFreeDelivery] = useState(false);
    const [deliveryCharges, setDeliveryCharges] = useState([]);

    // Express Printing state
    const [expressPrinting, setExpressPrinting] = useState(false);
    const [freeExpressDelivery, setFreeExpressDelivery] = useState(false);
    const [expressDeliveryCharges, setExpressDeliveryCharges] = useState([]);

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Normal Delivery slabs helpers
    const handleAddNormalCharge = () => {
        setDeliveryCharges((prev) => [...prev, { from: '', to: '', charge: '' }]);
    };
    const handleUpdateNormalCharge = (index, field, value) => {
        setDeliveryCharges((prev) => {
            const copy = [...prev];
            copy[index] = { ...copy[index], [field]: value };
            return copy;
        });
    };
    const handleRemoveNormalCharge = (index) => {
        setDeliveryCharges((prev) => prev.filter((_, i) => i !== index));
    };

    // Express Delivery slabs helpers
    const handleAddExpressCharge = () => {
        setExpressDeliveryCharges((prev) => [...prev, { from: '', to: '', charge: '' }]);
    };
    const handleUpdateExpressCharge = (index, field, value) => {
        setExpressDeliveryCharges((prev) => {
            const copy = [...prev];
            copy[index] = { ...copy[index], [field]: value };
            return copy;
        });
    };
    const handleRemoveExpressCharge = (index) => {
        setExpressDeliveryCharges((prev) => prev.filter((_, i) => i !== index));
    };

    const fetchShopDetails = async () => {
        setLoading(true);
        try {
            const res = await API.get('/shops/me');
            const shop = res.data?.data;
            if (shop) {
                setShopName(shop.shopName || '');
                setUpiId(shop.upiId || '');
                setUpiQrCode(shop.upiQrCode || '');
                setEmail(shop.email || '');
                setPhone(shop.phone || '');
                setDescription(shop.description || '');
                setAddress(shop.location?.address || '');
                setGoogleMapsLink(shop.location?.googleMapsLink || '');
                setIsCodAvailable(!!shop.isCodAvailable);
                setOpenTime(shop.openTiming?.open || '09:00 AM');
                setCloseTime(shop.openTiming?.close || '08:00 PM');
                setOpenDays(shop.openDays || []);

                // Printing Rates Loading (with old pricing fallback)
                setBwSingle(shop.printingRates?.bwSingle ?? (shop.pricing?.bwPerPage ?? 1));
                setBwDouble(shop.printingRates?.bwDouble ?? (shop.pricing?.bwPerPage ?? 1.5));
                setColourSingle(shop.printingRates?.colourSingle ?? (shop.pricing?.colorPerPage ?? 5));
                setColourDouble(shop.printingRates?.colourDouble ?? (shop.pricing?.colorPerPage ?? 8));
                setSpiralBinding(shop.printingRates?.spiralBinding ?? (shop.pricing?.spiralBinding ?? 30));
                setBookBinding(shop.printingRates?.bookBinding ?? (shop.pricing?.bookBinding ?? 50));

                // Delivery Loading
                setHomeDelivery(!!shop.homeDelivery);
                setFreeDelivery(!!shop.freeDelivery);
                setDeliveryCharges(shop.deliveryCharges || []);

                // Express Printing Loading
                setExpressPrinting(!!shop.expressPrinting);
                setFreeExpressDelivery(!!shop.freeExpressDelivery);
                setExpressDeliveryCharges(shop.expressDeliveryCharges || []);
            }
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to load shop details', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchShopDetails();
    }, []);

    const handleDayToggle = (day) => {
        setOpenDays((prev) =>
            prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
        );
    };

    const handleQrUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setQrUploading(true);
        const formData = new FormData();
        formData.append('document', file);

        try {
            const res = await API.post('/uploads', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            setUpiQrCode(res.data?.data?.url || '');
            showToast('QR Code uploaded successfully!', 'success');
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to upload QR Code image', 'error');
        } finally {
            setQrUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!shopName.trim() || !upiId.trim() || !email.trim() || !phone.trim() || !description.trim() || !address.trim()) {
            showToast('Please fill out all required fields', 'error');
            return;
        }

        if (openDays.length === 0) {
            showToast('Please select at least one open day', 'error');
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                shopName,
                upiId: upiId.trim(),
                upiQrCode,
                email: email.trim(),
                phone: phone.trim(),
                description: description.trim(),
                location: {
                    address,
                    googleMapsLink
                },
                images: [],
                isCodAvailable,
                openTiming: {
                    open: openTime,
                    close: closeTime
                },
                openDays,
                printingRates: {
                    bwSingle: Number(bwSingle || 0),
                    bwDouble: Number(bwDouble || 0),
                    colourSingle: Number(colourSingle || 0),
                    colourDouble: Number(colourDouble || 0),
                    spiralBinding: Number(spiralBinding || 0),
                    bookBinding: Number(bookBinding || 0)
                },
                homeDelivery,
                freeDelivery,
                deliveryCharges: freeDelivery ? [] : deliveryCharges.map(c => ({
                    from: Number(c.from || 0),
                    to: Number(c.to || 0),
                    charge: Number(c.charge || 0)
                })),
                expressPrinting,
                freeExpressDelivery,
                expressDeliveryCharges: (expressPrinting && !freeExpressDelivery) ? expressDeliveryCharges.map(c => ({
                    from: Number(c.from || 0),
                    to: Number(c.to || 0),
                    charge: Number(c.charge || 0)
                })) : []
            };

            await API.patch('/shops/me', payload);
            showToast('Shop details updated successfully!', 'success');
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to update shop details', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="page-loading">
                <div className="spinner spinner-lg"></div>
                <p>Loading shop details...</p>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="form-card card">
                <div className="form-header">
                    <h2>Update Shop Details</h2>
                    <p>Modify your shop information, operating hours, and printing rates.</p>
                </div>

                <form onSubmit={handleSubmit} className="shop-form">
                    <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', backgroundColor: 'var(--bg-input)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600, flex: '1 1 auto', minWidth: '200px' }}>
                            <input
                                type="checkbox"
                                checked={homeDelivery}
                                onChange={(e) => setHomeDelivery(e.target.checked)}
                                style={{ width: 'auto', margin: 0 }}
                            />
                            <span>Enable Home Delivery</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600, flex: '1 1 auto', minWidth: '200px' }}>
                            <input
                                type="checkbox"
                                checked={expressPrinting}
                                onChange={(e) => setExpressPrinting(e.target.checked)}
                                style={{ width: 'auto', margin: 0 }}
                            />
                            <span>Express Printing Available</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600, flex: '1 1 auto', minWidth: '200px' }}>
                            <input
                                type="checkbox"
                                checked={isCodAvailable}
                                onChange={(e) => setIsCodAvailable(e.target.checked)}
                                style={{ width: 'auto', margin: 0 }}
                            />
                            <span>COD Available (Cash on Delivery)</span>
                        </label>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="shopName">Shop Name *</label>
                            <input
                                id="shopName"
                                type="text"
                                value={shopName}
                                onChange={(e) => setShopName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="upiId">UPI ID (for payments) *</label>
                            <input
                                id="upiId"
                                type="text"
                                value={upiId}
                                onChange={(e) => setUpiId(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="upiQr">UPI QR Code Image</label>
                            <input
                                id="upiQr"
                                type="file"
                                accept="image/*"
                                onChange={handleQrUpload}
                            />
                            {qrUploading && <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Uploading QR Code...</div>}
                            {upiQrCode && (
                                <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <img
                                        src={upiQrCode}
                                        alt="UPI QR Code"
                                        style={{ width: '100px', height: '100px', objectFit: 'contain', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => setUpiQrCode('')}
                                    >
                                        Remove QR
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="email">Contact Email *</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="phone">Phone Number *</label>
                            <input
                                id="phone"
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="googleMapsLink">Google Maps Link</label>
                            <input
                                id="googleMapsLink"
                                type="url"
                                value={googleMapsLink}
                                onChange={(e) => setGoogleMapsLink(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="address">Address *</label>
                        <textarea
                            id="address"
                            rows={3}
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="description">Shop Description *</label>
                        <textarea
                            id="description"
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-section-title" style={{ marginTop: '1rem', fontWeight: 600, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                        Printing Rates (₹)
                    </div>

                    <div style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', backgroundColor: 'var(--bg-card)' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>🖤 Black & White</div>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="bwSingle">Cost per Single Side Page (₹) *</label>
                                <input
                                    id="bwSingle"
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    value={bwSingle}
                                    onChange={(e) => setBwSingle(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="bwDouble">Cost per Double Side Page (₹) *</label>
                                <input
                                    id="bwDouble"
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    value={bwDouble}
                                    onChange={(e) => setBwDouble(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', backgroundColor: 'var(--bg-card)' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>❤️ Colour</div>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="colourSingle">Cost per Single Side Page (₹) *</label>
                                <input
                                    id="colourSingle"
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    value={colourSingle}
                                    onChange={(e) => setColourSingle(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="colourDouble">Cost per Double Side Page (₹) *</label>
                                <input
                                    id="colourDouble"
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    value={colourDouble}
                                    onChange={(e) => setColourDouble(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="spiralBinding">Cost for Spiral Binding (₹) *</label>
                            <input
                                id="spiralBinding"
                                type="number"
                                step="1"
                                min="0"
                                value={spiralBinding}
                                onChange={(e) => setSpiralBinding(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="bookBinding">Cost for Book Binding (₹) *</label>
                            <input
                                id="bookBinding"
                                type="number"
                                step="1"
                                min="0"
                                value={bookBinding}
                                onChange={(e) => setBookBinding(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {/* Delivery & Express Configuration Sections */}
                    {homeDelivery && (
                        <div style={{ backgroundColor: 'var(--bg-input)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '1.5rem', marginTop: '1rem' }}>
                            <div style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '1rem', color: 'var(--text-primary)' }}>Home Delivery Slabs</div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600, marginBottom: '1rem' }}>
                                <input
                                    type="checkbox"
                                    checked={freeDelivery}
                                    onChange={(e) => setFreeDelivery(e.target.checked)}
                                    style={{ width: 'auto', margin: 0 }}
                                />
                                <span>Free Delivery?</span>
                            </label>
                            
                            {!freeDelivery && (
                                <div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Define delivery charges by distance slabs (in Kilometers):</div>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '0.75rem' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', fontSize: '0.85rem' }}>
                                                <th style={{ padding: '0.4rem 0.5rem', color: 'var(--text-primary)' }}>From (KM)</th>
                                                <th style={{ padding: '0.4rem 0.5rem', color: 'var(--text-primary)' }}>To (KM)</th>
                                                <th style={{ padding: '0.4rem 0.5rem', color: 'var(--text-primary)' }}>Charge (₹)</th>
                                                <th style={{ padding: '0.4rem 0.5rem', width: '50px', textAlign: 'center', color: 'var(--text-primary)' }}>Remove</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {deliveryCharges.map((slab, idx) => (
                                                <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                    <td style={{ padding: '0.3rem' }}>
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            min="0"
                                                            value={slab.from}
                                                            onChange={(e) => handleUpdateNormalCharge(idx, 'from', e.target.value)}
                                                            placeholder="0"
                                                            required
                                                            style={{ margin: 0, padding: '0.35rem 0.5rem' }}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '0.3rem' }}>
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            min="0"
                                                            value={slab.to}
                                                            onChange={(e) => handleUpdateNormalCharge(idx, 'to', e.target.value)}
                                                            placeholder="2"
                                                            required
                                                            style={{ margin: 0, padding: '0.35rem 0.5rem' }}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '0.3rem' }}>
                                                        <input
                                                            type="number"
                                                            step="1"
                                                            min="0"
                                                            value={slab.charge}
                                                            onChange={(e) => handleUpdateNormalCharge(idx, 'charge', e.target.value)}
                                                            placeholder="15"
                                                            required
                                                            style={{ margin: 0, padding: '0.35rem 0.5rem' }}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '0.3rem', textAlign: 'center' }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveNormalCharge(idx)}
                                                            className="btn btn-danger"
                                                            style={{ padding: '0.2rem 0.4rem', fontSize: '0.8rem', lineHeight: 1 }}
                                                        >
                                                            &times;
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <button
                                        type="button"
                                        onClick={handleAddNormalCharge}
                                        className="btn btn-secondary"
                                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                                    >
                                        + Add Slab
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {expressPrinting && (
                        <div style={{ backgroundColor: 'var(--bg-input)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
                            <div style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '1rem', color: 'var(--text-primary)' }}>Express Delivery Slabs</div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600, marginBottom: '1rem' }}>
                                <input
                                    type="checkbox"
                                    checked={freeExpressDelivery}
                                    onChange={(e) => setFreeExpressDelivery(e.target.checked)}
                                    style={{ width: 'auto', margin: 0 }}
                                />
                                <span>Free Express Delivery?</span>
                            </label>
                            
                            {!freeExpressDelivery && (
                                <div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Define express delivery charges by distance slabs (in Kilometers):</div>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '0.75rem' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', fontSize: '0.85rem' }}>
                                                <th style={{ padding: '0.4rem 0.5rem', color: 'var(--text-primary)' }}>From (KM)</th>
                                                <th style={{ padding: '0.4rem 0.5rem', color: 'var(--text-primary)' }}>To (KM)</th>
                                                <th style={{ padding: '0.4rem 0.5rem', color: 'var(--text-primary)' }}>Charge (₹)</th>
                                                <th style={{ padding: '0.4rem 0.5rem', width: '50px', textAlign: 'center', color: 'var(--text-primary)' }}>Remove</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {expressDeliveryCharges.map((slab, idx) => (
                                                <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                    <td style={{ padding: '0.3rem' }}>
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            min="0"
                                                            value={slab.from}
                                                            onChange={(e) => handleUpdateExpressCharge(idx, 'from', e.target.value)}
                                                            placeholder="0"
                                                            required
                                                            style={{ margin: 0, padding: '0.35rem 0.5rem' }}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '0.3rem' }}>
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            min="0"
                                                            value={slab.to}
                                                            onChange={(e) => handleUpdateExpressCharge(idx, 'to', e.target.value)}
                                                            placeholder="2"
                                                            required
                                                            style={{ margin: 0, padding: '0.35rem 0.5rem' }}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '0.3rem' }}>
                                                        <input
                                                            type="number"
                                                            step="1"
                                                            min="0"
                                                            value={slab.charge}
                                                            onChange={(e) => handleUpdateExpressCharge(idx, 'charge', e.target.value)}
                                                            placeholder="25"
                                                            required
                                                            style={{ margin: 0, padding: '0.35rem 0.5rem' }}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '0.3rem', textAlign: 'center' }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveExpressCharge(idx)}
                                                            className="btn btn-danger"
                                                            style={{ padding: '0.2rem 0.4rem', fontSize: '0.8rem', lineHeight: 1 }}
                                                        >
                                                            &times;
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <button
                                        type="button"
                                        onClick={handleAddExpressCharge}
                                        className="btn btn-secondary"
                                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                                    >
                                        + Add Slab
                                    </button>
                                </div>
                            )}
                        </div>
                    )}



                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="openTime">Opening Time *</label>
                            <input
                                id="openTime"
                                type="text"
                                value={openTime}
                                onChange={(e) => setOpenTime(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="closeTime">Closing Time *</label>
                            <input
                                id="closeTime"
                                type="text"
                                value={closeTime}
                                onChange={(e) => setCloseTime(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Open Days *</label>
                        <div className="days-checkbox-grid">
                            {DAYS_OF_WEEK.map((day) => (
                                <label key={day} className="day-checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={openDays.includes(day)}
                                        onChange={() => handleDayToggle(day)}
                                    />
                                    <span>{day.substring(0, 3)}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary submit-btn" disabled={submitting}>
                        {submitting ? <div className="spinner"></div> : 'Save Changes'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default UpdateShop;
