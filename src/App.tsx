import { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { useGuestUsage } from './hooks/useGuestUsage';
import { AuthPage } from './components/auth/AuthPage';
import { Dashboard } from './components/layout/Dashboard';
import { UpgradeModal } from './components/auth/UpgradeModal';

type AppView  = 'dashboard' | 'auth';
type AuthTab  = 'login' | 'register';
type LimitType = 'matrix' | 'dfa';

export default function App() {
  const auth = useAuth();
  const guest = useGuestUsage();

  const [view,         setView]         = useState<AppView>('dashboard');
  const [authTab,      setAuthTab]      = useState<AuthTab>('login');
  const [upgradeModal, setUpgradeModal] = useState<LimitType | null>(null);

  // When the user successfully authenticates, return to dashboard and reset guest counts
  useEffect(() => {
    if (auth.isAuthenticated) {
      setView('dashboard');
      setUpgradeModal(null);
      guest.resetCounts();
    }
    // We intentionally do NOT include guest.resetCounts in deps to avoid loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isAuthenticated]);

  const showAuth = (tab: AuthTab = 'login') => {
    auth.clearError();
    setAuthTab(tab);
    setView('auth');
  };

  const handleLimitReached = (type: LimitType) => {
    setUpgradeModal(type);
  };

  const handleModalSignIn = () => {
    setUpgradeModal(null);
    showAuth('login');
  };

  const handleModalSignUp = () => {
    setUpgradeModal(null);
    showAuth('register');
  };

  const handleLogout = () => {
    auth.logout();
    guest.resetCounts();
    setView('dashboard');
  };

  // Show auth page when explicitly navigated to and not yet authenticated
  if (view === 'auth' && !auth.isAuthenticated) {
    return (
      <AuthPage
        auth={auth}
        initialTab={authTab}
        onClose={() => setView('dashboard')}
      />
    );
  }

  return (
    <>
      <Dashboard
        isAuthenticated={auth.isAuthenticated}
        matrixCount={guest.matrixCount}
        dfaCount={guest.dfaCount}
        isMatrixLimitReached={guest.isMatrixLimitReached}
        isDfaLimitReached={guest.isDfaLimitReached}
        onMatrixSuccess={guest.incrementMatrix}
        onDfaSuccess={guest.incrementDfa}
        onLimitReached={handleLimitReached}
        onShowAuth={showAuth}
        onLogout={handleLogout}
      />

      {upgradeModal && (
        <UpgradeModal
          limitType={upgradeModal}
          onSignIn={handleModalSignIn}
          onSignUp={handleModalSignUp}
          onDismiss={() => setUpgradeModal(null)}
        />
      )}
    </>
  );
}
