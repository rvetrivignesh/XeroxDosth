import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { useToast } from '../context/ToastContext';

export const AdminApplications = () => {
    const { showToast } = useToast();
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [rejectionReasonMap, setRejectionReasonMap] = useState({});
    const [actionLoadingId, setActionLoadingId] = useState(null);

    const fetchApplications = async () => {
        setLoading(true);
        try {
            const res = await API.get('/applications');
            setApplications(res.data?.data || []);
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to load applications', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchApplications();
    }, []);

    const handleApprove = async (id) => {
        setActionLoadingId(id);
        try {
            await API.patch(`/applications/${id}/approve`);
            showToast('Application approved successfully!', 'success');
            fetchApplications();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to approve application', 'error');
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleReject = async (id) => {
        const reason = rejectionReasonMap[id] || '';
        if (!reason.trim()) {
            showToast('Please enter a rejection reason', 'error');
            return;
        }

        setActionLoadingId(id);
        try {
            await API.patch(`/applications/${id}/reject`, { rejectionReason: reason });
            showToast('Application rejected', 'info');
            fetchApplications();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to reject application', 'error');
        } finally {
            setActionLoadingId(null);
        }
    };

    if (loading) {
        return (
            <div className="page-loading">
                <div className="spinner spinner-lg"></div>
                <p>Loading role applications...</p>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="page-header" style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', color: 'var(--text-primary)' }}>Admin & Role Applications</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Review and approve or reject user requests for ADMIN or SHOP roles.</p>
            </div>

            {applications.length === 0 ? (
                <div className="empty-state card">
                    <h3>No Role Applications Found</h3>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {applications.map((app) => (
                        <div key={app._id} className="card" style={{ padding: '1.25rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                                        {app.applicantName} ({app.email})
                                    </h3>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        User: {app.user?.name} | Requested Role: <strong style={{ color: 'var(--accent-color)' }}>{app.requestedRole}</strong>
                                    </span>
                                </div>
                                <span className={`badge badge-${app.status.toLowerCase()}`} style={{ fontSize: '0.85rem' }}>
                                    {app.status}
                                </span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                <div>
                                    <small style={{ color: 'var(--text-muted)' }}>Phone</small>
                                    <div>{app.phone}</div>
                                </div>
                                <div>
                                    <small style={{ color: 'var(--text-muted)' }}>Submitted On</small>
                                    <div>{new Date(app.createdAt).toLocaleString()}</div>
                                </div>
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <small style={{ color: 'var(--text-muted)' }}>Reason / Pitch</small>
                                <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{app.description}</p>
                            </div>

                            {app.status === 'PENDING' ? (
                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                                    <button
                                        className="btn btn-primary btn-sm"
                                        onClick={() => handleApprove(app._id)}
                                        disabled={actionLoadingId === app._id}
                                    >
                                        Approve Request
                                    </button>

                                    <input
                                        type="text"
                                        placeholder="Reason for rejection..."
                                        value={rejectionReasonMap[app._id] || ''}
                                        onChange={(e) => setRejectionReasonMap({ ...rejectionReasonMap, [app._id]: e.target.value })}
                                        style={{ flex: 1, minWidth: '200px', padding: '0.35rem 0.65rem', fontSize: '0.85rem' }}
                                    />

                                    <button
                                        className="btn btn-danger btn-sm"
                                        onClick={() => handleReject(app._id)}
                                        disabled={actionLoadingId === app._id}
                                    >
                                        Reject
                                    </button>
                                </div>
                            ) : (
                                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    {app.reviewedBy && (
                                        <div>
                                            <strong style={{ color: 'var(--text-primary)' }}>Reviewed By:</strong> {app.reviewedBy.name || app.reviewedBy}
                                        </div>
                                    )}
                                    {app.reviewedAt && (
                                        <div>
                                            <strong style={{ color: 'var(--text-primary)' }}>Reviewed At:</strong> {new Date(app.reviewedAt).toLocaleString()}
                                        </div>
                                    )}
                                    {app.rejectionReason && (
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <strong style={{ color: 'var(--error-text)' }}>Rejection Reason:</strong> {app.rejectionReason}
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

export default AdminApplications;
