/**
 * App.jsx — Root Application with React Router
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// Layouts ////////////////
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';

// Auth Pages
import LoginPage from './pages/LoginPage';
import MFAPage from './pages/MFAPage';

// Dashboard & App Pages
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Categories from './pages/Categories';
import Orders from './pages/Orders';
import Enquiries from './pages/Enquiries';
import Quotes from './pages/Quotes';
import Invoices from './pages/Invoices';
import Chatbot from './pages/Chatbot';
import Reports from './pages/Reports';
import ImportExport from './pages/ImportExport';
import SiteSettings from './pages/SiteSettings';
import Profile from './pages/Profile';
import ParentMaster from './pages/ParentMaster';
import CategoryMaster from './pages/CategoryMaster';
import SubCategoryMaster from './pages/SubCategoryMaster';
import ProductMaster from './pages/ProductMaster';
import QuoteEnquiries from './pages/QuoteEnquiries';
import ContactEnquiries from './pages/ContactEnquiries';
import BestSellingMaster from './pages/BestSellingMaster';
import NewArrivalsMaster from './pages/NewArrivalsMaster';
import GeneralEnquiries from './pages/GeneralEnquiries';
import SampleEnquiries from './pages/SampleEnquiries';
import CustomerMaster from './pages/CustomerMaster';
import CountryMaster from './pages/CountryMaster';
import OrderTracking from './pages/OrderTracking';

// ─── Route Guards ──────────────────────────────
const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, authStage } = useAuth();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  if (authStage === 'mfa_required') return <Navigate to="/mfa" replace />;
  return children;
};

const MFARoute = ({ children }) => {
  const { authStage } = useAuth();
  return authStage === 'mfa_required' ? children : <Navigate to="/login" replace />;
};

// ─── Full Page Loader ──────────────────────────
const FullPageLoader = () => (
  <div className="min-h-screen bg-surface-100 flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
      <p className="text-primary-400 font-body text-sm">Loading...</p>
    </div>
  </div>
);

// ─── App Router ────────────────────────────────
const AppRouter = () => (
  <Routes>
    {/* Public auth routes */}
    <Route path="/login" element={<PublicRoute><AuthLayout><LoginPage /></AuthLayout></PublicRoute>} />
    <Route path="/mfa"   element={<MFARoute><AuthLayout><MFAPage /></AuthLayout></MFARoute>} />

    {/* Protected admin routes */}
    <Route path="/" element={<PrivateRoute><MainLayout /></PrivateRoute>}>
      <Route index element={<Navigate to="/dashboard" replace />} />
      <Route path="dashboard"    element={<Dashboard />} />
      <Route path="parent-master" element={<ParentMaster />} />
      <Route path="products"     element={<Products />} />
      <Route path="category-master" element={<CategoryMaster />} />
      <Route path="sub-category-master" element={<SubCategoryMaster />} />
      <Route path="product-master"      element={<ProductMaster />} />
      <Route path="quote-enquiries"     element={<QuoteEnquiries />} />
      <Route path="contact-enquiries"   element={<ContactEnquiries />} />
      <Route path="best-selling"        element={<BestSellingMaster />} />
      <Route path="new-arrivals"        element={<NewArrivalsMaster />} />
      <Route path="general-enquiries"   element={<GeneralEnquiries />} />
      <Route path="sample-enquiries"    element={<SampleEnquiries />} />
      {/* order-history was merged into order-tracking — keep the old URL working */}
      <Route path="order-history"       element={<Navigate to="/order-tracking" replace />} />
      {/* Order Status Master was removed (mock/localStorage-only feature, no backend) — keep the old URL working */}
      <Route path="order-status-master" element={<Navigate to="/order-tracking" replace />} />
      <Route path="order-tracking"      element={<OrderTracking />} />
      <Route path="customer-master"     element={<CustomerMaster />} />
      <Route path="categories"   element={<Categories />} />
      <Route path="country-master" element={<CountryMaster />} />
      <Route path="enquiries"    element={<Enquiries />} />
      <Route path="quotes"       element={<Quotes />} />
      {/* orders kept for backward compat */}
      <Route path="orders"       element={<Orders />} />
      {/* invoices — commented out in sidebar but route kept */}
      <Route path="invoices"     element={<Invoices />} />
      <Route path="chat"         element={<Chatbot />} />
      <Route path="reports"      element={<Reports />} />
      <Route path="import-export" element={<ImportExport />} />
      <Route path="settings"     element={<SiteSettings />} />
      <Route path="profile"      element={<Profile />} />
    </Route>

    {/* Catch all */}
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>
);

// ─── Root App ──────────────────────────────────
const App = () => (
  <BrowserRouter>
    <ThemeProvider>
      <AuthProvider>
        <AppRouter />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              fontFamily: '"DM Sans", sans-serif',
              fontSize: '13px',
              borderRadius: '12px',
              padding: '12px 16px',
              boxShadow: '0 4px 20px rgba(51,87,101,0.15)',
            },
            success: { iconTheme: { primary: '#335765', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>
);

export default App;
