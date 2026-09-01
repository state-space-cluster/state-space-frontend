import { useState, useCallback, type ChangeEvent, type FormEvent } from 'react';
import { submitMatrix, ApiClientError } from '../../api/client';
import { useMatrixPoll } from '../../hooks/useMatrixPoll';
import { MatrixResult } from './MatrixResult';

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function parseMatrix(raw: string): { matrix: number[][] | null; error: string | null } {
  if (!raw.trim()) return { matrix: null, error: 'Matrix is required.' };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return { matrix: null, error: 'Must be a 2D array, e.g. [[1,2],[3,4]].' };
    const rows = parsed as unknown[];
    if (rows.length === 0) return { matrix: null, error: 'Matrix must have at least one row.' };
    const colCount = (rows[0] as unknown[]).length;
    for (const row of rows) {
      if (!Array.isArray(row)) return { matrix: null, error: 'Each row must be an array.' };
      if (row.length !== colCount) return { matrix: null, error: 'All rows must have the same number of columns.' };
      for (const cell of row as unknown[]) {
        if (typeof cell !== 'number' || isNaN(cell)) return { matrix: null, error: 'All cells must be numbers.' };
      }
    }
    return { matrix: parsed as number[][], error: null };
  } catch {
    return { matrix: null, error: 'Invalid JSON. Example: [[1,2],[3,4]]' };
  }
}

// ---------------------------------------------------------------------------
// Grid editor (dynamic rows × cols)
// ---------------------------------------------------------------------------

interface GridEditorProps {
  label: string;
  id: string;
  rows: number;
  cols: number;
  values: string[][];
  onCellChange: (r: number, c: number, val: string) => void;
  onDimsChange: (rows: number, cols: number) => void;
  cellErrors: boolean[][];
}

