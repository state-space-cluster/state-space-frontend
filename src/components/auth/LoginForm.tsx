import { useState, type FormEvent } from 'react';
import type { UseAuthReturn } from '../../hooks/useAuth';

interface LoginFormProps {
  auth: UseAuthReturn;
}

interface FieldErrors {
  username?: string;
  password?: string;
}

function validate(username: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!username.trim()) errors.username = 'Username is required.';
  if (!password) errors.password = 'Password is required.';
  return errors;
}

export function LoginForm({ auth }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState({ username: false, password: false });

  const errors = validate(username, password);
  const isValid = Object.keys(errors).length === 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched({ username: true, password: true });
    const errs = validate(username, password);
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;
    await auth.login({ username: username.trim(), password });
  };

  const handleBlur = (field: keyof typeof touched) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setFieldErrors(validate(username, password));
  };

  return (
    <div className="login-page">
      <div className="card login-card" role="main">
        <header className="login-card__header">
          <div
            style={{
              width: 56,
              height: 56,
              margin: '0 auto 1rem',
              background: 'linear-gradient(135deg, var(--clr-primary), var(--clr-accent-dim))',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.6rem',
              boxShadow: 'var(--shadow-glow)',
            }}
            aria-hidden="true"
          >
            S²
          </div>
          <h1 style={{ fontSize: '1.6rem' }}>StateSpace</h1>
          <p className="login-card__subtitle">Sign in to access the algorithmic engine.</p>
        </header>

        {auth.error && (
          <div className="alert alert--error" role="alert" id="login-error-banner">
            <span aria-hidden="true">⚠</span>
            <span>{auth.error}</span>
          </div>
        )}

        <form className="stack" onSubmit={handleSubmit} noValidate aria-label="Login form">
          <div className="field">
            <label className="field__label" htmlFor="input-username">
              Username
            </label>
            <input
              id="input-username"
              className={`field__input${touched.username && fieldErrors.username ? ' field__input--error' : ''}`}
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onBlur={() => handleBlur('username')}
              disabled={auth.isLoading}
              placeholder="your_username"
              aria-describedby={
                touched.username && fieldErrors.username ? 'err-username' : undefined
              }
              aria-invalid={touched.username && !!fieldErrors.username}
            />
            {touched.username && fieldErrors.username && (
              <span className="field__error" id="err-username" role="alert">
                {fieldErrors.username}
              </span>
            )}
          </div>

          <div className="field">
            <label className="field__label" htmlFor="input-password">
              Password
            </label>
            <input
              id="input-password"
              className={`field__input${touched.password && fieldErrors.password ? ' field__input--error' : ''}`}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => handleBlur('password')}
              disabled={auth.isLoading}
              placeholder="••••••••"
              aria-describedby={
                touched.password && fieldErrors.password ? 'err-password' : undefined
              }
              aria-invalid={touched.password && !!fieldErrors.password}
            />
            {touched.password && fieldErrors.password && (
              <span className="field__error" id="err-password" role="alert">
                {fieldErrors.password}
              </span>
            )}
          </div>

          <button
            id="btn-login-submit"
            type="submit"
            className="btn btn--primary"
            disabled={auth.isLoading || (Object.keys(touched).some(Boolean) && !isValid)}
            style={{ marginTop: '0.5rem' }}
          >
            {auth.isLoading && <span className="spinner" aria-hidden="true" />}
            {auth.isLoading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p
          style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.75rem' }}
          className="field__hint"
        >
          Token stored in <code>sessionStorage</code> — cleared when you close this tab.
        </p>
      </div>
    </div>
  );
}
