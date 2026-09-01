import { useState, useMemo, useCallback } from 'react';
import type { DFAGraph, DFAState } from '../../types';

// ─────────────────────────────────────────────────────────────────────────────
// DFA JSON parser — strict, no 'any'
// ─────────────────────────────────────────────────────────────────────────────

function parseDfaGraph(raw: Record<string, unknown>): DFAGraph | null {
  if (typeof raw.start_id !== 'number') return null;
  if (!Array.isArray(raw.states)) return null;
  const states: DFAState[] = [];
  for (const s of raw.states as unknown[]) {
    if (typeof s !== 'object' || s === null) return null;
    const st = s as Record<string, unknown>;
    if (typeof st.id !== 'number') return null;
    if (typeof st.is_end !== 'boolean') return null;
    if (typeof st.transitions !== 'object' || st.transitions === null) return null;
    const trans = st.transitions as Record<string, unknown>;
    const transitions: Record<string, number> = {};
    for (const [char, target] of Object.entries(trans)) {
      if (typeof target !== 'number') return null;
      transitions[char] = target;
    }
    states.push({ id: st.id, is_end: st.is_end, transitions });
  }
  return { start_id: raw.start_id, states };
}

// ─────────────────────────────────────────────────────────────────────────────
// Layout helpers — circular
// ─────────────────────────────────────────────────────────────────────────────

const CX = 300;
const CY = 220;
const R_LAYOUT = 150;
const NODE_R = 22;
const ACCEPT_R = 27;

interface NodePos {
  id: number;
  x: number;
  y: number;
  is_end: boolean;
}

function layoutNodes(states: DFAState[]): Map<number, NodePos> {
  const map = new Map<number, NodePos>();
  const n = states.length;
  states.forEach((s, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    const x = n === 1 ? CX : CX + R_LAYOUT * Math.cos(angle);
    const y = n === 1 ? CY : CY + R_LAYOUT * Math.sin(angle);
    map.set(s.id, { id: s.id, x, y, is_end: s.is_end });
  });
  return map;
}

// ─────────────────────────────────────────────────────────────────────────────
// Edge drawing helpers
// ─────────────────────────────────────────────────────────────────────────────

function bezierPoint(
  x1: number, y1: number, cx: number, cy: number, x2: number, y2: number, t = 0.5,
) {
  const x = (1 - t) ** 2 * x1 + 2 * (1 - t) * t * cx + t ** 2 * x2;
  const y = (1 - t) ** 2 * y1 + 2 * (1 - t) * t * cy + t ** 2 * y2;
  return { x, y };
}

interface EdgeInfo {
  from: number;
  to: number;
  labels: string[];
}

function buildEdges(states: DFAState[]): EdgeInfo[] {
  const map = new Map<string, EdgeInfo>();
  for (const s of states) {
    for (const [ch, target] of Object.entries(s.transitions)) {
      const key = `${s.id}→${target}`;
      const existing = map.get(key);
      if (existing) {
        existing.labels.push(ch);
      } else {
        map.set(key, { from: s.id, to: target, labels: [ch] });
      }
    }
  }
  return Array.from(map.values());
}

// ─────────────────────────────────────────────────────────────────────────────
// ε-closure (DFA has none, but reuse pattern)
// DFA simulation — single active state per step
// ─────────────────────────────────────────────────────────────────────────────