function GridEditor({ label, id, rows, cols, values, onCellChange, onDimsChange, cellErrors }: GridEditorProps) {
  return (
    <div className="stack--sm">
      <div className="row" style={{ alignItems: 'center', gap: '0.5rem' }}>
        <label className="field__label">{label}</label>
        <input
          id={`${id}-rows`}
          type="number" min={1} max={10} value={rows}
          onChange={(e) => onDimsChange(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)), cols)}
          className="field__input" style={{ width: 56 }} aria-label={`${label} rows`}
        />
        <span style={{ color: 'var(--clr-text-muted)', fontSize: '0.8rem' }}>×</span>
        <input
          id={`${id}-cols`}
          type="number" min={1} max={10} value={cols}
          onChange={(e) => onDimsChange(rows, Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
          className="field__input" style={{ width: 56 }} aria-label={`${label} cols`}
        />
      </div>
      <div
        className="matrix-grid"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        role="grid"
        aria-label={`${label} grid`}
      >
        {Array.from({ length: rows }).map((_, r) =>
          Array.from({ length: cols }).map((_, c) => (
            <input
              key={`${r}-${c}`}
              type="text"
              inputMode="numeric"
              value={values[r]?.[c] ?? '0'}
              onChange={(e) => onCellChange(r, c, e.target.value)}
              className={`matrix-cell${cellErrors[r]?.[c] ? ' matrix-cell--error' : ''}`}
              aria-label={`${label} row ${r + 1} col ${c + 1}`}
              role="gridcell"
            />
          ))
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Build grid state helpers
// ---------------------------------------------------------------------------

function makeGrid(rows: number, cols: number, prev?: string[][]): string[][] {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => prev?.[r]?.[c] ?? '0'),
  );
}

function gridToMatrix(grid: string[][]): { matrix: number[][] | null; errors: boolean[][] } {
  const errors: boolean[][] = grid.map((row) => row.map(() => false));
  const matrix: number[][] = [];
  let hasError = false;
  for (let r = 0; r < grid.length; r++) {
    const row: number[] = [];
    for (let c = 0; c < grid[r].length; c++) {
      const val = parseFloat(grid[r][c]);
      if (isNaN(val)) {
        errors[r][c] = true;
        hasError = true;
        row.push(0);
      } else {
        row.push(val);
      }
    }
    matrix.push(row);
  }
  return { matrix: hasError ? null : matrix, errors };
}

// ---------------------------------------------------------------------------
// MatrixForm
// ---------------------------------------------------------------------------

type InputMode = 'grid' | 'json';

interface FormState {
  aRows: number; aCols: number; aGrid: string[][];
  bRows: number; bCols: number; bGrid: string[][];
  aJson: string; bJson: string;
  aCellErrors: boolean[][]; bCellErrors: boolean[][];
}

const INITIAL: FormState = {
  aRows: 2, aCols: 2, aGrid: makeGrid(2, 2),
  bRows: 2, bCols: 2, bGrid: makeGrid(2, 2),
  aJson: '[[1,2],[3,4]]', bJson: '[[5,6],[7,8]]',
  aCellErrors: [[false, false], [false, false]],
  bCellErrors: [[false, false], [false, false]],
};

export function MatrixForm() {
  const [mode, setMode] = useState<InputMode>('grid');
  const [fs, setFs] = useState<FormState>(INITIAL);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aJsonError, setAJsonError] = useState<string | null>(null);
  const [bJsonError, setBJsonError] = useState<string | null>(null);

  const { pollState, jobStatus, attempts, apiError, startPolling, reset } = useMatrixPoll();

  // ---- Grid helpers ----
  const setADims = useCallback((r: number, c: number) => {
    setFs((prev) => ({
      ...prev,
      aRows: r, aCols: c,
      aGrid: makeGrid(r, c, prev.aGrid),
      aCellErrors: Array.from({ length: r }, () => Array(c).fill(false)),
    }));
  }, []);

  const setBDims = useCallback((r: number, c: number) => {
    setFs((prev) => ({
      ...prev,
      bRows: r, bCols: c,
      bGrid: makeGrid(r, c, prev.bGrid),
      bCellErrors: Array.from({ length: r }, () => Array(c).fill(false)),
    }));
  }, []);

  const setACell = useCallback((r: number, c: number, val: string) => {
    setFs((prev) => {
      const grid = prev.aGrid.map((row) => [...row]);
      grid[r][c] = val;
      return { ...prev, aGrid: grid };
    });
  }, []);

  const setBCell = useCallback((r: number, c: number, val: string) => {
    setFs((prev) => {
      const grid = prev.bGrid.map((row) => [...row]);
      grid[r][c] = val;
      return { ...prev, bGrid: grid };
    });
  }, []);

  // ---- Submit ----
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    reset();

    let matrixA: number[][] | null = null;
    let matrixB: number[][] | null = null;

    if (mode === 'grid') {
      const { matrix: ma, errors: ae } = gridToMatrix(fs.aGrid);
      const { matrix: mb, errors: be } = gridToMatrix(fs.bGrid);
      setFs((prev) => ({ ...prev, aCellErrors: ae, bCellErrors: be }));
      if (!ma || !mb) { setSubmitError('All matrix cells must be valid numbers.'); return; }
      matrixA = ma; matrixB = mb;
    } else {
      const ra = parseMatrix(fs.aJson);
      const rb = parseMatrix(fs.bJson);
      setAJsonError(ra.error); setBJsonError(rb.error);
      if (!ra.matrix || !rb.matrix) return;
      matrixA = ra.matrix; matrixB = rb.matrix;
    }

    // Dimension check: cols(A) === rows(B)
    if (matrixA[0].length !== matrixB.length) {
      setSubmitError(
        `Dimension mismatch: A is ${matrixA.length}×${matrixA[0].length} but B is ${matrixB.length}×${matrixB[0].length}. cols(A) must equal rows(B).`,
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const accepted = await submitMatrix({ matrix_a: matrixA, matrix_b: matrixB });
      startPolling(accepted.job_id);
    } catch (err) {
      const msg = err instanceof ApiClientError
        ? (err.body.detail ?? err.message)
        : 'Failed to submit job.';
      setSubmitError(typeof msg === 'string' ? msg : String(msg));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAJson = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setFs((p) => ({ ...p, aJson: e.target.value }));
    setAJsonError(null);
  };
  const handleBJson = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setFs((p) => ({ ...p, bJson: e.target.value }));
    setBJsonError(null);
  };

  const isPolling = pollState === 'polling';
  const canSubmit = !isSubmitting && !isPolling;

  return (
    <div className="stack">
      <div className="section-header">
        <div className="section-icon section-icon--blue" aria-hidden="true">⬡</div>
        <div>
          <h2>Matrix Multiplication</h2>
          <p style={{ fontSize: '0.82rem', marginTop: '0.1rem' }}>
            Strassen's Algorithm — O(n<sup>2.807</sup>) — async Celery job
          </p>
        </div>
        <span className="badge badge--primary" style={{ marginLeft: 'auto' }}>
          Algorithm: Strassen
        </span>
      </div>

      <div className="card">
        <div className="row" style={{ marginBottom: '1.25rem' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--clr-text-muted)', fontWeight: 600 }}>
            Input mode:
          </span>
          <button
            id="matrix-mode-grid"
            className={`btn btn--sm ${mode === 'grid' ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => setMode('grid')}
            type="button"
          >
            Grid Editor
          </button>
          <button
            id="matrix-mode-json"
            className={`btn btn--sm ${mode === 'json' ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => setMode('json')}
            type="button"
          >
            JSON
          </button>
        </div>

        <form onSubmit={handleSubmit} aria-label="Matrix multiplication form">
          <div className="row" style={{ alignItems: 'flex-start', gap: '2rem', flexWrap: 'wrap' }}>
            {mode === 'grid' ? (
              <>
                <GridEditor
                  id="matrix-a" label="Matrix A"
                  rows={fs.aRows} cols={fs.aCols} values={fs.aGrid}
                  onCellChange={setACell} onDimsChange={setADims}
                  cellErrors={fs.aCellErrors}
                />
                <div style={{ display: 'flex', alignItems: 'center', fontSize: '1.5rem', color: 'var(--clr-primary)', paddingTop: '2rem' }}>×</div>
                <GridEditor
                  id="matrix-b" label="Matrix B"
                  rows={fs.bRows} cols={fs.bCols} values={fs.bGrid}
                  onCellChange={setBCell} onDimsChange={setBDims}
                  cellErrors={fs.bCellErrors}
                />
              </>
            ) : (
              <>
                <div className="field" style={{ flex: 1, minWidth: 220 }}>
                  <label className="field__label" htmlFor="matrix-a-json">Matrix A (JSON)</label>
                  <textarea
                    id="matrix-a-json"
                    className={`field__textarea${aJsonError ? ' field__textarea--error' : ''}`}
                    value={fs.aJson}
                    onChange={handleAJson}
                    rows={5}
                    placeholder="[[1,2],[3,4]]"
                    aria-invalid={!!aJsonError}
                    aria-describedby={aJsonError ? 'err-a-json' : undefined}
                  />
                  {aJsonError && <span className="field__error" id="err-a-json" role="alert">{aJsonError}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', fontSize: '1.5rem', color: 'var(--clr-primary)', paddingTop: '1.8rem' }}>×</div>
                <div className="field" style={{ flex: 1, minWidth: 220 }}>
                  <label className="field__label" htmlFor="matrix-b-json">Matrix B (JSON)</label>
                  <textarea
                    id="matrix-b-json"
                    className={`field__textarea${bJsonError ? ' field__textarea--error' : ''}`}
                    value={fs.bJson}
                    onChange={handleBJson}
                    rows={5}
                    placeholder="[[5,6],[7,8]]"
                    aria-invalid={!!bJsonError}
                    aria-describedby={bJsonError ? 'err-b-json' : undefined}
                  />
                  {bJsonError && <span className="field__error" id="err-b-json" role="alert">{bJsonError}</span>}
                </div>
              </>
            )}
          </div>

          {submitError && (
            <div className="alert alert--error" role="alert" id="matrix-submit-error" style={{ marginTop: '1rem' }}>
              <span aria-hidden="true">⚠</span>
              <span>{submitError}</span>
            </div>
          )}

          <div className="row" style={{ marginTop: '1.25rem' }}>
            <button
              id="btn-matrix-submit"
              type="submit"
              className="btn btn--primary"
              disabled={!canSubmit}
            >
              {isSubmitting && <span className="spinner" aria-hidden="true" />}
              {isSubmitting ? 'Submitting…' : 'Multiply →'}
            </button>
            {(pollState !== 'idle') && (
              <button
                id="btn-matrix-reset"
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={reset}
              >
                Reset
              </button>
            )}
            <span className="field__hint" style={{ marginLeft: 'auto' }}>
              Max 10 × 10 matrices
            </span>
          </div>
        </form>
      </div>

      {pollState !== 'idle' && (
        <div className="card card--sm">
          <MatrixResult
            jobStatus={jobStatus}
            attempts={attempts}
            pollState={pollState}
            apiError={apiError}
          />
        </div>
      )}
    </div>
  );
}
