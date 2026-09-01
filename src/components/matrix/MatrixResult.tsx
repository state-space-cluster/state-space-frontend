import type { MatrixJobStatus } from '../../types';

interface MatrixResultProps {
  jobStatus: MatrixJobStatus | null;
  attempts: number;
  pollState: string;
  apiError: string | null;
}

export function MatrixResult({ jobStatus, attempts, pollState, apiError }: MatrixResultProps) {
  if (pollState === 'idle') return null;

  if (pollState === 'error') {
    return (
      <div className="alert alert--error" role="alert" id="matrix-poll-error">
        <span aria-hidden="true">⚠</span>
        <span>{apiError ?? 'An unexpected error occurred while polling.'}</span>
      </div>
    );
  }

  if (pollState === 'timeout') {
    return (
      <div className="alert alert--warning" role="alert">
        <span aria-hidden="true">⏱</span>
        <span>
          Job timed out after {attempts} poll attempt{attempts !== 1 ? 's' : ''}. The job may still
          be running — check back later with the job ID.
        </span>
      </div>
    );
  }

  if (pollState === 'polling' && !jobStatus) {
    return (
      <div className="empty-state">
        <span className="spinner spinner--lg" aria-label="Loading" />
        <p>Waiting for job to start…</p>
      </div>
    );
  }

  if (!jobStatus) return null;

  const status = jobStatus.status;

  return (
    <div className="stack">
      <div className="row">
        <span
          className={`status-chip status-chip--${status}`}
          aria-live="polite"
          aria-label={`Job status: ${status}`}
        >
          {(status === 'PENDING' || status === 'PROCESSING') && (
            <span className="pulse-dot" aria-hidden="true" />
          )}
          {status}
        </span>
        <span className="field__hint">
          Job ID:{' '}
          <code style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)' }}>
            {jobStatus.job_id}
          </code>
        </span>
        {pollState === 'polling' && (
          <span className="field__hint">Attempt {attempts} of 20</span>
        )}
      </div>

      {status === 'FAILED' && (
        <div className="alert alert--error" role="alert" id="matrix-job-failed">
          <span aria-hidden="true">✕</span>
          <div>
            <strong>Job failed</strong>
            {jobStatus.error && <p style={{ marginTop: '0.25rem' }}>{jobStatus.error}</p>}
          </div>
        </div>
      )}

      {status === 'COMPLETED' && jobStatus.result && (
        <div className="stack--sm">
          <div className="alert alert--success" role="status">
            <span aria-hidden="true">✓</span>
            <span>
              Matrix multiplication complete in {attempts} poll
              {attempts !== 1 ? 's' : ''}.
            </span>
          </div>
          <h4 style={{ color: 'var(--clr-text-muted)' }}>Result Matrix A × B</h4>
          <div className="matrix-table-wrap" aria-label="Result matrix">
            <table className="matrix-table">
              <caption className="sr-only">Product matrix result</caption>
              <tbody>
                {jobStatus.result.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci}>{Number.isInteger(cell) ? cell : cell.toFixed(4)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(status === 'PENDING' || status === 'PROCESSING') && pollState === 'polling' && (
        <div className="alert alert--info" role="status" aria-live="polite">
          <span className="spinner" aria-hidden="true" />
          <span>
            {status === 'PENDING' ? 'Job is queued, waiting for a worker…' : 'Worker is computing…'}
          </span>
        </div>
      )}
    </div>
  );
}
