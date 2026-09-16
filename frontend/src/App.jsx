import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';

import Navbar from './components/Navbar';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute, { PublicOnlyRoute } from './components/ProtectedRoute';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import UpdateShop from './pages/UpdateShop';
import PlaceOrder from './pages/PlaceOrder';
import StepService from './pages/order-steps/StepService';
import StepShop from './pages/order-steps/StepShop';
import StepConfigureFiles from './pages/order-steps/StepConfigureFiles';
import StepOrderDetails from './pages/order-steps/StepOrderDetails';
import StepReview from './pages/order-steps/StepReview';
import MyOrders from './pages/MyOrders';
import ShopOrders from './pages/ShopOrders';
import AdminApplications from './pages/AdminApplications';
import AdminShops from './pages/AdminShops';
import ManageAdmins from './pages/ManageAdmins';
import Shops from './pages/Shops';
import PaymentRequest from './pages/PaymentRequest';
import Notifications from './pages/Notifications';
import OrderDetail from './pages/OrderDetail';

export function App() {
    return (
        <ThemeProvider>
            <ToastProvider>
                <AuthProvider>
                    <Router>
                        <ScrollToTop />
                        <div className="app-layout">
                            <Navbar />
                            <main className="main-content">
                                <Routes>
                                    {/* Public Only Routes */}
                                    <Route path="/" element={<PublicOnlyRoute><Home /></PublicOnlyRoute>} />
                                    <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
                                    <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />

                                    {/* Protected Routes */}
                                    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                                    <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                                    
                                    {/* Place Order Wizard with Sub-Routes */}
                                    <Route path="/place-order" element={<ProtectedRoute><PlaceOrder /></ProtectedRoute>}>
                                        <Route index element={<Navigate to="/place-order/service" replace />} />
                                        <Route path="service" element={<StepService />} />
                                        <Route path="shop" element={<StepShop />} />
                                        <Route path="configure-files" element={<StepConfigureFiles />} />
                                        <Route path="order-details" element={<StepOrderDetails />} />
                                        <Route path="review" element={<StepReview />} />
                                    </Route>

                                    <Route path="/my-orders" element={<ProtectedRoute><MyOrders /></ProtectedRoute>} />
                                    <Route path="/order/:orderId" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
                                    <Route path="/shops" element={<ProtectedRoute><Shops /></ProtectedRoute>} />
                                    <Route path="/payment-request/:orderId" element={<ProtectedRoute><PaymentRequest /></ProtectedRoute>} />
                                    <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                                    
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
