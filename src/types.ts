// ─────────────────────────────────────────────────────────────────────────────
// StateSpace API — strict TypeScript interfaces
// Source of truth: api-schema.yaml (OpenAPI 3.0.3)
// ─────────────────────────────────────────────────────────────────────────────

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/** POST /api/auth/token/ — request body */
export interface AuthTokenRequest {
  username: string;
  password: string;
}

/** POST /api/auth/register/ — request body */
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

/** POST /api/auth/token/ — 200 response */
export interface AuthToken {
  token: string;
}

// ---------------------------------------------------------------------------
// DFA / NFA
// ---------------------------------------------------------------------------

/** POST /api/dfa/ — request body */
export interface DFAInputRequest {
  /** Infix regex, 1–255 chars. Supported: | * + ? () */
  regex: string;
}

/** A single DFA state as returned by Subset Construction */
export interface DFAState {
  id: number;
  is_end: boolean;
  /** char → target state id */
  transitions: Record<string, number>;
}

/** The DFA graph as returned by the API */
export interface DFAGraph {
  start_id: number;
  states: DFAState[];
}

/**
 * A single NFA state as produced by Thompson's Construction.
 * The schema declares `additionalProperties: {}` so this is the inferred shape.
 * - transitions keys: single char OR "ε" (epsilon) OR "eps" OR ""
 * - transitions values: array of target state IDs (as strings)
 */
export interface NFAState {
  transitions: Record<string, string[]>;
}

/**
 * The NFA graph.
 * `states` is a dict keyed by state ID (as string).
 */
export interface NFAGraph {
  start_id: number | string;
  end_id: number | string;
  states: Record<string, NFAState>;
}

/** POST /api/dfa/ and GET /api/dfa/{regex_hash}/ — response */
export interface DFAResult {
  regex_hash: string;
  regex_pattern: string;
  /** Raw NFA JSON — parsed at runtime; shape is inferred (see NFAGraph) */
  nfa_json: Record<string, unknown>;
  /** Raw DFA JSON — parsed at runtime; shape is DFAGraph */
  dfa_json: Record<string, unknown>;
  cached?: boolean;
}

// ---------------------------------------------------------------------------
// Matrix
// ---------------------------------------------------------------------------

/** POST /api/matrix/ — request body */
export interface MatrixInputRequest {
  /** First matrix — 2D array of numbers */
  matrix_a: number[][];
  /** Second matrix — 2D array of numbers */
  matrix_b: number[][];
}

/** POST /api/matrix/ — 202 response */
export interface MatrixJobAccepted {
  job_id: string;
  status: string;
  message: string;
}

/** Lifecycle states for a matrix job */
export type StatusEnum = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

/** GET /api/matrix/{job_id}/ — 200 response */
export interface MatrixJobStatus {
  job_id: string;
  status: StatusEnum;
  /** 2D result matrix, null until COMPLETED */
  result: number[][] | null;
  /** Present only when status === 'FAILED' */
  error?: string;
}

// ---------------------------------------------------------------------------
// Error shape
// ---------------------------------------------------------------------------

/**
 * Generic error body for 400/401/404 responses.
 * The schema does not define error bodies explicitly.
 */
export interface ApiError {
  detail?: string;
  [field: string]: unknown;
}
