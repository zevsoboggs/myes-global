import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider } from './contexts/AuthContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Preloader } from './components/Preloader';
import ErrorBoundary from './components/ErrorBoundary';
import { BottomNav } from './components/BottomNav';
import { AIChatWidget } from './components/AIChatWidget';
import { LoadingProvider, useLoading } from './contexts/LoadingContext';
const lazyNamed = (importer: () => Promise<any>, exportName: string) => lazy(() => importer().then(m => ({ default: m[exportName] || m.default })));
const HomePage = lazyNamed(() => import('./pages/HomePage'), 'HomePage');
const AuthPage = lazyNamed(() => import('./pages/AuthPage'), 'AuthPage');
const PropertiesPage = lazyNamed(() => import('./pages/PropertiesPage'), 'PropertiesPage');
const PropertyDetailPage = lazyNamed(() => import('./pages/PropertyDetailPage'), 'PropertyDetailPage');
const PropertyEditPage = lazyNamed(() => import('./pages/PropertyEditPage'), 'PropertyEditPage');
const AddPropertyPage = lazyNamed(() => import('./pages/AddPropertyPage'), 'AddPropertyPage');
const DashboardPage = lazyNamed(() => import('./pages/DashboardPage'), 'DashboardPage');
const VerificationPage = lazyNamed(() => import('./pages/VerificationPage'), 'VerificationPage');
const ChatsPage = lazyNamed(() => import('./pages/ChatsPage'), 'ChatsPage');
const LovePayAdminPage = lazyNamed(() => import('./pages/LovePayAdminPage'), 'LovePayAdminPage');
const ProfileEditPage = lazyNamed(() => import('./pages/ProfileEditPage'), 'ProfileEditPage');
const FavoritesPage = lazyNamed(() => import('./pages/FavoritesPage'), 'FavoritesPage');
const SaleDetailsPage = lazyNamed(() => import('./pages/SaleDetailsPage'), 'SaleDetailsPage');
const SaleReceiptPage = lazyNamed(() => import('./pages/SaleReceiptPage'), 'SaleReceiptPage');
const AnalyticsPage = lazyNamed(() => import('./pages/AnalyticsPage'), 'AnalyticsPage');
const SavedSearchesPage = lazyNamed(() => import('./pages/SavedSearchesPage'), 'SavedSearchesPage');
const ComparePage = lazyNamed(() => import('./pages/ComparePage'), 'ComparePage');
const FeedPage = lazyNamed(() => import('./pages/FeedPage'), 'FeedPage');
const ShowingsPage = lazyNamed(() => import('./pages/ShowingsPage'), 'ShowingsPage');
const PreferencesPage = lazyNamed(() => import('./pages/PreferencesPage'), 'PreferencesPage');
const SharePage = lazyNamed(() => import('./pages/SharePage'), 'SharePage');
const LeadsBoardPage = lazyNamed(() => import('./pages/LeadsBoardPage'), 'LeadsBoardPage');
const DealsPage = lazyNamed(() => import('./pages/DealsPage'), 'DealsPage');
const LawyersPage = lazyNamed(() => import('./pages/LawyersPage'), 'LawyersPage');
const AdsPage = lazyNamed(() => import('./pages/AdsPage'), 'AdsPage');
const AdsCreatePage = lazyNamed(() => import('./pages/AdsCreatePage'), 'AdsCreatePage');
const LovePayLayout = lazyNamed(() => import('./pages/LovePayLayout'), 'LovePayLayout');
const LovePayRequestsPage = lazyNamed(() => import('./pages/LovePayRequestsPage'), 'LovePayRequestsPage');
const LovePayVerificationsPage = lazyNamed(() => import('./pages/LovePayVerificationsPage'), 'LovePayVerificationsPage');
const LovePayCommissionsPage = lazyNamed(() => import('./pages/LovePayCommissionsPage'), 'LovePayCommissionsPage');
const LovePayPayoutsPage = lazyNamed(() => import('./pages/LovePayPayoutsPage'), 'LovePayPayoutsPage');
const LovePayLoginPage = lazyNamed(() => import('./pages/LovePayLoginPage'), 'LovePayLoginPage');
const LovePaySettingsPage = lazyNamed(() => import('./pages/LovePaySettingsPage'), 'LovePaySettingsPage');
const LovePayAuditLogPage = lazyNamed(() => import('./pages/LovePayAuditLogPage'), 'LovePayAuditLogPage');
const LovePayCRMPage = lazyNamed(() => import('./pages/LovePayCRMPage'), 'LovePayCRMPage');
const LovePayInstructionsPage = lazyNamed(() => import('./pages/LovePayInstructionsPage'), 'LovePayInstructionsPage');
const PartnerCertificatePage = lazyNamed(() => import('./pages/PartnerCertificatePage'), 'PartnerCertificatePage');
const VeriffCallbackPage = lazyNamed(() => import('./pages/VeriffCallbackPage'), 'VeriffCallbackPage');
const MyesLayout = lazyNamed(() => import('./pages/MyesLayout'), 'MyesLayout');
const MyesLoginPage = lazyNamed(() => import('./pages/MyesLoginPage'), 'MyesLoginPage');
const MyesOverviewPage = lazyNamed(() => import('./pages/MyesOverviewPage'), 'MyesOverviewPage');
const MyesUsersPage = lazyNamed(() => import('./pages/MyesUsersPage'), 'MyesUsersPage');
const MyesPropertiesPage = lazyNamed(() => import('./pages/MyesPropertiesPage'), 'MyesPropertiesPage');
const MyesSalesPage = lazyNamed(() => import('./pages/MyesSalesPage'), 'MyesSalesPage');
const MyesInvoicesPage = lazyNamed(() => import('./pages/MyesInvoicesPage'), 'MyesInvoicesPage');
const MyesChatsPage = lazyNamed(() => import('./pages/MyesChatsPage'), 'MyesChatsPage');
const MyesNotificationsPage = lazyNamed(() => import('./pages/MyesNotificationsPage'), 'MyesNotificationsPage');
const MyesAnalyticsPage = lazyNamed(() => import('./pages/MyesAnalyticsPage'), 'MyesAnalyticsPage');
const MyesLeadsPage = lazyNamed(() => import('./pages/MyesLeadsPage'), 'MyesLeadsPage');
const MyesSettingsPage = lazyNamed(() => import('./pages/MyesSettingsPage'), 'MyesSettingsPage');
const MyesAuditPage = lazyNamed(() => import('./pages/MyesAuditPage'), 'MyesAuditPage');
const MyesSystemPage = lazyNamed(() => import('./pages/MyesSystemPage'), 'MyesSystemPage');
const MyesFlagsPage = lazyNamed(() => import('./pages/MyesFlagsPage'), 'MyesFlagsPage');
const MyesInstructionsPage = lazyNamed(() => import('./pages/MyesInstructionsPage'), 'MyesInstructionsPage');
const ReferralPage = lazyNamed(() => import('./pages/ReferralPage'), 'ReferralPage');
const RentalsPage = lazyNamed(() => import('./pages/RentalsPage'), 'RentalsPage');
const AddRentalPropertyPage = lazyNamed(() => import('./pages/AddRentalPropertyPage'), 'AddRentalPropertyPage');
const RentalBookingPage = lazyNamed(() => import('./pages/RentalBookingPage'), 'RentalBookingPage');
const ManageRentalBookingsPage = lazyNamed(() => import('./pages/ManageRentalBookingsPage'), 'ManageRentalBookingsPage');
const MyRentalPropertiesPage = lazyNamed(() => import('./pages/MyRentalPropertiesPage'), 'MyRentalPropertiesPage');


