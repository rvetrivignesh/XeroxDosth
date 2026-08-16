import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import API from '../services/api';
import { useToast } from '../context/ToastContext';

export const AdminShops = () => {
    const { showToast } = useToast();
    const location = useLocation();
    const [shops, setShops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [rejectionMap, setRejectionMap] = useState({});
    const [actionId, setActionId] = useState(null);

    const isManageView = location.pathname.includes('manage-shops');

    // Search & Promote shop state
    const [searchEmail, setSearchEmail] = useState('');
    const [searching, setSearching] = useState(false);
    const [foundUser, setFoundUser] = useState(null);

    // Form fields for promotion
    const [promoShopName, setPromoShopName] = useState('');
    const [promoPhone, setPromoPhone] = useState('');
    const [promoUpiId, setPromoUpiId] = useState('');
    const [promoting, setPromoting] = useState(false);

    const handleSearchUser = async (e) => {
        e.preventDefault();
        if (!searchEmail.trim()) {
            showToast('Please enter an email address', 'error');
            return;
        }

        setSearching(true);
        setFoundUser(null);
        try {
            const res = await API.get(`/shops/admin/search-user?email=${encodeURIComponent(searchEmail)}`);
            const user = res.data?.data;
            setFoundUser(user);
            setPromoShopName(user ? `${user.name}'s Shop` : '');
            setPromoPhone(user?.phone || '');
            setPromoUpiId('');
            showToast('User found!', 'success');
        } catch (err) {
            showToast(err.response?.data?.message || 'User not found with this email', 'error');
        } finally {
            setSearching(false);
        }
    };

    const handlePromoteUser = async (e) => {
        e.preventDefault();
        if (!foundUser) return;
        if (!promoShopName.trim() || !promoUpiId.trim()) {
            showToast('Shop Name and UPI ID are required', 'error');
            return;
        }

        setPromoting(true);
        try {
            await API.post('/shops/admin/promote-user', {
                email: foundUser.email,
                shopName: promoShopName.trim(),
                phone: promoPhone.trim() || undefined,
                upiId: promoUpiId.trim()
            });
            showToast('User successfully promoted to Shop Owner and shop created!', 'success');

            // Reset state
            setSearchEmail('');
            setFoundUser(null);
            setPromoShopName('');
            setPromoPhone('');
            setPromoUpiId('');

            // Reload active shops list
            fetchShops();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to promote user to shop owner', 'error');
        } finally {
            setPromoting(false);
        }
    };

    const fetchShops = async () => {
        setLoading(true);
        try {
            const res = await API.get('/shops/admin/all');
            setShops(res.data?.data || []);
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to load shops', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchShops();
    }, []);

    const handleUpdateStatus = async (id, status, customReason = '') => {
        const rejectionReason = customReason || rejectionMap[id] || '';
        if (status === 'REJECTED' && !rejectionReason.trim() && !isManageView) {
            showToast('Please enter a rejection reason', 'error');
            return;
        }

        if (isManageView && status === 'REJECTED') {
            const reason = window.prompt('Please enter the reason for demoting this shop partner:');
            if (reason === null) return; // Cancelled
            if (!reason.trim()) {
                showToast('A reason is required to demote this shop partner.', 'error');
                return;
            }
            customReason = reason;
        }

        setActionId(id);
        try {
            const finalReason = isManageView && status === 'REJECTED' ? customReason.trim() : rejectionReason;
            await API.patch(`/shops/admin/${id}/status`, { status, rejectionReason: finalReason });
            showToast(isManageView ? 'Shop owner demoted to standard user' : `Shop status updated to ${status}`, 'success');
            fetchShops();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to update shop status', 'error');
        } finally {
            setActionId(null);
        }
    };

    const displayedShops = isManageView
        ? shops.filter((s) => s.status === 'APPROVED')
        : shops;

    if (loading) {
        return (
            <div className="page-loading">
                <div className="spinner spinner-lg"></div>
                <p>Loading shop applications...</p>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="page-header" style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', color: 'var(--text-primary)' }}>
                    {isManageView ? 'Manage Active Shops' : 'Shop Partnering Applications'}
                </h1>
                <p style={{ color: 'var(--text-secondary)' }}>
                    {isManageView
                        ? 'View active shop partners and demote privileges if needed.'
                        : 'Review pending shop submissions and manage active xerox partners.'}
                </p>
            </div>

            {isManageView && (
                <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Add New Shop Partner</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                        Search for a registered user by email to promote them to a Shop Owner.
                    </p>

                    <form onSubmit={handleSearchUser} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                        <input
                            type="email"
                            placeholder="Search user by email..."
                            value={searchEmail}
                            onChange={(e) => setSearchEmail(e.target.value)}
                            disabled={searching || promoting}
                            style={{ flex: 1, minWidth: '220px', padding: '0.6rem 0.85rem' }}
                            required
                        />
                        <button type="submit" className="btn btn-primary" disabled={searching || promoting} style={{ minWidth: '100px' }}>
                            {searching ? <span className="spinner spinner-sm"></span> : 'Search'}
                        </button>
                    </form>

                    {foundUser && (
                        <div style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginTop: '1rem' }}>
                            <div style={{ marginBottom: '1.25rem' }}>
                                <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>User Found: {foundUser.name}</h4>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Email: {foundUser.email} | Current Role: <strong>{foundUser.role}</strong></span>
                            </div>

                            {foundUser.role === 'ADMIN' ? (
                                <div style={{ color: '#ef4444', fontWeight: 500, fontSize: '0.9rem' }}>
                                    ❌ Administrators cannot be promoted to Shop Owners.
                                </div>
                            ) : (
                                <form onSubmit={handlePromoteUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>Shop Name *</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Campus Xerox Hub"
                                                value={promoShopName}
                                                onChange={(e) => setPromoShopName(e.target.value)}
                                                disabled={promoting}
                                                style={{ width: '100%', padding: '0.55rem 0.75rem' }}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>Phone Number</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. +91 9876543210"
                                                value={promoPhone}
                                                onChange={(e) => setPromoPhone(e.target.value)}
                                                disabled={promoting}
                                                style={{ width: '100%', padding: '0.55rem 0.75rem' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>UPI ID (for payments) *</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. shopowner@upi"
                                                value={promoUpiId}
                                                onChange={(e) => setPromoUpiId(e.target.value)}
                                                disabled={promoting}
                                                style={{ width: '100%', padding: '0.55rem 0.75rem' }}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setFoundUser(null)} disabled={promoting}>
                                            Cancel
                                        </button>
                                        <button type="submit" className="btn btn-primary btn-sm" disabled={promoting}>
                                            {promoting ? <span className="spinner spinner-sm"></span> : 'Promote & Create Shop'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    )}
                </div>
            )}

            {displayedShops.length === 0 ? (
                <div className="empty-state card">
                    <h3>{isManageView ? 'No Active Shops Found' : 'No Shop Applications Found'}</h3>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {displayedShops.map((shop) => (
                        <div key={shop._id} className="card" style={{ padding: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--text-primary)' }}>
                                        {shop.shopName}
                                    </h3>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        Owner: {shop.owner?.name} ({shop.owner?.email})
                                    </span>
                                </div>
                                <span className={`badge badge-${shop.status.toLowerCase()}`} style={{ fontSize: '0.85rem' }}>
                                    {shop.status}
                                </span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                <div>
                                    <small style={{ color: 'var(--text-muted)' }}>Email & Phone</small>
                                    <div>{shop.email} | {shop.phone}</div>
                                </div>
                                <div>
                                    <small style={{ color: 'var(--text-muted)' }}>Open Timing</small>
                                    <div>{shop.openTiming?.open} - {shop.openTiming?.close}</div>
                                </div>
                                {shop.upiId && (
                                    <div>
                                        <small style={{ color: 'var(--text-muted)' }}>UPI ID</small>
                                        <div style={{ fontWeight: 500 }}>{shop.upiId}</div>
                                    </div>
                                )}
                            </div>

                            {shop.pricing && (
                                <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                                    <strong>Configured Pricing: </strong> B&W ₹{shop.pricing.bwPerPage} | Color ₹{shop.pricing.colorPerPage} | Spiral ₹{shop.pricing.spiralBinding} | Book ₹{shop.pricing.bookBinding}
                                </div>
                            )}

                            <div style={{ marginBottom: '0.75rem' }}>
                                <small style={{ color: 'var(--text-muted)' }}>Address</small>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{shop.location?.address}</div>
                            </div>

                            {isManageView ? (
                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        style={{ color: '#ef4444' }}
                                        onClick={() => handleUpdateStatus(shop._id, 'REJECTED', 'Demoted by administrator')}
                                        disabled={actionId === shop._id}
                                    >
                                        Demote to User
                                    </button>
                                </div>
                            ) : shop.status === 'PENDING' ? (
                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                                    <button
                                        className="btn btn-primary btn-sm"
                                        onClick={() => handleUpdateStatus(shop._id, 'APPROVED')}
                                        disabled={actionId === shop._id}
                                    >
                                        Approve Shop
                                    </button>

                                    <input
                                        type="text"
                                        placeholder="Rejection reason..."
                                        value={rejectionMap[shop._id] || ''}
                                        onChange={(e) => setRejectionMap({ ...rejectionMap, [shop._id]: e.target.value })}
                                        style={{ flex: 1, minWidth: '180px', padding: '0.35rem 0.65rem', fontSize: '0.85rem' }}
                                    />
                                    <button
                                        className="btn btn-danger btn-sm"
                                        onClick={() => handleUpdateStatus(shop._id, 'REJECTED')}
                                        disabled={actionId === shop._id}
                                    >
                                        Reject
                                    </button>
                                </div>
                            ) : (
                                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    {shop.reviewedBy && (
                                        <div>
                                            <strong style={{ color: 'var(--text-primary)' }}>Reviewed By:</strong> {shop.reviewedBy.name || shop.reviewedBy}
                                        </div>
                                    )}
                                    {shop.reviewedAt && (
                                        <div>
                                            <strong style={{ color: 'var(--text-primary)' }}>Reviewed At:</strong> {new Date(shop.reviewedAt).toLocaleString()}
                                        </div>
                                    )}
                                    {shop.rejectionReason && (
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <strong style={{ color: 'var(--error-text)' }}>Rejection/Disable Reason:</strong> {shop.rejectionReason}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdminShops;
