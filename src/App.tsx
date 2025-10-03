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
