import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const ManageAdmins = () => {
    const { user: currentUser } = useAuth();
    const { showToast } = useToast();
    const [admins, setAdmins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionId, setActionId] = useState(null);

    // Search & Promote states
    const [searchEmail, setSearchEmail] = useState('');
    const [searching, setSearching] = useState(false);
    const [foundUser, setFoundUser] = useState(null);
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
            const res = await API.get(`/auth/search-user?email=${encodeURIComponent(searchEmail.trim())}`);
            setFoundUser(res.data?.data || null);
            showToast('User found!', 'success');
        } catch (err) {
            showToast(err.response?.data?.message || 'User not found with this email', 'error');
        } finally {
            setSearching(false);
        }
    };

    const handlePromoteAdmin = async () => {
        if (!foundUser) return;
        if (!window.confirm(`Are you sure you want to promote ${foundUser.name} to Administrator?`)) {
            return;
        }

        setPromoting(true);
        try {
            await API.post('/auth/promote-admin', { email: foundUser.email });
            showToast(`${foundUser.name} is now an Administrator!`, 'success');
            setSearchEmail('');
            setFoundUser(null);
            fetchAdmins();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to promote user to Admin', 'error');
        } finally {
            setPromoting(false);
        }
    };

    const fetchAdmins = async () => {
        setLoading(true);
        try {
            const res = await API.get('/auth/admins');
            setAdmins(res.data?.data || []);
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to load admins', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAdmins();
    }, []);

    const handleDemote = async (adminId, adminName) => {
        if (!window.confirm(`Are you sure you want to demote Admin ${adminName} to standard User?`)) {
            return;
        }

        setActionId(adminId);
        try {
            await API.patch(`/auth/demote-admin/${adminId}`);
            showToast(`Demoted ${adminName} to standard User`, 'info');
            fetchAdmins();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to demote admin', 'error');
        } finally {
            setActionId(null);
        }
    };

    if (loading) {
        return (
            <div className="page-loading">
                <div className="spinner spinner-lg"></div>
                <p>Loading administrators list...</p>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="page-header" style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', color: 'var(--text-primary)' }}>Manage Admins</h1>
                <p style={{ color: 'var(--text-secondary)' }}>View platform administrators and manage administrative access privileges.</p>
            </div>

            <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem', maxWidth: '750px', margin: '0 auto 2rem auto' }}>
                <h3 style={{ marginTop: 0, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Add New Admin</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                    Search for a registered user by email to promote them to Administrator.
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
                    <div style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                            <div>
                                <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>{foundUser.name}</h4>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Email: {foundUser.email} | Current Role: <strong>{foundUser.role}</strong></span>
                            </div>

                            {foundUser.role === 'ADMIN' ? (
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>Already Admin</span>
                            ) : (
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button className="btn btn-secondary btn-sm" onClick={() => setFoundUser(null)} disabled={promoting}>
                                        Cancel
                                    </button>
                                    <button className="btn btn-primary btn-sm" onClick={handlePromoteAdmin} disabled={promoting}>
                                        {promoting ? <span className="spinner spinner-sm"></span> : 'Promote to Admin'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '750px', margin: '0 auto' }}>
                {admins.map((adm) => (
                    <div key={adm._id} className="card" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-primary)' }}>
                                {adm.name} {adm._id === currentUser?._id && <span style={{ fontSize: '0.8rem', color: 'var(--accent-color)' }}>(You)</span>}
                            </h3>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                {adm.email} | Joined {new Date(adm.createdAt).toLocaleDateString()}
                            </span>
                        </div>

                        {adm._id !== currentUser?._id && (
                            <button
                                className="btn btn-secondary btn-sm"
                                style={{ color: '#ef4444' }}
                                onClick={() => handleDemote(adm._id, adm.name)}
                                disabled={actionId === adm._id}
                            >
                                Demote to User
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ManageAdmins;
