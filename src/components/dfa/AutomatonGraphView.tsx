import { useState } from 'react';
import { TabPanel } from '../layout/TabPanel';
import { DfaGraphPanel } from './DfaGraphPanel';
import { NfaGraphPanel } from './NfaGraphPanel';
import type { DFAResult } from '../../types';

interface AutomatonGraphViewProps {
  result: DFAResult;
}

const AUTOMATON_TABS = ['DFA', 'NFA'];

export function AutomatonGraphView({ result }: AutomatonGraphViewProps) {
  const [activeTab, setActiveTab] = useState('DFA');

  return (
    <div className="stack">
      <div className="row row--apart" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h3>Automaton Graphs</h3>
          <p style={{ fontSize: '0.82rem' }}>
            Pattern:{' '}
            <code style={{ color: 'var(--clr-primary)', fontFamily: 'var(--font-mono)' }}>
              {result.regex_pattern}
            </code>
          </p>
        </div>
        <div className="row" style={{ gap: '0.5rem', alignItems: 'center' }}>
          {result.cached !== undefined && (
            <span className={`badge ${result.cached ? 'badge--accent' : 'badge--success'}`}>
              {result.cached ? '⚡ Cached' : '✦ Computed'}
            </span>
          )}
          <span
            className="hash-display"
            title="Click to copy regex hash"
            onClick={() => navigator.clipboard.writeText(result.regex_hash)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigator.clipboard.writeText(result.regex_hash)}
            aria-label={`Regex hash: ${result.regex_hash}. Click to copy.`}
          >
            # {result.regex_hash}
          </span>
        </div>
      </div>

      <TabPanel tabs={AUTOMATON_TABS} active={activeTab} onSelect={setActiveTab}>
        {activeTab === 'DFA' && (
          <div className="card card--sm">
            <h4 style={{ marginBottom: '1rem', color: 'var(--clr-text-muted)' }}>
              Deterministic Finite Automaton — Subset Construction
            </h4>
            <DfaGraphPanel dfaJson={result.dfa_json} />
          </div>
        )}
        {activeTab === 'NFA' && (
          <div className="card card--sm">
            <h4 style={{ marginBottom: '1rem', color: 'var(--clr-text-muted)' }}>
              Nondeterministic Finite Automaton — Thompson&apos;s Construction
            </h4>
            <NfaGraphPanel nfaJson={result.nfa_json} />
          </div>
        )}
      </TabPanel>
    </div>
  );
}
