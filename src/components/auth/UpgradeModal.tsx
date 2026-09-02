import { useEffect, useRef } from 'react';
import { MAX_GUEST_REQUESTS } from '../../hooks/useGuestUsage';

type LimitType = 'matrix' | 'dfa';

interface UpgradeModalProps {
  limitType: LimitType;
  onSignIn: () => void;
  onSignUp: () => void;
  onDismiss: () => void;
}

const CONTENT: Record<LimitType, { icon: string; title: string; desc: string }> = {
  matrix: {
    icon: '⬡',
    title: 'Matrix limit reached',
    desc: `You've used all ${MAX_GUEST_REQUESTS} free matrix multiplication requests.`,
  },
  dfa: {
    icon: '◎',
    title: 'Automata limit reached',
    desc: `You've used all ${MAX_GUEST_REQUESTS} free regex/automata requests.`,
  },
};

export function UpgradeModal({ limitType, onSignIn, onSignUp, onDismiss }: UpgradeModalProps) {
  const { icon, title, desc } = CONTENT[limitType];
  const dialogRef = useRef<HTMLDivElement>(null);

  // Trap focus & close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', handleKey);
    // Focus the modal card
    dialogRef.current?.focus();
    return () => window.removeEventListener('keydown', handleKey);
  }, [onDismiss]);

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-modal-title"
      onClick={(e) => { if (e.target === e.currentTarget) onDismiss(); }}
    >
      <div
        className="modal-card"
        ref={dialogRef}
        tabIndex={-1}
        style={{ outline: 'none' }}
      >
        {/* Icon */}
        <div
          className="modal-icon"
          aria-hidden="true"
        >
          {icon}
        </div>

        {/* Heading */}
        <h2 id="upgrade-modal-title" style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>
          {title}
        </h2>

        <p style={{ fontSize: '0.95rem', marginBottom: '0.35rem' }}>{desc}</p>
        <p className="field__hint" style={{ fontSize: '0.88rem', marginBottom: '1.75rem' }}>
          Sign up for free to get unlimited access to both the Matrix and Automata engines.
        </p>

        {/* Usage indicators */}
        <div className="modal-usage-row" aria-hidden="true">
          <span className="modal-usage-pill modal-usage-pill--used">
            {MAX_GUEST_REQUESTS}/{MAX_GUEST_REQUESTS} used
          </span>
          <span className="modal-usage-hint">Create an account to continue →</span>
        </div>

        {/* CTAs */}
        <div className="row row--center" style={{ gap: '0.75rem', marginTop: '1.5rem' }}>
          <button
            id="btn-upgrade-signup"
            className="btn btn--primary"
            style={{ flex: 1 }}
            onClick={onSignUp}
            type="button"
          >
            🚀 Sign Up — it's free
          </button>
          <button
            id="btn-upgrade-signin"
            className="btn btn--secondary"
            style={{ flex: 1 }}
            onClick={onSignIn}
            type="button"
          >
            Sign In
          </button>
        </div>

        {/* Dismiss */}
        <p style={{ marginTop: '1.25rem', textAlign: 'center' }}>
          <button
            id="btn-upgrade-dismiss"
            type="button"
            onClick={onDismiss}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--clr-text-muted)', fontSize: '0.8rem',
              padding: 0,
            }}
          >
            Maybe later
          </button>
        </p>
      </div>
    </div>
  );
}
