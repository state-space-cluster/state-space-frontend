import { useState, type FormEvent } from 'react';
import type { UseAuthReturn } from '../../hooks/useAuth';

interface RegisterFormProps {
  auth: UseAuthReturn;
  onSwitchToLogin: () => void;
}

interface FieldErrors {
  username?: string;
  email?: string;
  password?: string;
  confirm?: string;
}

function validate(username: string, email: string, password: string, confirm: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!username.trim()) errors.username = 'Username is required.';
  else if (username.trim().length < 3) errors.username = 'Username must be at least 3 characters.';
  if (!email.trim()) errors.email = 'Email is required.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address.';
  if (!password) errors.password = 'Password is required.';
  else if (password.length < 8) errors.password = 'Password must be at least 8 characters.';
  if (!confirm) errors.confirm = 'Please confirm your password.';
  else if (confirm !== password) errors.confirm = 'Passwords do not match.';
  return errors;
}

export function RegisterForm({ auth, onSwitchToLogin }: RegisterFormProps) {
  const [username, setUsername] = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [touched, setTouched] = useState({
    username: false, email: false, password: false, confirm: false,
  });

  const errors = validate(username, email, password, confirm);
  const isValid = Object.keys(errors).length === 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched({ username: true, email: true, password: true, confirm: true });
    const errs = validate(username, email, password, confirm);
    if (Object.keys(errs).length > 0) return;
    await auth.register({ username: username.trim(), email: email.trim(), password });
  };

  const handleBlur = (field: keyof typeof touched) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const isLoading = auth.isRegistering;

  return (
    <div>
      {auth.error && (
        <div className="alert alert--error" role="alert" id="register-error-banner" style={{ marginBottom: '1rem' }}>
          <span aria-hidden="true">⚠</span>
          <span>{auth.error}</span>
        </div>
      )}

      <form className="stack" onSubmit={handleSubmit} noValidate aria-label="Registration form">
        {/* Username */}
        <div className="field">
          <label className="field__label" htmlFor="reg-username">Username</label>
          <input
            id="reg-username"
            className={`field__input${touched.username && errors.username ? ' field__input--error' : ''}`}
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onBlur={() => handleBlur('username')}
            disabled={isLoading}
            placeholder="your_username"
            aria-invalid={touched.username && !!errors.username}
            aria-describedby={touched.username && errors.username ? 'err-reg-username' : undefined}
          />
          {touched.username && errors.username && (
            <span className="field__error" id="err-reg-username" role="alert">{errors.username}</span>
          )}
        </div>

        {/* Email */}
        <div className="field">
          <label className="field__label" htmlFor="reg-email">Email</label>
          <input
            id="reg-email"
            className={`field__input${touched.email && errors.email ? ' field__input--error' : ''}`}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => handleBlur('email')}
            disabled={isLoading}
            placeholder="you@example.com"
            aria-invalid={touched.email && !!errors.email}
            aria-describedby={touched.email && errors.email ? 'err-reg-email' : undefined}
          />
          {touched.email && errors.email && (
            <span className="field__error" id="err-reg-email" role="alert">{errors.email}</span>
          )}
        </div>

        {/* Password */}
        <div className="field">
          <label className="field__label" htmlFor="reg-password">Password</label>
          <input
            id="reg-password"
            className={`field__input${touched.password && errors.password ? ' field__input--error' : ''}`}
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => handleBlur('password')}
            disabled={isLoading}
            placeholder="Min. 8 characters"
            aria-invalid={touched.password && !!errors.password}
            aria-describedby={touched.password && errors.password ? 'err-reg-password' : undefined}
          />
          {touched.password && errors.password && (
            <span className="field__error" id="err-reg-password" role="alert">{errors.password}</span>
          )}
        </div>

        {/* Confirm Password */}
        <div className="field">
          <label className="field__label" htmlFor="reg-confirm">Confirm Password</label>
          <input
            id="reg-confirm"
            className={`field__input${touched.confirm && errors.confirm ? ' field__input--error' : ''}`}
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            onBlur={() => handleBlur('confirm')}
            disabled={isLoading}
            placeholder="••••••••"
            aria-invalid={touched.confirm && !!errors.confirm}
            aria-describedby={touched.confirm && errors.confirm ? 'err-reg-confirm' : undefined}
          />
          {touched.confirm && errors.confirm && (
            <span className="field__error" id="err-reg-confirm" role="alert">{errors.confirm}</span>
          )}
        </div>

        <button
          id="btn-register-submit"
          type="submit"
          className="btn btn--primary"
          disabled={isLoading || (Object.values(touched).some(Boolean) && !isValid)}
          style={{ marginTop: '0.5rem' }}
        >
          {isLoading && <span className="spinner" aria-hidden="true" />}
          {isLoading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem' }}
         className="field__hint">
        Already have an account?{' '}
        <button
          id="btn-switch-to-login"
          type="button"
          onClick={onSwitchToLogin}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--clr-primary)', fontWeight: 600, fontSize: 'inherit',
            padding: 0,
          }}
        >
          Sign in
        </button>
      </p>
    </div>
  );
}
