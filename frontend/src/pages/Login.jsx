import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import './Auth.css';

export const Login = () => {
    const { login, loginWithGoogle } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);

    const handleGoogleCallback = async (response) => {
        setGoogleLoading(true);
        try {
            await loginWithGoogle(response.credential);
            showToast('Logged in successfully', 'success');
            navigate('/dashboard');
        } catch (err) {
            showToast(err.message || 'Google sign-in failed', 'error');
        } finally {
            setGoogleLoading(false);
        }
    };

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const isGoogleConfigured = clientId && clientId !== 'your_google_client_id_here';

    const callbackRef = React.useRef(handleGoogleCallback);
    React.useEffect(() => {
        callbackRef.current = handleGoogleCallback;
    });

    React.useEffect(() => {
        if (typeof window !== 'undefined' && !window._googleSignInCallbacks) {
            window._googleSignInCallbacks = new Set();
            window._googleSignInGlobalCallback = (response) => {
                window._googleSignInCallbacks.forEach(cb => cb(response));
            };
        }

        const executeCallback = (response) => {
            if (callbackRef.current) {
                callbackRef.current(response);
            }
        };

        window._googleSignInCallbacks?.add(executeCallback);

        const initializeGoogle = () => {
            if (!isGoogleConfigured) {
                console.warn("Google Sign-In is not configured.");
                return;
            }
            if (window.google) {
                if (!window._googleSignInInitialized) {
                    window.google.accounts.id.initialize({
                        client_id: clientId,
                        callback: (response) => {
                            if (window._googleSignInGlobalCallback) {
                                window._googleSignInGlobalCallback(response);
                            }
                        },
                    });
                    window._googleSignInInitialized = true;
                }

                const container = document.getElementById("googleSignInDiv");
                if (container) {
                    window.google.accounts.id.renderButton(container, {
                        theme: "outline",
                        size: "large",
                        width: 384
                    });
                }
            }
        };

        if (window.google) {
            initializeGoogle();
        } else {
            const script = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
            if (script) {
                script.addEventListener('load', initializeGoogle);
            }
        }

        return () => {
            window._googleSignInCallbacks?.delete(executeCallback);
            const script = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
            if (script) {
                script.removeEventListener('load', initializeGoogle);
            }
        };
    }, [googleLoading]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!email.trim() || !password.trim()) {
            showToast('Please enter both email and password', 'error');
            return;
        }

        setLoading(true);
        try {
            await login(email, password);
            showToast('Logged in successfully', 'success');
            navigate('/dashboard');
        } catch (err) {
            showToast(err.message || 'Failed to login', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card card">
                <div className="auth-header">
                    <h2>Welcome Back</h2>
                    <p>Sign in to your XeroxDosth account</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label htmlFor="email">Email Address</label>
                        <input
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="btn btn-primary auth-btn" disabled={loading || googleLoading}>
                        {loading ? <div className="spinner"></div> : 'Sign In'}
                    </button>
                </form>

                <div className="auth-divider">OR</div>

                {googleLoading ? (
                    <div className="google-loading-container">
                        <div className="spinner"></div>
                        <span>Authenticating with Google...</span>
                    </div>
                ) : isGoogleConfigured ? (
                    <div className="google-signin-btn-wrapper">
                        <div id="googleSignInDiv"></div>
                    </div>
                ) : (
                    <div className="google-loading-container" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-input)', cursor: 'default' }}>
                        <span>Google Sign-In is not configured.</span>
                    </div>
                )}

                <div className="auth-footer">
                    <span>Don't have an account?</span>{' '}
                    <Link to="/register">Create an Account</Link>
                </div>
            </div>
        </div>
    );
};

export default Login;
