import { useState, type FormEvent } from 'react';
import { lookupDfa, ApiClientError } from '../../api/client';
import type { DFAResult } from '../../types';

interface DfaLookupProps {
  onResult: (result: DFAResult) => void;
}

export function DfaLookup({ onResult }: DfaLookupProps) {
  const [hash, setHash] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hashError =
    hash.trim() && !/^[0-9a-f]{32}$/i.test(hash.trim())
      ? 'Hash must be a 32-character MD5 hex string.'
      : null;
  const isValid = hash.trim().length === 32 && !hashError;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await lookupDfa(hash.trim());
      onResult(result);
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 404) {
        setError('No DFA found for this hash. Submit the regex first.');
      } else {
        const msg =
          err instanceof ApiClientError
            ? (err.body.detail ?? err.message)
            : 'Lookup failed.';
        setError(typeof msg === 'string' ? msg : String(msg));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="stack--sm" onSubmit={handleSubmit} aria-label="DFA lookup by hash" noValidate>
      <div className="field">
        <label className="field__label" htmlFor="dfa-hash-input">
          Look up by Regex Hash
        </label>
        <div className="row" style={{ gap: '0.5rem' }}>
          <input
            id="dfa-hash-input"
            className={`field__input${hashError ? ' field__input--error' : ''}`}
            type="text"
            value={hash}
            onChange={(e) => { setHash(e.target.value); setError(null); }}
            disabled={isLoading}
            placeholder="56502077c86c3c65934947092ac786fb"
            maxLength={32}
            style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
            aria-invalid={!!hashError}
            aria-describedby={hashError ? 'err-hash' : 'hint-hash'}
          />
          <button
            id="btn-dfa-lookup"
            type="submit"
            className="btn btn--secondary"
            disabled={isLoading || !isValid}
            style={{ whiteSpace: 'nowrap' }}
          >
            {isLoading && <span className="spinner" aria-hidden="true" />}
            {isLoading ? 'Looking up…' : 'Lookup →'}
          </button>
        </div>
        {hashError ? (
          <span className="field__error" id="err-hash" role="alert">{hashError}</span>
        ) : (
          <span className="field__hint" id="hint-hash">
            MD5 hex digest returned in a POST response. Paste it here to retrieve the cached result.
          </span>
        )}
      </div>

      {error && (
        <div className="alert alert--error" role="alert" id="dfa-lookup-error">
          <span aria-hidden="true">⚠</span>
          <span>{error}</span>
        </div>
      )}
    </form>
  );
}
