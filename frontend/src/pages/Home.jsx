import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Home.css';

export const Home = () => {
    const { user } = useAuth();

    return (
        <div className="home-container">
            {/* Hero Section */}
            <section className="hero-section">
                <div className="hero-content">
                    <span className="hero-badge">Smart Printing Solution</span>
                    <h1 className="hero-title">
                        Order Xerox & Print Jobs Online with Ease
                    </h1>
                    <p className="hero-subtitle">
                        Connect directly with print shops around you. Upload your documents, set your print specifications, track order progress, and skip long queues.
                    </p>
                    <div className="hero-actions">
                        {user ? (
                            <>
                                <Link to="/place-order" className="btn btn-primary hero-btn">
                                    Place an Order
                                </Link>
                                <Link to="/dashboard" className="btn btn-secondary hero-btn">
                                    View Dashboard
                                </Link>
                            </>
                        ) : (
                            <>
                                <Link to="/register" className="btn btn-primary hero-btn">
                                    Get Started
                                </Link>
                                <Link to="/login" className="btn btn-secondary hero-btn">
                                    Sign In
                                </Link>
                            </>
                        )}
                    </div>
                </div>

                <div className="hero-graphic">
                    <div className="printer-card">
                        <div className="printer-card-header">
                            <div className="dot red"></div>
                            <div className="dot yellow"></div>
                            <div className="dot green"></div>
                        </div>
                        <div className="printer-card-body">
                            <div className="preview-doc">
                                <div className="doc-icon">📄</div>
                                <div className="doc-meta">
                                    <span className="doc-title">Project_Presentation.pdf</span>
                                    <span className="doc-desc">12 pages • B&W + Color • Double Sided</span>
                                </div>
                            </div>
                            <div className="preview-status">
                                <span className="badge badge-printing">Printing Ready</span>
                                <span className="status-time">Estimated 15 mins</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Feature Highlights Grid */}
            <section className="features-section">
                <h2 className="section-title">Why XeroxDosth?</h2>
                <div className="features-grid">
                    <div className="feature-card card">
                        <div className="feature-icon">🚀</div>
                        <h3>Fast & Queue-Free</h3>
                        <p>Place print orders in advance and collect them when ready without waiting in line.</p>
                    </div>

                    <div className="feature-card card">
                        <div className="feature-icon">⚙️</div>
                        <h3>Custom Print Setup</h3>
                        <p>Select exact page counts for Black & White and Color, binding options, and side preference.</p>
                    </div>

                    <div className="feature-card card">
                        <div className="feature-icon">🏪</div>
                        <h3>Shop Owner Partnering</h3>
                        <p>Apply to list your shop and manage incoming printing orders seamlessly.</p>
                    </div>

                    <div className="feature-card card">
                        <div className="feature-icon">🔒</div>
                        <h3>Secure & Transparent</h3>
                        <p>Only authorized users and shops can access order details and document links.</p>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;
