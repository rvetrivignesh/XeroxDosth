import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import './ShopForm.css';

export const ApplyAdmin = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();

    const [email, setEmail] = useState(user?.email || '');
    const [phone, setPhone] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!email.trim() || !phone.trim() || !description.trim()) {
            showToast('Please fill out all required fields', 'error');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                requestedRole: 'ADMIN',
                applicantName: user?.name || 'Applicant',
                email: email.trim(),
                phone: phone.trim(),
                description: description.trim()
            };

            await API.post('/applications', payload);
            showToast('Admin application submitted successfully!', 'success');
            navigate('/application-status');
        } catch (err) {
            showToast(err.response?.data?.message || err.message || 'Failed to submit admin application', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-container">
            <div className="form-card card">
                <div className="form-header">
                    <h2>Apply for Admin Role</h2>
                    <p>Provide details on why you should be granted administrator privileges on XeroxDhost.</p>
                </div>

                <form onSubmit={handleSubmit} className="shop-form">
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="email">Contact Email *</label>
                            <input
                                id="email"
                                type="email"
                                placeholder="your.email@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="phone">Mobile Number *</label>
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

                    <div className="form-group">
                        <label htmlFor="description">Why should you be given admin privileges & how will you help? *</label>
                        <textarea
                            id="description"
                            rows={5}
                            placeholder="Describe your background, technical or platform contribution plans, and why you require admin access..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="btn btn-primary submit-btn" disabled={loading}>
                        {loading ? <div className="spinner"></div> : 'Submit Admin Application'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ApplyAdmin;