interface SimState {
  step: number;          // character index just consumed (-1 = start)
  current: number | null;
  accepted: boolean | null; // null = not finished
  rejected: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG Edge component
// ─────────────────────────────────────────────────────────────────────────────

interface EdgeProps {
  edge: EdgeInfo;
  positions: Map<number, NodePos>;
  isActive: boolean;
  hasBidirectional: boolean; // whether the reverse edge also exists
  edgeIndex: number;         // used to distinguish parallel edges
  totalParallel: number;
}

function SvgEdge({ edge, positions, isActive, hasBidirectional, edgeIndex, totalParallel }: EdgeProps) {
  const from = positions.get(edge.from);
  const to = positions.get(edge.to);
  if (!from || !to) return null;

  const isSelfLoop = edge.from === edge.to;
  const label = edge.labels.join(',');

  const edgeColor = isActive ? 'hsl(40,90%,55%)' : 'hsl(215,20%,45%)';
  const labelColor = isActive ? 'hsl(40,90%,70%)' : 'hsl(215,20%,65%)';

  if (isSelfLoop) {
    const lx = from.x;
    const ly = from.y - NODE_R - 30;
    return (
      <g>
        <path
          d={`M ${from.x - 10} ${from.y - NODE_R} C ${from.x - 40} ${from.y - 80} ${from.x + 40} ${from.y - 80} ${from.x + 10} ${from.y - NODE_R}`}
          fill="none" stroke={edgeColor} strokeWidth={isActive ? 2.5 : 1.5}
          markerEnd="url(#dfa-arrow)"
        />
        <text x={lx} y={ly} textAnchor="middle" fill={labelColor} fontSize={11} fontFamily="var(--font-mono)">
          {label}
        </text>
      </g>
    );
  }

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return null;

  // Offset for bidirectional / parallel edges
  const curveOffset = hasBidirectional ? 35 : (totalParallel > 1 ? (edgeIndex - (totalParallel - 1) / 2) * 20 : 0);
  const perpX = -dy / len;
  const perpY = dx / len;
  const cx = (from.x + to.x) / 2 + perpX * curveOffset;
  const cy = (from.y + to.y) / 2 + perpY * curveOffset;

  // Shorten line to not overlap node circles
  const r = from.is_end ? ACCEPT_R : NODE_R;
  const rt = to.is_end ? ACCEPT_R : NODE_R;
  const startX = from.x + (cx - from.x) / Math.sqrt((cx - from.x) ** 2 + (cy - from.y) ** 2 || 1) * r;
  const startY = from.y + (cy - from.y) / Math.sqrt((cx - from.x) ** 2 + (cy - from.y) ** 2 || 1) * r;
  const endX = to.x - (to.x - cx) / Math.sqrt((to.x - cx) ** 2 + (to.y - cy) ** 2 || 1) * (rt + 4);
  const endY = to.y - (to.y - cy) / Math.sqrt((to.y - cy) ** 2 + (to.x - cx) ** 2 || 1) * (rt + 4);

  const mid = bezierPoint(startX, startY, cx, cy, endX, endY, 0.5);

  return (
    <g>
      <path
        d={`M ${startX} ${startY} Q ${cx} ${cy} ${endX} ${endY}`}
        fill="none" stroke={edgeColor} strokeWidth={isActive ? 2.5 : 1.5}
        markerEnd="url(#dfa-arrow)"
      />
      <text
        x={mid.x} y={mid.y - 6}
        textAnchor="middle" fill={labelColor}
        fontSize={11} fontFamily="var(--font-mono)"
        style={{ pointerEvents: 'none' }}
      >
        {label}
      </text>
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

interface DfaGraphPanelProps {
  dfaJson: Record<string, unknown>;
}

export function DfaGraphPanel({ dfaJson }: DfaGraphPanelProps) {
  const graph = useMemo(() => parseDfaGraph(dfaJson), [dfaJson]);

  const [simInput, setSimInput] = useState('');
  const [simState, setSimState] = useState<SimState>({ step: -1, current: null, accepted: null, rejected: false });

  const stateMap = useMemo(
    () => graph ? new Map(graph.states.map((s) => [s.id, s])) : new Map<number, DFAState>(),
    [graph],
  );

  const positions = useMemo(() => (graph ? layoutNodes(graph.states) : new Map<number, NodePos>()), [graph]);
  const edges = useMemo(() => (graph ? buildEdges(graph.states) : []), [graph]);

  // Which edge pair is bidirectional?
  const edgeKeys = useMemo(() => new Set(edges.map((e) => `${e.from}→${e.to}`)), [edges]);

  const resetSim = useCallback(() => {
    setSimState({ step: -1, current: null, accepted: null, rejected: false });
  }, []);

  const stepSim = useCallback(() => {
    if (!graph) return;
    setSimState((prev) => {
      const nextStep = prev.step + 1;
      if (nextStep === 0) {
        // Initialize to start state
        return { step: 0, current: graph.start_id, accepted: null, rejected: false };
      }
      const charIdx = nextStep - 1;
      if (charIdx >= simInput.length) {
        // Done — check acceptance
        const isAccepted = prev.current !== null && (stateMap.get(prev.current)?.is_end ?? false);
        return { ...prev, step: nextStep, accepted: isAccepted, rejected: !isAccepted };
      }
      if (prev.current === null) return prev;
      const ch = simInput[charIdx];
      const curState = stateMap.get(prev.current);
      const nextStateId = curState?.transitions[ch];
      if (nextStateId === undefined) {
        return { ...prev, step: nextStep, current: null, accepted: false, rejected: true };
      }
      return { step: nextStep, current: nextStateId, accepted: null, rejected: false };
    });
  }, [graph, simInput, stateMap]);

  const runSim = useCallback(() => {
    if (!graph) return;
    resetSim();
    // Step through all characters + final check
    let current: number | null = graph.start_id;
    for (let i = 0; i < simInput.length; i++) {
      const ch = simInput[i];
      if (current === null) break;
      const curState = stateMap.get(current);
      const next = curState?.transitions[ch];
      if (next === undefined) { current = null; break; }
      current = next;
    }
    const isAccepted = current !== null && (stateMap.get(current)?.is_end ?? false);
    setSimState({
      step: simInput.length + 1,
      current,
      accepted: isAccepted,
      rejected: !isAccepted,
    });
  }, [graph, simInput, stateMap, resetSim]);

  if (!graph) {
    return (
      <div className="alert alert--warning">
        <span aria-hidden="true">⚠</span>
        <span>Could not parse DFA graph. Raw JSON displayed in console.</span>
      </div>
    );
  }

  const activeEdgeKey =
    simState.step > 0 && simState.current !== null && simState.step <= simInput.length
      ? (() => {
          const charIdx = simState.step - 1;
          const ch = simInput[charIdx - 1]; // character that caused this transition
          if (!ch) return null;
          // We need the previous state — derive from sim
          return null; // simplified: skip active edge highlighting for Run mode
        })()
      : null;
  void activeEdgeKey; // suppress unused var

  return (
    <div className="stack">
      {/* Graph */}
      <svg
        viewBox="0 0 600 440"
        className="graph-canvas"
        aria-label={`DFA graph for regex. Start state: ${graph.start_id}`}
      >
        <defs>
          <marker id="dfa-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="hsl(215,20%,45%)" />
          </marker>
        </defs>

        {/* Entry arrow */}
        {positions.get(graph.start_id) && (() => {
          const pos = positions.get(graph.start_id)!;
          return (
            <g>
              <line
                x1={pos.x - 55} y1={pos.y}
                x2={pos.x - NODE_R - 4} y2={pos.y}
                stroke="hsl(210,100%,60%)" strokeWidth={2}
                markerEnd="url(#dfa-arrow)"
              />
              <text x={pos.x - 58} y={pos.y - 6} fontSize={10} fill="hsl(210,100%,60%)" textAnchor="end" fontFamily="var(--font-sans)">
                start
              </text>
            </g>
          );
        })()}

        {/* Edges */}
        {edges.map((edge, idx) => {
          const reverseExists = edgeKeys.has(`${edge.to}→${edge.from}`);
          // Count parallel edges (same from→to with different labels are merged, so effectively 1)
          const isEdgeActive = false; // simplified
          return (
            <SvgEdge
              key={idx}
              edge={edge}
              positions={positions}
              isActive={isEdgeActive}
              hasBidirectional={reverseExists && edge.from !== edge.to}
              edgeIndex={0}
              totalParallel={1}
            />
          );
        })}

        {/* Nodes */}
        {graph.states.map((state) => {
          const pos = positions.get(state.id);
          if (!pos) return null;
          const isActive = simState.current === state.id;
          const isStart = state.id === graph.start_id;
          const nodeR = state.is_end ? ACCEPT_R : NODE_R;

          let fillColor = 'hsl(222,28%,14%)';
          let strokeColor = isStart ? 'hsl(210,100%,60%)' : 'hsl(215,20%,35%)';
          let strokeWidth = isStart ? 2.5 : 1.5;
          if (isActive) {
            fillColor = 'hsl(40,90%,20%)';
            strokeColor = 'hsl(40,90%,55%)';
            strokeWidth = 3;
          }
          if (isActive && simState.accepted) {
            fillColor = 'hsl(150,60%,15%)';
            strokeColor = 'hsl(150,80%,45%)';
          }
          if (simState.rejected && simState.current === state.id) {
            fillColor = 'hsl(355,60%,15%)';
            strokeColor = 'hsl(355,85%,58%)';
          }

          return (
            <g key={state.id} aria-label={`State ${state.id}${state.is_end ? ' (accepting)' : ''}${isStart ? ' (start)' : ''}`}>
              {state.is_end && (
                <circle cx={pos.x} cy={pos.y} r={nodeR + 5} fill="none" stroke={strokeColor} strokeWidth={1.2} strokeDasharray="4 2" />
              )}
              <circle
                cx={pos.x} cy={pos.y} r={nodeR}
                fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth}
              />
              <text
                x={pos.x} y={pos.y + 4}
                textAnchor="middle" fill="hsl(215,25%,92%)"
                fontSize={13} fontWeight={600} fontFamily="var(--font-mono)"
              >
                {state.id}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="row" style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)', gap: '1rem', flexWrap: 'wrap' }}>
        <span>● Start state (blue border)</span>
        <span>⊙ Accepting state (dashed outer ring)</span>
        <span style={{ color: 'hsl(40,90%,55%)' }}>● Active state (amber)</span>
        <span style={{ color: 'hsl(150,80%,45%)' }}>✓ Accepted</span>
        <span style={{ color: 'hsl(355,85%,58%)' }}>✗ Rejected</span>
      </div>

      {/* Simulation controls */}
      <div className="sim-controls" aria-label="DFA string simulation">
        <label className="field__label" htmlFor="dfa-sim-input" style={{ whiteSpace: 'nowrap' }}>
          Test string
        </label>
        <input
          id="dfa-sim-input"
          className="field__input"
          style={{ flex: 1, minWidth: 120 }}
          value={simInput}
          onChange={(e) => { setSimInput(e.target.value); resetSim(); }}
          placeholder='e.g. "abc"'
          aria-label="Input string to simulate"
        />
        <button id="btn-dfa-run" className="btn btn--primary btn--sm" onClick={runSim} disabled={!simInput}>
          Run
        </button>
        <button id="btn-dfa-step" className="btn btn--secondary btn--sm" onClick={stepSim}
          disabled={simState.step > simInput.length + 1}
        >
          Step
        </button>
        <button id="btn-dfa-reset" className="btn btn--secondary btn--sm" onClick={resetSim}>
          Reset
        </button>
        <span className="field__hint" style={{ whiteSpace: 'nowrap' }}>
          Step {Math.max(0, simState.step)} / {simInput.length + 1}
        </span>
      </div>

      {simState.accepted !== null && (
        <div className={`sim-result sim-result--${simState.accepted ? 'accepted' : 'rejected'}`} role="status" aria-live="polite">
          {simState.accepted
            ? `✓ "${simInput}" is ACCEPTED by the DFA`
            : `✗ "${simInput}" is REJECTED by the DFA`}
        </div>
      )}
      {simState.rejected && simState.accepted === null && (
        <div className="sim-result sim-result--rejected" role="status" aria-live="polite">
          ✗ Dead state — no transition for &quot;{simState.current === null ? '(trapped)' : simInput[simState.step - 1]}&quot;
        </div>
      )}
    </div>
  );
}
