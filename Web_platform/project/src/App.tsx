import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/hooks/useAuth';
import { CartProvider } from '@/hooks/useCart';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { DashboardLayout } from '@/layouts/DashboardLayout';

// Public pages
import { HomePage } from '@/pages/HomePage';
import { BrowsePage } from '@/pages/BrowsePage';
import { ProductDetailPage } from '@/pages/ProductDetailPage';
import { CartPage } from '@/pages/CartPage';
import { AboutPage } from '@/pages/AboutPage';
import { FAQPage } from '@/pages/FAQPage';
import { ContactPage } from '@/pages/ContactPage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { UnauthorizedPage } from '@/pages/UnauthorizedPage';

// Customer pages
import { CustomerDashboard } from '@/pages/CustomerDashboard';
import { CheckoutPage } from '@/pages/CheckoutPage';
import { OrdersPage } from '@/pages/OrdersPage';
import { OrderDetailPage } from '@/pages/OrderDetailPage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { EarningsPage } from '@/pages/EarningsPage';

// Business pages
import { BusinessDashboard } from '@/pages/business/BusinessDashboard';
import { BusinessOrdersPage, BusinessOrderDetailPage } from '@/pages/business/BusinessOrders';
import { BusinessCatalogPage } from '@/pages/business/BusinessCatalog';
import { BusinessRegisterPage } from '@/pages/business/BusinessRegisterPage';

// Rider pages
import { RiderDashboard } from '@/pages/rider/RiderDashboard';
import { RiderDeliveryDetailPage } from '@/pages/rider/RiderDeliveryDetail';
import { RiderRegisterPage } from '@/pages/rider/RiderRegisterPage';

// Admin pages
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { AdminBusinessesPage, AdminBusinessDetailPage } from '@/pages/admin/AdminBusinesses';
import { AdminOperationsPage } from '@/pages/admin/AdminOperations';
import { AdminAccessPage } from '@/pages/admin/AdminAccessPage';
import { AdminRidersPage } from '@/pages/admin/AdminRiders';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function PublicPagesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

function ScrollManager() {
  const location = useLocation();

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (location.hash) {
        document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: 'start' });
      } else {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [location.pathname, location.hash]);

  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <BrowserRouter>
            <ScrollManager />
            <Routes>
              {/* Auth pages — no public header/footer */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route
                path="/business/register"
                element={<BusinessRegisterPage />}
              />
              <Route
                path="/rider/register"
                element={
                  <ProtectedRoute allowedRoles={['CUSTOMER']}>
                    <RiderRegisterPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/unauthorized" element={<UnauthorizedPage />} />

              {/* Public pages — with header and footer */}
              <Route path="/" element={<PublicPagesLayout><HomePage /></PublicPagesLayout>} />
              <Route path="/browse" element={<PublicPagesLayout><BrowsePage /></PublicPagesLayout>} />
              <Route path="/product/:id" element={<PublicPagesLayout><ProductDetailPage /></PublicPagesLayout>} />
              <Route path="/cart" element={<PublicPagesLayout><CartPage /></PublicPagesLayout>} />
              <Route path="/about" element={<PublicPagesLayout><AboutPage /></PublicPagesLayout>} />
              <Route path="/faq" element={<PublicPagesLayout><FAQPage /></PublicPagesLayout>} />
              <Route path="/contact" element={<PublicPagesLayout><ContactPage /></PublicPagesLayout>} />

              {/* Customer authenticated routes — use dashboard layout */}
              <Route
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                {/* Customer routes */}
                <Route path="/dashboard" element={<CustomerDashboard />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/orders" element={<OrdersPage />} />
                <Route path="/orders/:orderId" element={<OrderDetailPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/earnings" element={<ProtectedRoute allowedRoles={['BUSINESS_USER', 'RIDER']}><EarningsPage /></ProtectedRoute>} />

                {/* Business routes */}
                <Route
                  path="/business"
                  element={
                    <ProtectedRoute allowedRoles={['BUSINESS_USER', 'ADMIN']}>
                      <BusinessDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/business/orders"
                  element={
                    <ProtectedRoute allowedRoles={['BUSINESS_USER', 'ADMIN']}>
                      <BusinessOrdersPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/business/orders/:orderId"
                  element={
                    <ProtectedRoute allowedRoles={['BUSINESS_USER', 'ADMIN']}>
                      <BusinessOrderDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/business/catalog"
                  element={
                    <ProtectedRoute allowedRoles={['BUSINESS_USER', 'ADMIN']}>
                      <BusinessCatalogPage />
                    </ProtectedRoute>
                  }
                />

                {/* Rider routes */}
                <Route
                  path="/rider"
                  element={
                    <ProtectedRoute allowedRoles={['RIDER', 'ADMIN']}>
                      <RiderDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/rider/deliveries/:deliveryId"
                  element={
                    <ProtectedRoute allowedRoles={['RIDER', 'ADMIN']}>
                      <RiderDeliveryDetailPage />
                    </ProtectedRoute>
                  }
                />

                {/* Admin routes */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/businesses"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <AdminBusinessesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/riders"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <AdminRidersPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/businesses/:businessId"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <AdminBusinessDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/operations"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <AdminOperationsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/access"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <AdminAccessPage />
                    </ProtectedRoute>
                  }
                />
              </Route>

              {/* Catch-all */}
              <Route
                path="*"
                element={
                  <PublicPagesLayout>
                    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
                      <h1 className="font-display text-4xl font-bold text-gray-900">404</h1>
                      <p className="text-gray-600">The page you are looking for does not exist.</p>
                      <a
                        href="/"
                        className="inline-flex h-11 items-center rounded-lg bg-primary-600 px-6 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
                      >
                        Back to Home
                      </a>
                    </div>
                  </PublicPagesLayout>
                }
              />
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