function HeaderVisible() {
  const location = useLocation();
  if (location.pathname.startsWith('/lovepay')) return null;
  if (location.pathname.startsWith('/myes')) return null;
  return <Header />;
}

function ChatWidgetVisible() {
  const location = useLocation();
  if (location.pathname === '/chats') return null;
  if (location.pathname.startsWith('/lovepay')) return null;
  if (location.pathname.startsWith('/myes')) return null;
  return <AIChatWidget />;
}

function AppContent() {
  const { isNavigating } = useLoading();

  if (isNavigating) {
    return <Preloader />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:ml-72 transition-all duration-300">
        <HeaderVisible />
        <div className="pb-20 lg:pb-0">
          <BottomNav />
          <ChatWidgetVisible />
          <Suspense fallback={<Preloader />}>
            <ErrorBoundary>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/properties" element={<PropertiesPage />} />
                <Route path="/properties/:id" element={<PropertyDetailPage />} />
                <Route path="/properties/:id/edit" element={<PropertyEditPage />} />
                <Route path="/properties/new" element={<AddPropertyPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/verification" element={<VerificationPage />} />
                <Route path="/profile/edit" element={<ProfileEditPage />} />
                <Route path="/favorites" element={<FavoritesPage />} />
                <Route path="/deals" element={<DealsPage />} />
                <Route path="/lawyers" element={<LawyersPage />} />
                <Route path="/chats" element={<ChatsPage />} />
                <Route path="/sales/:id" element={<SaleDetailsPage />} />
                <Route path="/sales/:id/receipt" element={<SaleReceiptPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/saved-searches" element={<SavedSearchesPage />} />
                <Route path="/compare" element={<ComparePage />} />
                <Route path="/feed" element={<FeedPage />} />
                <Route path="/showings" element={<ShowingsPage />} />
                <Route path="/preferences" element={<PreferencesPage />} />
                <Route path="/share" element={<SharePage />} />
                <Route path="/leads" element={<LeadsBoardPage />} />
                <Route path="/ads" element={<AdsPage />} />
                <Route path="/ads/create" element={<AdsCreatePage />} />
                <Route path="/partner-certificate/:id" element={<PartnerCertificatePage />} />
                <Route path="/veriff/callback" element={<VeriffCallbackPage />} />
                <Route path="/referral" element={<ReferralPage />} />

                <Route path="/lovepay" element={<LovePayLayout />}>
                  <Route index element={<LovePayAdminPage />} />
                  <Route path="login" element={<LovePayLoginPage />} />
                  <Route path="requests" element={<LovePayRequestsPage />} />
                  <Route path="verifications" element={<LovePayVerificationsPage />} />
                  <Route path="commissions" element={<LovePayCommissionsPage />} />
                  <Route path="payouts" element={<LovePayPayoutsPage />} />
                  <Route path="settings" element={<LovePaySettingsPage />} />
                  <Route path="audit" element={<LovePayAuditLogPage />} />
                  <Route path="crm" element={<LovePayCRMPage />} />
                  <Route path="instructions" element={<LovePayInstructionsPage />} />
                </Route>

                <Route path="/myes" element={<MyesLayout />}>
                  <Route index element={<MyesOverviewPage />} />
                  <Route path="login" element={<MyesLoginPage />} />
                  <Route path="users" element={<MyesUsersPage />} />
                  <Route path="properties" element={<MyesPropertiesPage />} />
                  <Route path="sales" element={<MyesSalesPage />} />
                  <Route path="invoices" element={<MyesInvoicesPage />} />
                  <Route path="chats" element={<MyesChatsPage />} />
                  <Route path="notifications" element={<MyesNotificationsPage />} />
                  <Route path="analytics" element={<MyesAnalyticsPage />} />
                  <Route path="leads" element={<MyesLeadsPage />} />
                  <Route path="settings" element={<MyesSettingsPage />} />
                  <Route path="audit" element={<MyesAuditPage />} />
                  <Route path="system" element={<MyesSystemPage />} />
                  <Route path="flags" element={<MyesFlagsPage />} />
                  <Route path="instructions" element={<MyesInstructionsPage />} />
                </Route>

                <Route path="/rentals" element={<RentalsPage />} />
                <Route path="/rentals/add" element={<AddRentalPropertyPage />} />
                <Route path="/rentals/my-properties" element={<MyRentalPropertiesPage />} />
                <Route path="/rentals/:id/book" element={<RentalBookingPage />} />
                <Route path="/rentals/bookings" element={<ManageRentalBookingsPage />} />

                <Route path="*" element={
                  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                    <div className="text-center">
                      <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                      <p className="text-gray-600">Страница не найдена</p>
                    </div>
                  </div>
                } />
              </Routes>
            </ErrorBoundary>
          </Suspense>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <LanguageProvider>
      <Router>
        <AuthProvider>
          <LoadingProvider>
            <AppContent />
          </LoadingProvider>
        </AuthProvider>
      </Router>
    </LanguageProvider>
  );
}

export default App;
