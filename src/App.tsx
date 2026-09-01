import { useAuth } from './hooks/useAuth';
import { LoginForm } from './components/auth/LoginForm';
import { Dashboard } from './components/layout/Dashboard';

export default function App() {
  const auth = useAuth();

  return auth.isAuthenticated ? (
    <Dashboard onLogout={auth.logout} />
  ) : (
    <LoginForm auth={auth} />
  );
}
