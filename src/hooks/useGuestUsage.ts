// ─────────────────────────────────────────────────────────────────────────────
// useGuestUsage — tracks unauthenticated usage in localStorage
// Limits guests to MAX_GUEST_REQUESTS per tool type before prompting sign-up.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react';

export const MAX_GUEST_REQUESTS = 3;

const MATRIX_KEY = 'ss_guest_matrix_count';
const DFA_KEY    = 'ss_guest_dfa_count';

function readCount(key: string): number {
  const raw = localStorage.getItem(key);
  const n = parseInt(raw ?? '0', 10);
  return isNaN(n) ? 0 : n;
}

function writeCount(key: string, value: number): void {
  localStorage.setItem(key, String(value));
}

export interface UseGuestUsageReturn {
  matrixCount: number;
  dfaCount: number;
  /** Returns true if the limit is already reached (request should be blocked). */
  isMatrixLimitReached: boolean;
  isDfaLimitReached: boolean;
  /**
   * Increments the matrix counter.
   * Call AFTER a successful submission (not before the check).
   */
  incrementMatrix: () => void;
  incrementDfa: () => void;
  /** Clears both counters (call on successful auth login/register). */
  resetCounts: () => void;
}

export function useGuestUsage(): UseGuestUsageReturn {
  const [matrixCount, setMatrixCount] = useState<number>(() => readCount(MATRIX_KEY));
  const [dfaCount,    setDfaCount]    = useState<number>(() => readCount(DFA_KEY));

  const incrementMatrix = useCallback(() => {
    setMatrixCount((prev) => {
      const next = prev + 1;
      writeCount(MATRIX_KEY, next);
      return next;
    });
  }, []);

  const incrementDfa = useCallback(() => {
    setDfaCount((prev) => {
      const next = prev + 1;
      writeCount(DFA_KEY, next);
      return next;
    });
  }, []);

  const resetCounts = useCallback(() => {
    writeCount(MATRIX_KEY, 0);
    writeCount(DFA_KEY, 0);
    setMatrixCount(0);
    setDfaCount(0);
  }, []);

  return {
    matrixCount,
    dfaCount,
    isMatrixLimitReached: matrixCount >= MAX_GUEST_REQUESTS,
    isDfaLimitReached:    dfaCount >= MAX_GUEST_REQUESTS,
    incrementMatrix,
    incrementDfa,
    resetCounts,
  };
}
