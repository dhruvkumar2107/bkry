import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import CustomerLayout from './layouts/CustomerLayout.jsx';
import AdminLayout from './layouts/AdminLayout.jsx';
import DeliveryLayout from './layouts/DeliveryLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { useAuth } from './store/auth.js';
import { useCart } from './store/cart.js';

import Home from './pages/customer/Home.jsx';
import ProductsPage from './pages/customer/ProductsPage.jsx';
import CategoryPage from './pages/customer/CategoryPage.jsx';
import ProductPage from './pages/customer/ProductPage.jsx';
import SearchPage from './pages/customer/SearchPage.jsx';
import CartPage from './pages/customer/CartPage.jsx';
import CheckoutPage from './pages/customer/CheckoutPage.jsx';
import LoginPage from './pages/customer/LoginPage.jsx';
import AccountPage from './pages/customer/AccountPage.jsx';
import OrdersPage from './pages/customer/OrdersPage.jsx';
import OrderConfirmationPage from './pages/customer/OrderConfirmationPage.jsx';
import TrackOrderPage from './pages/customer/TrackOrderPage.jsx';
import NotFound from './pages/NotFound.jsx';

import AdminLogin from './pages/admin/AdminLogin.jsx';
import Dashboard from './pages/admin/Dashboard.jsx';
import AdminProducts from './pages/admin/Products.jsx';
import AdminCategories from './pages/admin/Categories.jsx';
import AdminHomepage from './pages/admin/Homepage.jsx';
import AdminOrders from './pages/admin/Orders.jsx';
import AdminCustomers from './pages/admin/Customers.jsx';
import AdminInventory from './pages/admin/Inventory.jsx';
import LiveDeliveries from './pages/admin/LiveDeliveries.jsx';
import DeliveryBoys from './pages/admin/DeliveryBoys.jsx';
import Reports from './pages/admin/Reports.jsx';
import AdminSettings from './pages/admin/Settings.jsx';

import DeliveryLogin from './pages/delivery/DeliveryLogin.jsx';
import AssignedDeliveries from './pages/delivery/AssignedDeliveries.jsx';
import ActiveDeliveries from './pages/delivery/ActiveDeliveries.jsx';
import DeliveryDetail from './pages/delivery/DeliveryDetail.jsx';
import DeliveryHistory from './pages/delivery/DeliveryHistory.jsx';

export default function App() {
  const { loadMe } = useAuth();
  const { fetch } = useCart();

  useEffect(() => {
    loadMe();
    fetch();
  }, [loadMe, fetch]);

  return (
    <Routes>
      <Route element={<CustomerLayout />}>
        <Route index element={<Home />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="category/:slug" element={<CategoryPage />} />
        <Route path="product/:slug" element={<ProductPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="order/:orderNumber" element={<OrderConfirmationPage />} />
        <Route path="track-order/:orderNumber" element={<TrackOrderPage />} />
      </Route>

      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<ProtectedRoute role="ADMIN"><AdminLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="categories" element={<AdminCategories />} />
        <Route path="homepage" element={<AdminHomepage />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="customers" element={<AdminCustomers />} />
        <Route path="inventory" element={<AdminInventory />} />
        <Route path="live-deliveries" element={<LiveDeliveries />} />
        <Route path="delivery-boys" element={<DeliveryBoys />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      <Route path="/delivery/login" element={<DeliveryLogin />} />
      <Route path="/delivery" element={<ProtectedRoute role="DELIVERY"><DeliveryLayout /></ProtectedRoute>}>
        <Route index element={<AssignedDeliveries />} />
        <Route path="active" element={<ActiveDeliveries />} />
        <Route path="history" element={<DeliveryHistory />} />
        <Route path=":id" element={<DeliveryDetail />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
