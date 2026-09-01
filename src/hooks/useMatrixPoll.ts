import { useState, useEffect, useRef, useCallback } from 'react';
import { pollMatrix, ApiClientError } from '../api/client';
import type { MatrixJobStatus, StatusEnum } from '../types';

const POLL_INTERVAL_MS = 1500;
const MAX_ATTEMPTS = 20; // ~30 s at 1.5 s
const MAX_TIMEOUT_MS = 60_000; // hard 60 s cap

export type PollState = 'idle' | 'polling' | 'done' | 'error' | 'timeout';

export interface UseMatrixPollReturn {
  pollState: PollState;
  jobStatus: MatrixJobStatus | null;
  attempts: number;
  apiError: string | null;
  startPolling: (jobId: string) => void;
  reset: () => void;
}

export function useMatrixPoll(): UseMatrixPollReturn {
  const [pollState, setPollState] = useState<PollState>('idle');
  const [jobStatus, setJobStatus] = useState<MatrixJobStatus | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [apiError, setApiError] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const jobIdRef = useRef<string | null>(null);
  const attemptsRef = useRef(0);

  const stopPolling = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const startPolling = useCallback(
    (jobId: string) => {
      stopPolling();
      jobIdRef.current = jobId;
      attemptsRef.current = 0;
      setAttempts(0);
      setApiError(null);
      setJobStatus(null);
      setPollState('polling');

      const tick = async () => {
        if (!jobIdRef.current) return;
        attemptsRef.current += 1;
        setAttempts(attemptsRef.current);

        try {
          const status = await pollMatrix(jobIdRef.current);
          setJobStatus(status);

          const terminal: StatusEnum[] = ['COMPLETED', 'FAILED'];
          if (terminal.includes(status.status)) {
            stopPolling();
            setPollState('done');
            return;
          }

          if (attemptsRef.current >= MAX_ATTEMPTS) {
            stopPolling();
            setPollState('timeout');
          }
        } catch (err) {
          stopPolling();
          const msg =
            err instanceof ApiClientError
              ? (err.body.detail ?? err.message)
              : 'Polling failed unexpectedly.';
          setApiError(typeof msg === 'string' ? msg : String(msg));
          setPollState('error');
        }
      };

      // First tick immediately
      void tick();
      intervalRef.current = setInterval(tick, POLL_INTERVAL_MS);

      // Hard timeout
      timeoutRef.current = setTimeout(() => {
        stopPolling();
        setPollState('timeout');
      }, MAX_TIMEOUT_MS);
    },
    [stopPolling],
  );

  const reset = useCallback(() => {
    stopPolling();
    jobIdRef.current = null;
    attemptsRef.current = 0;
    setPollState('idle');
    setJobStatus(null);
    setAttempts(0);
    setApiError(null);
  }, [stopPolling]);

  return { pollState, jobStatus, attempts, apiError, startPolling, reset };
}
