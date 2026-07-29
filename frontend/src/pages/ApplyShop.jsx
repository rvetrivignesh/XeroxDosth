import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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

export const ApplyShop = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();

    if (user?.role === 'SHOP' || user?.role === 'ADMIN') {
        return (
            <div className="page-container">
                <div className="empty-state card" style={{ maxWidth: '600px', margin: '2rem auto', textAlign: 'center', padding: '2.5rem' }}>
                    <h3>Access Restricted</h3>
                    <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>You cannot apply for a shop partnering application because you are already a shop partner or administrator.</p>
                    <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
                        Go to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const [shopName, setShopName] = useState('');
    const [upiId, setUpiId] = useState('');
    const [email, setEmail] = useState(user?.email || '');
    const [phone, setPhone] = useState('');
    const [description, setDescription] = useState('');
    const [address, setAddress] = useState('');
    const [googleMapsLink, setGoogleMapsLink] = useState('');
    const [isDeliveryAvailable, setIsDeliveryAvailable] = useState(false);
    const [isCodAvailable, setIsCodAvailable] = useState(false);
    const [openTime, setOpenTime] = useState('09:00 AM');
    const [closeTime, setCloseTime] = useState('08:00 PM');
    const [openDays, setOpenDays] = useState(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']);
    const [bwPerPage, setBwPerPage] = useState('1');
    const [colorPerPage, setColorPerPage] = useState('5');
    const [spiralBinding, setSpiralBinding] = useState('30');
    const [bookBinding, setBookBinding] = useState('50');
    const [loading, setLoading] = useState(false);

    const handleDayToggle = (day) => {
        setOpenDays((prev) =>
            prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
        );
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

        setLoading(true);
        try {
            const payload = {
                shopName,
                upiId: upiId.trim(),
                email: email.trim(),
                phone: phone.trim(),
                description: description.trim(),
                location: {
                    address: address.trim(),
                    googleMapsLink: googleMapsLink.trim()
                },
                images: [],
                isDeliveryAvailable,
                isCodAvailable,
                openTiming: {
                    open: openTime,
                    close: closeTime
                },
                openDays,
                pricing: {
                    bwPerPage: Number(bwPerPage || 0),
                    colorPerPage: Number(colorPerPage || 0),
                    spiralBinding: Number(spiralBinding || 0),
                    bookBinding: Number(bookBinding || 0)
                }
            };

            await API.post('/shops/apply', payload);
            showToast('Shop application submitted successfully!', 'success');
            navigate('/application-status');
        } catch (err) {
            showToast(err.response?.data?.message || err.message || 'Failed to submit shop application', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-container">
            <div className="form-card card">
                <div className="form-header">
                    <h2>Apply for Shop Partnering</h2>
                    <p>Submit your xerox shop details for review and onboarding.</p>
                </div>

                <form onSubmit={handleSubmit} className="shop-form">
                    <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', backgroundColor: 'var(--bg-input)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600, flex: '1 1 auto', minWidth: '220px' }}>
                            <input
                                type="checkbox"
                                checked={isDeliveryAvailable}
                                onChange={(e) => setIsDeliveryAvailable(e.target.checked)}
                                style={{ width: 'auto', margin: 0 }}
                            />
                            <span>Deliver to locations? (Enable home delivery)</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600, flex: '1 1 auto', minWidth: '220px' }}>
                            <input
                                type="checkbox"
                                checked={isCodAvailable}
                                onChange={(e) => setIsCodAvailable(e.target.checked)}
                                style={{ width: 'auto', margin: 0 }}
                            />
                            <span>COD available? (Cash on Delivery)</span>
                        </label>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="shopName">Shop Name *</label>
                            <input
                                id="shopName"
                                type="text"
                                placeholder="e.g. Campus Print Hub"
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
                                placeholder="e.g. shopname@upi"
                                value={upiId}
                                onChange={(e) => setUpiId(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="email">Contact Email *</label>
                            <input
                                id="email"
                                type="email"
                                placeholder="shop@example.com"
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
                                placeholder="+91 9876543210"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="googleMapsLink">Google Maps Link (Optional)</label>
                            <input
                                id="googleMapsLink"
                                type="url"
                                placeholder="https://maps.google.com/..."
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
                            placeholder="Complete street address, building, landmark..."
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
                            placeholder="Describe your printing services, machines, location highlights..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            required
                        />
                    </div>

                    {/* Pricing Structure Section */}
                    <div className="form-section-title" style={{ marginTop: '1rem', fontWeight: 600, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                        Pricing Rates (₹)
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="bwPerPage">Cost per B&W Paper (₹) *</label>
                            <input
                                id="bwPerPage"
                                type="number"
                                step="0.5"
                                min="0"
                                placeholder="1"
                                value={bwPerPage}
                                onChange={(e) => setBwPerPage(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="colorPerPage">Cost per Coloured Paper (₹) *</label>
                            <input
                                id="colorPerPage"
                                type="number"
                                step="0.5"
                                min="0"
                                placeholder="5"
                                value={colorPerPage}
                                onChange={(e) => setColorPerPage(e.target.value)}
                                required
                            />
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
                                placeholder="30"
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
                                placeholder="50"
                                value={bookBinding}
                                onChange={(e) => setBookBinding(e.target.value)}
                                required
                            />
                        </div>
                    </div>



                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="openTime">Opening Time *</label>
                            <input
                                id="openTime"
                                type="text"
                                placeholder="09:00 AM"
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
                                placeholder="08:00 PM"
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

                    <button type="submit" className="btn btn-primary submit-btn" disabled={loading}>
                        {loading ? <div className="spinner"></div> : 'Submit Shop Application'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ApplyShop;

