import { useState, type FormEvent } from 'react';
import { submitDfa, ApiClientError } from '../../api/client';
import type { DFAResult } from '../../types';

interface DfaFormProps {
  onResult: (result: DFAResult) => void;
}

function validateRegex(regex: string): string | null {
  if (!regex.trim()) return 'Regex pattern is required.';
  if (regex.length > 255) return `Pattern too long (${regex.length}/255 chars).`;
  return null;
}

export function DfaForm({ onResult }: DfaFormProps) {
  const [regex, setRegex] = useState('');
  const [touched, setTouched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fieldError = touched ? validateRegex(regex) : null;
  const isValid = validateRegex(regex) === null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    const err = validateRegex(regex);
    if (err) return;

    setIsLoading(true);
    setError(null);
    try {
      const result = await submitDfa({ regex: regex.trim() });
      onResult(result);
    } catch (err) {
      const msg =
        err instanceof ApiClientError
          ? (err.body.detail ?? err.message)
          : 'Failed to submit regex.';
      setError(typeof msg === 'string' ? msg : String(msg));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="stack" onSubmit={handleSubmit} aria-label="DFA submission form" noValidate>
      <div className="field">
        <label className="field__label" htmlFor="dfa-regex-input">
          Regular Expression
        </label>
        <div className="row" style={{ gap: '0.5rem' }}>
          <input
            id="dfa-regex-input"
            className={`field__input${fieldError ? ' field__input--error' : ''}`}
            type="text"
            value={regex}
            onChange={(e) => { setRegex(e.target.value); setTouched(true); }}
            onBlur={() => setTouched(true)}
            disabled={isLoading}
            placeholder="(a|b)*c"
            maxLength={260}
            aria-invalid={!!fieldError}
            aria-describedby={fieldError ? 'err-regex' : 'hint-regex'}
          />
          <button
            id="btn-dfa-submit"
            type="submit"
            className="btn btn--primary"
            disabled={isLoading || !isValid}
            style={{ whiteSpace: 'nowrap' }}
          >
            {isLoading && <span className="spinner" aria-hidden="true" />}
            {isLoading ? 'Building…' : 'Build →'}
          </button>
        </div>
        {fieldError ? (
          <span className="field__error" id="err-regex" role="alert">{fieldError}</span>
        ) : (
          <span className="field__hint" id="hint-regex">
            Supported: <code>|</code> <code>*</code> <code>+</code> <code>?</code> <code>()</code> — concatenation is implicit. Max 255 chars.
          </span>
        )}
        <span className="field__hint" style={{ textAlign: 'right' }}>{regex.length}/255</span>
      </div>

      {error && (
        <div className="alert alert--error" role="alert" id="dfa-form-error">
          <span aria-hidden="true">⚠</span>
          <span>{error}</span>
        </div>
      )}
    </form>
  );
}
