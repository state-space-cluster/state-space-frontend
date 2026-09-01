# StateSpace Frontend

> **React client for the StateSpace distributed compute engine — submit and track matrix multiplication and regex compilation jobs against the DRF API.**

---

## 📖 Project Overview

This is the web client for **[StateSpace](https://github.com/OmbongiFelix/State-Space)**, a Django REST Framework backend that offloads computationally expensive jobs — matrix multiplication (Strassen's Algorithm) and regex compilation (NFA/DFA construction) — to a Celery worker pool.

The frontend contains **no business logic of its own**. It exists purely to:

1. Give users a form-based way to submit jobs without hand-crafting HTTP requests.
2. Poll the status endpoint and reflect job state (`PENDING` → `COMPLETED`) in real time.
3. Render results (matrix output, DFA transition table) in a readable format.

All computation, validation, and orchestration lives in the backend — this repo is a thin client over that API.

---

## 🛠 Tech Stack

*(Adjust below to match your actual choices once scaffolded — these are sensible defaults for this kind of polling-driven client.)*

* **Framework:** React (Vite)
* **HTTP Client:** Axios
* **Server State / Polling:** TanStack Query (React Query) — well suited to the job-submit-then-poll pattern
* **Styling:** Tailwind CSS
* **Language:** TypeScript

---

## 📐 How It Talks to the Backend

1. User fills out a job form (matrix pair, or a regex pattern) and submits.
2. Frontend `POST`s to the relevant `/api/compute/...` endpoint and receives a `job_id`.
3. Frontend polls `GET /api/status/<job_id>/` on an interval until `status` is `COMPLETED`.
4. Result is rendered; polling stops.

This mirrors the backend's own description of its ingestion → dispatch → processing → completion flow — the frontend is just the visible half of that loop.

---

## 🔌 API Endpoints Consumed

### Matrix Multiplication — ✅ confirmed from backend README

**Submit:** `POST /api/compute/matrix/`
```json
{
  "matrix_a": [[1, 2], [3, 4]],
  "matrix_b": [[5, 6], [7, 8]],
  "algorithm": "strassen"
}
```

**Poll:** `GET /api/status/<job_id>/`
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "COMPLETED",
  "result": [[19, 22], [43, 50]],
  "execution_time": 0.045
}
```

### Regex / DFA Compilation — ⚠️ TODO, not yet documented on the backend

The backend implements a full NFA→DFA pipeline (Shunting Yard → Thompson's Construction → Subset Construction) but its README doesn't expose the submission endpoint, request shape, or response shape for it.

**Needed before this section can be written accurately:**
- [ ] Endpoint path (likely `POST /api/compute/regex/` or `/api/compute/dfa/` — unconfirmed)
- [ ] Request payload shape (presumably `{ "pattern": "(a|b)*c" }`, unconfirmed)
- [ ] Response shape on completion (DFA states/transitions format, unconfirmed)

*Update this section from `dfa/api/urls.py`, `dfa/api/serializer.py`, and `dfa/api/views.py` once available.*

---

## ⚡ Installation & Setup

### Prerequisites

* Node.js 20+
* The StateSpace backend running locally (see [backend README](https://github.com/OmbongiFelix/State-Space))

### Local Development

1. **Clone the repository**
```bash
git clone https://github.com/state-space-cluster/state-space-frontend.git
cd state-space-frontend
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**

Create a `.env` file in the root:
```env
VITE_API_BASE_URL=http://localhost:8000
```

4. **Run the dev server**
```bash
npm run dev
```

---

## 🔮 Coming Next

* [ ] Wire up the regex/DFA submission form once the backend endpoint is documented
* [ ] Replace polling with WebSocket updates once the backend adds Django Channels support
* [ ] Visualize DFA state transitions graphically rather than as a raw table

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.