import { MAX_GUEST_REQUESTS } from '../../hooks/useGuestUsage';

interface NavbarProps {
  isAuthenticated: boolean;
  username?: string;
  matrixCount?: number;
  dfaCount?: number;
  onLogout?: () => void;
  onShowAuth?: (tab?: 'login' | 'register') => void;
}

export function Navbar({
  isAuthenticated,
  username,
  matrixCount = 0,
  dfaCount = 0,
  onLogout,
  onShowAuth,
}: NavbarProps) {
  return (
    <nav className="navbar" aria-label="Main navigation">
      <div className="navbar__brand">
        <div className="navbar__logo" aria-hidden="true">S²</div>
        StateSpace
      </div>

      <div className="row" style={{ gap: '0.6rem' }}>
        {isAuthenticated ? (
          <>
            {username && (
              <span className="badge badge--neutral" style={{ fontSize: '0.72rem' }}>
                🔑 {username}
              </span>
            )}
            <button
              id="btn-logout"
              className="btn btn--secondary btn--sm"
              onClick={onLogout}
              aria-label="Log out"
            >
              Log out
            </button>
          </>
        ) : (
          <>
            {/* Guest usage indicators */}
            <span
              className={`guest-counter ${matrixCount >= MAX_GUEST_REQUESTS ? 'guest-counter--exhausted' : ''}`}
              title={`Matrix requests: ${matrixCount}/${MAX_GUEST_REQUESTS}`}
              aria-label={`Matrix requests used: ${matrixCount} of ${MAX_GUEST_REQUESTS}`}
            >
              ⬡ {matrixCount}/{MAX_GUEST_REQUESTS}
            </span>
            <span
              className={`guest-counter ${dfaCount >= MAX_GUEST_REQUESTS ? 'guest-counter--exhausted' : ''}`}
              title={`Automata requests: ${dfaCount}/${MAX_GUEST_REQUESTS}`}
              aria-label={`Automata requests used: ${dfaCount} of ${MAX_GUEST_REQUESTS}`}
            >
              ◎ {dfaCount}/{MAX_GUEST_REQUESTS}
            </span>

            <button
              id="btn-nav-signin"
              className="btn btn--secondary btn--sm"
              onClick={() => onShowAuth?.('login')}
              type="button"
            >
              Sign In
            </button>
            <button
              id="btn-nav-signup"
              className="btn btn--primary btn--sm"
              onClick={() => onShowAuth?.('register')}
              type="button"
            >
              Sign Up
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
