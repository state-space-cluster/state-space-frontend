interface NavbarProps {
  username?: string;
  onLogout: () => void;
}

export function Navbar({ username, onLogout }: NavbarProps) {
  return (
    <nav className="navbar" aria-label="Main navigation">
      <div className="navbar__brand">
        <div className="navbar__logo" aria-hidden="true">S²</div>
        StateSpace
      </div>
      <div className="row">
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
      </div>
    </nav>
  );
}
