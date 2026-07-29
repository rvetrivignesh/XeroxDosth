import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../services/api';

export const MyShopApplication = () => {
    const [application, setApplication] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchApplication = async () => {
            try {
                const res = await API.get('/shops/me');
                if (res.data && res.data.data) {
                    setApplication(res.data.data);
                } else {
                    setApplication(null);
                }
            } catch (err) {
                setError(err.message || 'Failed to load shop application');
            } finally {
                setLoading(false);
            }
        };

        fetchApplication();
    }, []);

    if (loading) {
        return (
            <div className="page-loading">
                <div className="spinner spinner-lg"></div>
                <p>Loading application details...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="page-container">
                <div className="empty-state">
                    <h3>Error Loading Application</h3>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    if (!application) {
        return (
            <div className="page-container">
                <div className="empty-state">
                    <h3>No Shop Application Found</h3>
                    <p>You haven't submitted a shop partnering application yet.</p>
                    <Link to="/apply-shop" className="btn btn-primary">
                        Apply for Shop Now
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingBottom: '1rem',
                    marginBottom: '1.5rem',
                    borderBottom: '1px solid var(--border-color)',
                    flexWrap: 'wrap',
                    gap: '1rem'
                }}>
                    <div>
                        <h2 style={{ fontSize: '1.6rem', color: 'var(--text-primary)' }}>{application.shopName}</h2>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Application ID: {application._id}</span>
                    </div>

                    <div>
                        <span className={`badge badge-${application.status.toLowerCase()}`} style={{ fontSize: '0.85rem', padding: '0.4rem 0.85rem' }}>
                            {application.status}
                        </span>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
                    <div style={{ padding: '1rem', backgroundColor: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Email</span>
                        <strong style={{ fontSize: '0.95rem' }}>{application.email}</strong>
                    </div>

                    <div style={{ padding: '1rem', backgroundColor: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Phone</span>
                        <strong style={{ fontSize: '0.95rem' }}>{application.phone}</strong>
                    </div>

                    <div style={{ padding: '1rem', backgroundColor: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Open Hours</span>
                        <strong style={{ fontSize: '0.95rem' }}>{application.openTiming?.open} - {application.openTiming?.close}</strong>
                    </div>

                    <div style={{ padding: '1rem', backgroundColor: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Submitted Date</span>
                        <strong style={{ fontSize: '0.95rem' }}>
                            {new Date(application.createdAt).toLocaleDateString()}
                        </strong>
                    </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Address & Location</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '0.5rem' }}>{application.location?.address}</p>
                    {application.location?.googleMapsLink && (
                        <a href={application.location.googleMapsLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.875rem' }}>
                            View on Google Maps ↗
                        </a>
                    )}
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Description</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{application.description}</p>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Open Days</h4>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {application.openDays?.map((day) => (
                            <span key={day} className="badge badge-accepted">
                                {day}
                            </span>
                        ))}
                    </div>
                </div>

                {application.images && application.images.length > 0 && (
                    <div>
                        <h4 style={{ marginBottom: '0.75rem', color: 'var(--text-primary)' }}>Uploaded Shop Images</h4>
                        <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                            {application.images.map((imgUrl, index) => (
                                <img
                                    key={index}
                                    src={imgUrl}
                                    alt={`Shop ${index + 1}`}
                                    style={{
                                        width: '120px',
                                        height: '90px',
                                        objectFit: 'cover',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--border-color)'
                                    }}
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyShopApplication;
