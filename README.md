# StateSpace Frontend

> **A full-stack React + TypeScript client for the StateSpace algorithmic engine — submit matrix multiplication jobs, construct NFA/DFA automata from regular expressions, and visualise the results interactively.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646cff?logo=vite&logoColor=white)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 📖 Overview

StateSpace Frontend is the web client for the [StateSpace](https://github.com/OmbongiFelix/State-Space) backend — a Django REST Framework API that exposes two high-performance algorithmic engines:

| Engine | Algorithm | Mode |
|--------|-----------|------|
| **Matrix Multiplication** | Strassen's Algorithm — O(n²·⁸⁰⁷) | Async (Celery + Redis) |
| **NFA/DFA Construction** | Shunting Yard → Thompson's → Subset Construction | Synchronous |

The frontend covers **every endpoint** defined in [`api-schema.yaml`](./api-schema.yaml) (OpenAPI 3.0.3):

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/token/` | Obtain a DRF auth token |
| `POST` | `/api/matrix/` | Submit a matrix multiplication job (→ 202 + `job_id`) |
| `GET` | `/api/matrix/{job_id}/` | Poll job status (`PENDING` / `PROCESSING` / `COMPLETED` / `FAILED`) |
| `POST` | `/api/dfa/` | Submit a regex → get NFA + DFA graphs synchronously |
| `GET` | `/api/dfa/{regex_hash}/` | Look up a previously computed DFA result by MD5 hash |

---

## ✨ Features

### 🔐 Authentication
- Login form with client-side validation and inline field errors
- DRF Token auth — `Authorization: Token <key>` attached to every request
- Token stored in `sessionStorage` (cleared on tab close)
- Automatic 401 detection — surfaces a "session expired" banner and clears state

### ⬡ Matrix Multiplication
- **Dual input modes:** dynamic grid editor (up to 10×10) or raw JSON textarea
- Client-side dimension validation: rectangular arrays, all-numeric, cols(A) = rows(B)
- Real-time job polling — 1.5 s interval, 20 attempts, 60 s hard timeout
- Renders all four job states distinctly: `PENDING` · `PROCESSING` · `COMPLETED` · `FAILED`
- Result displayed as a formatted 2D table; errors shown inline

### ◎ NFA / DFA Automata
- Regex input with character counter (max 255), operator hint, and live validation
- `cached: true/false` badge on every response
- Copyable MD5 regex hash for later lookup
- Hash-based lookup form (validates 32-char MD5 hex before submitting)

### 🗺 Interactive Automaton Graphs (pure SVG, no external graph library)

**DFA Panel** (Subset Construction)
- Circular node layout with Bezier arc edges
- Bidirectional edges offset to opposite sides; self-loops rendered above the node
- Start state: entry arrow + blue border
- Accepting states: dashed double-ring
- **String simulation:** step-by-step or run-all; highlights current state; shows ✓ ACCEPTED / ✗ REJECTED banner

**NFA Panel** (Thompson's Construction)
- Fully independent parser — does not reuse DFA logic
- Epsilon (ε) transitions rendered as dashed purple edges with "ε" label
- Multiple parallel edges between the same pair fan out with arc offsets (Thompson's produces these)
- **String simulation:** tracks the full active *set* of states per step (ε-closure computed at each step), highlighting all simultaneously; final acceptance checks whether any active state is the accept state

---

## 🗂 Project Structure

```
state-space-frontend/
├── api-schema.yaml              # OpenAPI 3.0.3 spec (source of truth)
├── .env.example                 # Environment variable template
├── index.html
├── vite.config.ts
├── tsconfig.json
└── src/
    ├── main.tsx
    ├── App.tsx                  # Auth gate
    ├── vite-env.d.ts
    ├── types.ts                 # All schema interfaces — zero `any`
    ├── api/
    │   └── client.ts            # Typed fetch wrapper, one fn per endpoint
    ├── hooks/
    │   ├── useAuth.ts           # Token state + session-expired listener
    │   └── useMatrixPoll.ts     # Interval poller with cleanup
    ├── styles/
    │   └── index.css            # Dark glassmorphism design system
    └── components/
        ├── auth/
        │   └── LoginForm.tsx
        ├── layout/
        │   ├── Dashboard.tsx
        │   ├── Navbar.tsx
        │   └── TabPanel.tsx
        ├── matrix/
        │   ├── MatrixForm.tsx
        │   ├── MatrixResult.tsx
        │   └── MatrixSection.tsx
        └── dfa/
            ├── DfaForm.tsx
            ├── DfaLookup.tsx
            ├── DfaSection.tsx
            ├── AutomatonGraphView.tsx
            ├── DfaGraphPanel.tsx
            └── NfaGraphPanel.tsx
```

---

## ⚡ Quick Start

### Prerequisites

- Node.js 20+
- The StateSpace backend running (see [backend repo](https://github.com/OmbongiFelix/State-Space))

### 1. Install dependencies

```bash
npm install
```

### 2. Configure the API base URL

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
VITE_API_BASE_URL=http://localhost:8000
```

### 3. Run the dev server

```bash
npm run dev
# → http://localhost:5173/
```

### 4. Type-check only

```bash
npm run typecheck   # tsc --noEmit
```

### 5. Production build

```bash
npm run build
```

---

## 🔌 API Client

All API calls go through [`src/api/client.ts`](./src/api/client.ts). It provides:

```ts
login(credentials)        // POST /api/auth/token/
submitMatrix(input)       // POST /api/matrix/        → 202 + job_id
pollMatrix(jobId)         // GET  /api/matrix/{job_id}/
submitDfa(input)          // POST /api/dfa/
lookupDfa(regexHash)      // GET  /api/dfa/{regex_hash}/
```

- Base URL from `VITE_API_BASE_URL` env var (default: `http://localhost:8000`)
- Attaches `Authorization: Token <key>` to every authenticated request
- Non-2xx responses throw a typed `ApiClientError` with the parsed body
- 401 responses fire a `ss:session-expired` DOM event, clear the token, and show a banner

---

## 🏗 Architecture Notes

### NFA JSON shape (inferred)
The OpenAPI schema declares `nfa_json: { additionalProperties: {} }` — no fixed shape. Based on Thompson's Construction and the API example, the parser expects:

```json
{
  "start_id": 6,
  "end_id": 9,
  "states": {
    "6": { "transitions": { "ε": ["7", "8"] } },
    "7": { "transitions": { "a": ["9"] } }
  }
}
```

Epsilon keys tolerated: `"ε"`, `"eps"`, `""`, `"epsilon"`. If the live backend returns a different structure, `NfaGraphPanel` displays the parse error and the raw JSON so you can adapt `EPSILON_KEYS` or the parser.

### Matrix polling
`useMatrixPoll` runs a `setInterval` at 1 500 ms. It stops on `COMPLETED` or `FAILED`, after 20 attempts (~30 s), or after a 60 s hard timeout — whichever comes first. The interval is cleared in the `useEffect` cleanup to prevent memory leaks on unmount.

### Token storage
`sessionStorage` is used (not `localStorage`) so the token is discarded when the browser tab is closed. This is demo-grade — for production, implement PKCE + HttpOnly cookies.

---

## 🎨 Design System

The UI uses a hand-crafted dark glassmorphism theme in [`src/styles/index.css`](./src/styles/index.css):

- **Palette:** HSL-tuned dark blues, electric blue primary (`hsl(210,100%,60%)`), violet accent (`hsl(280,90%,65%)`)
- **Font:** [Inter](https://fonts.google.com/specimen/Inter) (UI) + [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) (code/matrix cells)
- **Effects:** backdrop-blur glass cards, gradient buttons with glow shadows, animated spinners and pulse dots

---

<!--## 📄 License 

MIT — see [LICENSE](LICENSE). -->