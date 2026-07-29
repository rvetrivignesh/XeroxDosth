import React from 'react';
import { useAuth } from '../context/AuthContext';

export const Profile = () => {
    const { user } = useAuth();

    return (
        <div className="page-container">
            <div className="card" style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '2rem' }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--accent-color)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.75rem',
                        fontWeight: '700'
                    }}>
                        {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>{user?.name}</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{user?.email}</p>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ padding: '0.85rem 1rem', backgroundColor: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>User ID</span>
                        <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{user?._id}</strong>
                    </div>

                    <div style={{ padding: '0.85rem 1rem', backgroundColor: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Account Role</span>
                        <span className="badge badge-accepted" style={{ marginTop: '0.25rem' }}>{user?.role}</span>
                    </div>

                    <div style={{ padding: '0.85rem 1rem', backgroundColor: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Account Status</span>
                        <span className="badge badge-approved" style={{ marginTop: '0.25rem' }}>{user?.accountStatus}</span>
                    </div>

                    {user?.createdAt && (
                        <div style={{ padding: '0.85rem 1rem', backgroundColor: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Member Since</span>
                            <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                                {new Date(user.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })}
                            </strong>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Profile;
