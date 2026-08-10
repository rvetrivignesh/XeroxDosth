import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';

import Navbar from './components/Navbar';
import ProtectedRoute, { PublicOnlyRoute } from './components/ProtectedRoute';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
// import ApplyShop from './pages/ApplyShop';
// import ApplyAdmin from './pages/ApplyAdmin';
// import ApplicationStatus from './pages/ApplicationStatus';
import UpdateShop from './pages/UpdateShop';
import PlaceOrder from './pages/PlaceOrder';
import MyOrders from './pages/MyOrders';
import ShopOrders from './pages/ShopOrders';
import AdminApplications from './pages/AdminApplications';
import AdminShops from './pages/AdminShops';
import ManageAdmins from './pages/ManageAdmins';
import Shops from './pages/Shops';
import PaymentRequest from './pages/PaymentRequest';
import Notifications from './pages/Notifications';

export function App() {
    return (
        <ThemeProvider>
            <ToastProvider>
                <AuthProvider>
                    <Router basename={import.meta.env.BASE_URL}>
                        <div className="app-layout">
                            <Navbar />
                            <main className="main-content">
                                <Routes>
                                    {/* Public Only Routes (Redirect to /dashboard if logged in) */}
                                    <Route path="/" element={<PublicOnlyRoute><Home /></PublicOnlyRoute>} />
                                    <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
                                    <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />

                                    {/* Protected Routes */}
                                    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                                    <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                                    <Route path="/place-order" element={<ProtectedRoute><PlaceOrder /></ProtectedRoute>} />
                                    <Route path="/my-orders" element={<ProtectedRoute><MyOrders /></ProtectedRoute>} />
                                    <Route path="/shops" element={<ProtectedRoute><Shops /></ProtectedRoute>} />
                                    <Route path="/payment-request/:orderId" element={<ProtectedRoute><PaymentRequest /></ProtectedRoute>} />
                                    <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                                    
                                    {/* <Route path="/apply-shop" element={<ProtectedRoute><ApplyShop /></ProtectedRoute>} />
                                    <Route path="/apply-admin" element={<ProtectedRoute><ApplyAdmin /></ProtectedRoute>} />
                                    <Route path="/application-status" element={<ProtectedRoute><ApplicationStatus /></ProtectedRoute>} />
                                    <Route path="/my-shop-application" element={<Navigate to="/application-status" replace />} /> */}
                                    
                                    {/* Shop Owner Routes */}
                                    <Route path="/update-shop" element={<ProtectedRoute><UpdateShop /></ProtectedRoute>} />
                                    <Route path="/shop-orders" element={<ProtectedRoute><ShopOrders /></ProtectedRoute>} />

                                    {/* Admin Management Routes */}
                                    <Route path="/admin/applications" element={<ProtectedRoute><AdminApplications /></ProtectedRoute>} />
                                    <Route path="/admin/shops" element={<ProtectedRoute><AdminShops /></ProtectedRoute>} />
                                    <Route path="/admin/manage-admins" element={<ProtectedRoute><ManageAdmins /></ProtectedRoute>} />
                                    <Route path="/admin/manage-shops" element={<ProtectedRoute><AdminShops /></ProtectedRoute>} />

                                    {/* Catch-all redirect */}
                                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                                </Routes>
                            </main>
                        </div>
                    </Router>
                </AuthProvider>
            </ToastProvider>
        </ThemeProvider>
    );
}

export default App;
