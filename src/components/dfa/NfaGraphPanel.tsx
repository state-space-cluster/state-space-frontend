import { useState, useMemo, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// NFA JSON shape — inferred from Thompson's Construction
// The schema only guarantees additionalProperties: {}
// Inferred runtime shape:
//   { start_id: number|string, end_id: number|string,
//     states: Record<string, { transitions: Record<string, string[]> }> }
// Epsilon key may be "ε", "eps", or ""
// ─────────────────────────────────────────────────────────────────────────────

interface NfaStateData {
  id: string;
  transitions: Record<string, string[]>; // char|ε → [target ids]
}

interface ParsedNFA {
  start_id: string;
  end_id: string;
  states: Map<string, NfaStateData>;
}

const EPSILON_KEYS = ['ε', 'eps', '', 'epsilon'];

function isEpsilonKey(ch: string): boolean {
  return EPSILON_KEYS.includes(ch);
}

function normalizeStateId(id: unknown): string | null {
  if (typeof id === 'string') return id;
  if (typeof id === 'number') return String(id);
  return null;
}

function parseNfaGraph(raw: Record<string, unknown>): ParsedNFA | string {
  const startId = normalizeStateId(raw.start_id);
  const endId = normalizeStateId(raw.end_id);
  if (!startId) return 'Missing or invalid start_id';
  if (!endId) return 'Missing or invalid end_id';

  if (typeof raw.states !== 'object' || raw.states === null || Array.isArray(raw.states)) {
    return 'states must be an object (dict keyed by state id)';
  }

  const statesRaw = raw.states as Record<string, unknown>;
  const statesMap = new Map<string, NfaStateData>();

  for (const [stateId, stateData] of Object.entries(statesRaw)) {
    if (typeof stateData !== 'object' || stateData === null) {
      return `State ${stateId}: expected object, got ${typeof stateData}`;
    }
    const sd = stateData as Record<string, unknown>;
    const transRaw =
      typeof sd.transitions === 'object' && sd.transitions !== null && !Array.isArray(sd.transitions)
        ? (sd.transitions as Record<string, unknown>)
        : {};

    const transitions: Record<string, string[]> = {};
    for (const [ch, targets] of Object.entries(transRaw)) {
      if (Array.isArray(targets)) {
        transitions[ch] = (targets as unknown[]).map(String);
      } else if (typeof targets === 'string' || typeof targets === 'number') {
        // Tolerate single target (not an array)
        transitions[ch] = [String(targets)];
      }
    }
    statesMap.set(stateId, { id: stateId, transitions });
  }

  return { start_id: startId, end_id: endId, states: statesMap };
}

// ─────────────────────────────────────────────────────────────────────────────
// ε-closure for NFA simulation
// ─────────────────────────────────────────────────────────────────────────────

function epsilonClosure(states: Set<string>, nfa: ParsedNFA): Set<string> {
  const closure = new Set(states);
  const stack = [...states];
  while (stack.length > 0) {
    const id = stack.pop()!;
    const st = nfa.states.get(id);
    if (!st) continue;
    for (const [ch, targets] of Object.entries(st.transitions)) {
      if (isEpsilonKey(ch)) {
        for (const t of targets) {
          if (!closure.has(t)) {
            closure.add(t);
            stack.push(t);
          }
        }
      }
    }
  }
  return closure;
}

function nfaStep(activeStates: Set<string>, ch: string, nfa: ParsedNFA): Set<string> {
  const moved = new Set<string>();
  for (const id of activeStates) {
    const st = nfa.states.get(id);
    if (!st) continue;
    for (const [edgeCh, targets] of Object.entries(st.transitions)) {
      if (!isEpsilonKey(edgeCh) && edgeCh === ch) {
        for (const t of targets) moved.add(t);
      }
    }
  }
  return epsilonClosure(moved, nfa);
}

// ─────────────────────────────────────────────────────────────────────────────
// Layout — same circular approach as DFA panel
// ─────────────────────────────────────────────────────────────────────────────

const CX = 300;
const CY = 220;
const R_LAYOUT = 155;
const NODE_R = 20;

interface NodePos { id: string; x: number; y: number }

function layoutNfaNodes(nfa: ParsedNFA): Map<string, NodePos> {
  const ids = Array.from(nfa.states.keys());
  const n = ids.length;
  const map = new Map<string, NodePos>();
  ids.forEach((id, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    const x = n === 1 ? CX : CX + R_LAYOUT * Math.cos(angle);
    const y = n === 1 ? CY : CY + R_LAYOUT * Math.sin(angle);
    map.set(id, { id, x, y });
  });
  return map;
}

// ─────────────────────────────────────────────────────────────────────────────
// Edge group: (from, to, [labels])
// Multiple parallel edges between same pair get arc offsets
// ─────────────────────────────────────────────────────────────────────────────

interface NfaEdge {
  from: string;
  to: string;
  label: string;
  isEpsilon: boolean;
  parallelIndex: number;  // 0-based index among all edges from→to
  parallelTotal: number;
}

function buildNfaEdges(nfa: ParsedNFA): NfaEdge[] {
  // First pass: collect (from, to, label) tuples — one per (from, to, label)
  const tuples: { from: string; to: string; label: string; isEpsilon: boolean }[] = [];
  for (const [stateId, stateData] of nfa.states) {
    for (const [ch, targets] of Object.entries(stateData.transitions)) {
      for (const t of targets) {
        tuples.push({ from: stateId, to: t, label: isEpsilonKey(ch) ? 'ε' : ch, isEpsilon: isEpsilonKey(ch) });
      }
    }
  }

  // Group by (from, to) — distinct edges may share same pair
  const groups = new Map<string, typeof tuples>();
  for (const t of tuples) {
    const key = `${t.from}→${t.to}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  }

  const result: NfaEdge[] = [];
  for (const [, group] of groups) {
    const total = group.length;
    group.forEach((t, idx) => {
      result.push({ ...t, parallelIndex: idx, parallelTotal: total });
    });
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG NFA Edge
// ─────────────────────────────────────────────────────────────────────────────

interface NfaEdgeProps {
  edge: NfaEdge;
  positions: Map<string, NodePos>;
  isActive: boolean;
  reverseExists: boolean;
}

function SvgNfaEdge({ edge, positions, isActive, reverseExists }: NfaEdgeProps) {
  const from = positions.get(edge.from);
  const to = positions.get(edge.to);
  if (!from || !to) return null;

  const color = isActive
    ? (edge.isEpsilon ? 'hsl(280,90%,65%)' : 'hsl(40,90%,55%)')
    : (edge.isEpsilon ? 'hsl(280,40%,50%)' : 'hsl(215,20%,45%)');
  const labelColor = isActive
    ? (edge.isEpsilon ? 'hsl(280,90%,80%)' : 'hsl(40,90%,70%)')
    : (edge.isEpsilon ? 'hsl(280,50%,65%)' : 'hsl(215,20%,65%)');

  const isSelf = edge.from === edge.to;

  if (isSelf) {
    const offset = edge.parallelIndex * 18;
    return (
      <g>
        <path
          d={`M ${from.x - 10} ${from.y - NODE_R} C ${from.x - 45 - offset} ${from.y - 80 - offset} ${from.x + 45 + offset} ${from.y - 80 - offset} ${from.x + 10} ${from.y - NODE_R}`}
          fill="none"
          stroke={color}
          strokeWidth={isActive ? 2.5 : 1.5}
          strokeDasharray={edge.isEpsilon ? '5 3' : 'none'}
          markerEnd="url(#nfa-arrow)"
        />
        <text
          x={from.x} y={from.y - NODE_R - 30 - offset}
          textAnchor="middle" fill={labelColor} fontSize={11} fontFamily="var(--font-mono)"
        >
          {edge.label}
        </text>
      </g>
    );
  }

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return null;

  // Curvature: bidirectional edges curve opposite sides; parallel edges fan out
  const baseOffset = reverseExists ? 35 : 0;
  const parallelOffset = (edge.parallelIndex - (edge.parallelTotal - 1) / 2) * 22;
  const totalOffset = baseOffset + parallelOffset;

  const perpX = -dy / len;
  const perpY = dx / len;
  const cx = (from.x + to.x) / 2 + perpX * totalOffset;
  const cy = (from.y + to.y) / 2 + perpY * totalOffset;

  const r = NODE_R;
  const startX = from.x + (cx - from.x) / (Math.sqrt((cx - from.x) ** 2 + (cy - from.y) ** 2) || 1) * r;
  const startY = from.y + (cy - from.y) / (Math.sqrt((cx - from.x) ** 2 + (cy - from.y) ** 2) || 1) * r;
  const endX = to.x - (to.x - cx) / (Math.sqrt((to.x - cx) ** 2 + (to.y - cy) ** 2) || 1) * (r + 4);
  const endY = to.y - (to.y - cy) / (Math.sqrt((to.y - cy) ** 2 + (to.x - cx) ** 2) || 1) * (r + 4);

  const midX = 0.25 * startX + 0.5 * cx + 0.25 * endX;
  const midY = 0.25 * startY + 0.5 * cy + 0.25 * endY;

  return (
    <g>
      <path
        d={`M ${startX} ${startY} Q ${cx} ${cy} ${endX} ${endY}`}
        fill="none"
        stroke={color}
        strokeWidth={isActive ? 2.5 : 1.5}
        strokeDasharray={edge.isEpsilon ? '5 3' : undefined}
        markerEnd="url(#nfa-arrow)"
      />
      <text
        x={midX} y={midY - 6}
        textAnchor="middle" fill={labelColor}
        fontSize={11} fontFamily="var(--font-mono)"
        style={{ pointerEvents: 'none' }}
      >
        {edge.label}
      </text>
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NfaGraphPanel
// ─────────────────────────────────────────────────────────────────────────────

interface NfaGraphPanelProps {
  nfaJson: Record<string, unknown>;
}

interface NfaSimState {
  step: number;
  activeStates: Set<string>;
  done: boolean;
}

export function NfaGraphPanel({ nfaJson }: NfaGraphPanelProps) {
  const parseResult = useMemo(() => parseNfaGraph(nfaJson), [nfaJson]);
  const graph: ParsedNFA | null = typeof parseResult === 'string' ? null : parseResult;
  const parseError: string | null = typeof parseResult === 'string' ? parseResult : null;

  const positions = useMemo(() => (graph ? layoutNfaNodes(graph) : new Map<string, NodePos>()), [graph]);
  const edges = useMemo(() => (graph ? buildNfaEdges(graph) : []), [graph]);

  const edgePairs = useMemo(() => new Set(edges.map((e) => `${e.from}→${e.to}`)), [edges]);

  const [simInput, setSimInput] = useState('');
  const [simState, setSimState] = useState<NfaSimState>({
    step: -1,
    activeStates: new Set<string>(),
    done: false,
  });

  const resetSim = useCallback(() => {
    setSimState({ step: -1, activeStates: new Set(), done: false });
  }, []);

  const initSim = useCallback((): NfaSimState => {
    if (!graph) return { step: 0, activeStates: new Set(), done: false };
    const initial = epsilonClosure(new Set([graph.start_id]), graph);
    return { step: 0, activeStates: initial, done: false };
  }, [graph]);

  const stepSim = useCallback(() => {
    if (!graph) return;
    setSimState((prev) => {
      if (prev.step < 0) return initSim();
      const charIdx = prev.step;
      if (charIdx >= simInput.length) {
        return { ...prev, done: true };
      }
      const ch = simInput[charIdx];
      const next = nfaStep(prev.activeStates, ch, graph);
      return { step: charIdx + 1, activeStates: next, done: charIdx + 1 >= simInput.length };
    });
  }, [graph, simInput, initSim]);

  const runSim = useCallback(() => {
    if (!graph) return;
    let active = epsilonClosure(new Set([graph.start_id]), graph);
    for (const ch of simInput) {
      active = nfaStep(active, ch, graph);
    }
    setSimState({ step: simInput.length, activeStates: active, done: true });
  }, [graph, simInput]);

  const isAccepted = simState.done && graph
    ? simState.activeStates.has(graph.end_id)
    : null;

  if (parseError) {
    return (
      <div className="stack">
        <div className="alert alert--warning">
          <span aria-hidden="true">⚠</span>
          <div>
            <strong>Could not parse NFA graph:</strong> {parseError}
            <br />
            <span style={{ fontSize: '0.78rem' }}>
              Expected shape: {`{ start_id, end_id, states: { "id": { transitions: { char: [ids] } } } }`}
            </span>
          </div>
        </div>
        <pre style={{ fontSize: '0.72rem', color: 'var(--clr-text-muted)', overflowX: 'auto', padding: '0.5rem', background: 'hsla(222,28%,6%,0.8)', borderRadius: 8 }}>
          {JSON.stringify(nfaJson, null, 2)}
        </pre>
      </div>
    );
  }

  if (!graph) return null;

  return (
    <div className="stack">
      <svg
        viewBox="0 0 600 440"
        className="graph-canvas"
        aria-label={`NFA graph. Start: ${graph.start_id}, Accept: ${graph.end_id}`}
      >
        <defs>
          <marker id="nfa-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
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
                markerEnd="url(#nfa-arrow)"
              />
              <text x={pos.x - 58} y={pos.y - 6} fontSize={10} fill="hsl(210,100%,60%)" textAnchor="end" fontFamily="var(--font-sans)">
                start
              </text>
            </g>
          );
        })()}

        {/* Edges */}
        {edges.map((edge, idx) => {
          const reverseExists = edgePairs.has(`${edge.to}→${edge.from}`) && edge.from !== edge.to;
          const isActive =
            simState.step > 0
              ? simState.activeStates.has(edge.to) || simState.activeStates.has(edge.from)
              : false;
          return (
            <SvgNfaEdge
              key={idx}
              edge={edge}
              positions={positions}
              isActive={isActive}
              reverseExists={reverseExists}
            />
          );
        })}

        {/* Nodes */}
        {Array.from(graph.states.values()).map((state) => {
          const pos = positions.get(state.id);
          if (!pos) return null;
          const isStart = state.id === graph.start_id;
          const isEnd = state.id === graph.end_id;
          const isActive = simState.step >= 0 && simState.activeStates.has(state.id);

          let fill = 'hsl(222,28%,14%)';
          let stroke = isStart ? 'hsl(210,100%,60%)' : isEnd ? 'hsl(150,80%,45%)' : 'hsl(215,20%,35%)';
          let sw = isStart || isEnd ? 2.5 : 1.5;
          if (isActive) {
            fill = 'hsl(40,90%,20%)';
            stroke = 'hsl(40,90%,55%)';
            sw = 3;
          }
          if (isActive && isAccepted) {
            fill = 'hsl(150,60%,15%)';
            stroke = 'hsl(150,80%,45%)';
          }
          if (simState.done && !isAccepted && isActive) {
            fill = 'hsl(355,60%,15%)';
            stroke = 'hsl(355,85%,58%)';
          }

          return (
            <g key={state.id} aria-label={`State ${state.id}${isStart ? ' (start)' : ''}${isEnd ? ' (accept)' : ''}`}>
              {isEnd && (
                <circle cx={pos.x} cy={pos.y} r={NODE_R + 5} fill="none"
                  stroke={isActive && isAccepted ? 'hsl(150,80%,45%)' : 'hsl(150,50%,35%)'}
                  strokeWidth={1.5} strokeDasharray="4 2"
                />
              )}
              <circle cx={pos.x} cy={pos.y} r={NODE_R} fill={fill} stroke={stroke} strokeWidth={sw} />
              <text
                x={pos.x} y={pos.y + 4}
                textAnchor="middle" fill="hsl(215,25%,92%)"
                fontSize={12} fontWeight={600} fontFamily="var(--font-mono)"
              >
                {state.id}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="row" style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)', gap: '1rem', flexWrap: 'wrap' }}>
        <span style={{ color: 'hsl(210,100%,60%)' }}>→ Start state (blue border)</span>
        <span style={{ color: 'hsl(150,80%,45%)' }}>⊙ Accept state (green dashed ring)</span>
        <span style={{ color: 'hsl(280,60%,60%)' }}>- - Epsilon (ε) transitions</span>
        <span style={{ color: 'hsl(40,90%,55%)' }}>● Active state set (amber)</span>
      </div>

      {/* Simulation controls */}
      <div className="sim-controls" aria-label="NFA string simulation">
        <label className="field__label" htmlFor="nfa-sim-input" style={{ whiteSpace: 'nowrap' }}>
          Test string
        </label>
        <input
          id="nfa-sim-input"
          className="field__input"
          style={{ flex: 1, minWidth: 120 }}
          value={simInput}
          onChange={(e) => { setSimInput(e.target.value); resetSim(); }}
          placeholder='e.g. "abc"'
          aria-label="Input string to simulate on NFA"
        />
        <button id="btn-nfa-run" className="btn btn--primary btn--sm" onClick={runSim} disabled={!simInput}>
          Run
        </button>
        <button
          id="btn-nfa-step"
          className="btn btn--secondary btn--sm"
          onClick={stepSim}
          disabled={simState.done}
        >
          Step
        </button>
        <button id="btn-nfa-reset" className="btn btn--secondary btn--sm" onClick={resetSim}>
          Reset
        </button>
        <span className="field__hint" style={{ whiteSpace: 'nowrap' }}>
          States active: {simState.activeStates.size}
        </span>
      </div>

      {simState.step >= 0 && (
        <div className="row" style={{ fontSize: '0.78rem', color: 'var(--clr-text-muted)' }}>
          Active:{' '}
          {simState.activeStates.size === 0 ? (
            <span style={{ color: 'hsl(355,85%,58%)' }}>∅ (dead)</span>
          ) : (
            <span style={{ fontFamily: 'var(--font-mono)', color: 'hsl(40,90%,65%)' }}>
              {'{' + Array.from(simState.activeStates).join(', ') + '}'}
            </span>
          )}
        </div>
      )}

      {isAccepted !== null && (
        <div className={`sim-result sim-result--${isAccepted ? 'accepted' : 'rejected'}`} role="status" aria-live="polite">
          {isAccepted
            ? `✓ "${simInput}" is ACCEPTED by the NFA`
            : `✗ "${simInput}" is REJECTED by the NFA`}
        </div>
      )}
    </div>
  );
}
