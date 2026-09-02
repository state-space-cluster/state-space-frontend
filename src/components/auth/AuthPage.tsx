import { useState, useEffect } from 'react';
import type { UseAuthReturn } from '../../hooks/useAuth';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';

type AuthTab = 'login' | 'register';

interface AuthPageProps {
  auth: UseAuthReturn;
  initialTab?: AuthTab;
  onClose?: () => void;
}

export function AuthPage({ auth, initialTab = 'login', onClose }: AuthPageProps) {
  const [tab, setTab] = useState<AuthTab>(initialTab);

  // Sync if the caller changes initialTab (e.g. modal switching from sign-in to sign-up CTA)
  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  // Clear API errors when switching tabs
  const switchTab = (next: AuthTab) => {
    auth.clearError();
    setTab(next);
  };

  return (
    <div className="login-page">
      <div className="card login-card" role="main">
        {/* Brand header */}
        <header className="login-card__header">
          <div
            style={{
              width: 56, height: 56,
              margin: '0 auto 1rem',
              background: 'linear-gradient(135deg, var(--clr-primary), var(--clr-accent-dim))',
              borderRadius: '14px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.6rem',
              boxShadow: 'var(--shadow-glow)',
            }}
            aria-hidden="true"
          >
            S²
          </div>
          <h1 style={{ fontSize: '1.6rem' }}>StateSpace</h1>
          <p className="login-card__subtitle">
            {tab === 'login'
              ? 'Sign in to unlock unlimited access.'
              : 'Create your free account.'}
          </p>
        </header>

        {/* Tab switcher */}
        <div className="auth-tabs" role="tablist" aria-label="Authentication options">
          <button
            id="auth-tab-login"
            role="tab"
            aria-selected={tab === 'login'}
            className={`auth-tab-btn${tab === 'login' ? ' auth-tab-btn--active' : ''}`}
            onClick={() => switchTab('login')}
            type="button"
          >
            Sign In
          </button>
          <button
            id="auth-tab-register"
            role="tab"
            aria-selected={tab === 'register'}
            className={`auth-tab-btn${tab === 'register' ? ' auth-tab-btn--active' : ''}`}
            onClick={() => switchTab('register')}
            type="button"
          >
            Sign Up
          </button>
        </div>

        {/* Tab panels */}
        {tab === 'login' ? (
          <LoginForm auth={auth} onSwitchToRegister={() => switchTab('register')} />
        ) : (
          <RegisterForm auth={auth} onSwitchToLogin={() => switchTab('login')} />
        )}

        {/* Back to app link for guests */}
        {onClose && (
          <p style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.78rem' }}
             className="field__hint">
            <button
              id="btn-auth-back"
              type="button"
              onClick={onClose}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--clr-text-muted)', fontSize: 'inherit',
                padding: 0, textDecoration: 'underline',
              }}
            >
              ← Back to app
            </button>
          </p>
        )}

        <p style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.75rem' }}
           className="field__hint">
          Token stored in <code>sessionStorage</code> — cleared when you close this tab.
        </p>
      </div>
    </div>
  );
}
