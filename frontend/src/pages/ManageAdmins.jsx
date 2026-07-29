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
