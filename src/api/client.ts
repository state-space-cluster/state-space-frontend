// ─────────────────────────────────────────────────────────────────────────────
// StateSpace API Client
// One typed function per endpoint. Base URL from VITE_API_BASE_URL.
// Token stored in sessionStorage (demo-grade; not production-secure).
// ─────────────────────────────────────────────────────────────────────────────

import type {
  ApiError,
  AuthToken,
  AuthTokenRequest,
  RegisterRequest,
  DFAInputRequest,
  DFAResult,
  MatrixInputRequest,
  MatrixJobAccepted,
  MatrixJobStatus,
} from '../types';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

const TOKEN_KEY = 'ss_auth_token';

// ---------------------------------------------------------------------------
// Token utilities
// ---------------------------------------------------------------------------

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

// ---------------------------------------------------------------------------
// Session-expired event — components can listen to this
// ---------------------------------------------------------------------------

export const SESSION_EXPIRED_EVENT = 'ss:session-expired';

function dispatchSessionExpired(): void {
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}

// ---------------------------------------------------------------------------
// Generic fetch wrapper
// ---------------------------------------------------------------------------

class ApiClientError extends Error {
  public readonly body: ApiError;
  public readonly status: number;

  constructor(status: number, body: ApiError) {
    super(body.detail ?? `API error ${status}`);
    this.status = status;
    this.body = body;
  }
}

export { ApiClientError };

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface FetchOptions {
  method?: HttpMethod;
  body?: unknown;
  /** Skip attaching the auth token (used for /api/auth/token/) */
  skipAuth?: boolean;
}

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { method = 'GET', body, skipAuth = false } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (!skipAuth) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Token ${token}`;
    }
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401) {
    clearToken();
    dispatchSessionExpired();
    const errBody = await safeJson<ApiError>(response);
    throw new ApiClientError(401, errBody ?? { detail: 'Unauthorized — please log in again.' });
  }

  if (!response.ok) {
    const errBody = await safeJson<ApiError>(response);
    throw new ApiClientError(response.status, errBody ?? { detail: `HTTP ${response.status}` });
  }

  // 204 No Content
  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return response.json() as Promise<T>;
}

async function safeJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Endpoint functions
// ---------------------------------------------------------------------------

/**
 * POST /api/auth/token/
 * Obtain a DRF token from username + password.
 * Does NOT attach an Authorization header.
 */
export async function login(credentials: AuthTokenRequest): Promise<AuthToken> {
  return apiFetch<AuthToken>('/api/auth/token/', {
    method: 'POST',
    body: credentials,
    skipAuth: true,
  });
}

/**
 * POST /api/auth/register/
 * Create a new account. Returns a token on success (auto-login).
 * Does NOT attach an Authorization header.
 */
export async function register(data: RegisterRequest): Promise<AuthToken> {
  return apiFetch<AuthToken>('/api/auth/register/', {
    method: 'POST',
    body: data,
    skipAuth: true,
  });
}

/**
 * POST /api/matrix/
 * Submit two matrices; returns 202 with a job_id for polling.
 */
export async function submitMatrix(input: MatrixInputRequest): Promise<MatrixJobAccepted> {
  return apiFetch<MatrixJobAccepted>('/api/matrix/', {
    method: 'POST',
    body: input,
  });
}

/**
 * GET /api/matrix/{job_id}/
 * Poll for job status. Returns PENDING / PROCESSING / COMPLETED / FAILED.
 */
export async function pollMatrix(jobId: string): Promise<MatrixJobStatus> {
  return apiFetch<MatrixJobStatus>(`/api/matrix/${jobId}/`);
}

/**
 * POST /api/dfa/
 * Submit a regex for synchronous NFA + DFA construction.
 * Returns 201 (new) or 200 (cached).
 */
export async function submitDfa(input: DFAInputRequest): Promise<DFAResult> {
  return apiFetch<DFAResult>('/api/dfa/', {
    method: 'POST',
    body: input,
  });
}

/**
 * GET /api/dfa/{regex_hash}/
 * Look up a previously computed DFA result by MD5 hash.
 */
export async function lookupDfa(regexHash: string): Promise<DFAResult> {
  return apiFetch<DFAResult>(`/api/dfa/${encodeURIComponent(regexHash)}/`);
}

/**
 * GET /api/dfa/  (no hash — mirrors GET /api/dfa/{regex_hash}/)
 * Included for completeness; pass the hash as a query param if the backend
 * supports it, otherwise use lookupDfa() with path param.
 */
export async function lookupDfaNoHash(): Promise<DFAResult> {
  return apiFetch<DFAResult>('/api/dfa/');
}
