import { useState } from 'react';
import { DfaForm } from './DfaForm';
import { DfaLookup } from './DfaLookup';
import { AutomatonGraphView } from './AutomatonGraphView';
import type { DFAResult } from '../../types';

interface DfaSectionProps {
  onLimitReached?: () => void;
  isLimitReached?: boolean;
  onSuccess?: () => void;
}

export function DfaSection({ onLimitReached, isLimitReached, onSuccess }: DfaSectionProps) {
  const [result, setResult] = useState<DFAResult | null>(null);

  const handleResult = (r: DFAResult) => {
    setResult(r);
  };

  return (
    <div className="stack">
      <div className="section-header">
        <div className="section-icon section-icon--purple" aria-hidden="true">◎</div>
        <div>
          <h2>NFA / DFA Construction</h2>
          <p style={{ fontSize: '0.82rem', marginTop: '0.1rem' }}>
            Shunting Yard → Thompson's Construction → Subset Construction — synchronous
          </p>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>Submit Regex</h3>
        <DfaForm
          onResult={handleResult}
          onLimitReached={onLimitReached}
          isLimitReached={isLimitReached}
          onSuccess={onSuccess}
        />
      </div>

      <div className="card card--sm">
        <DfaLookup onResult={handleResult} />
      </div>

      {result ? (
        <div className="card">
          <AutomatonGraphView result={result} />
        </div>
      ) : (
        <div className="empty-state">
          <span className="empty-state__icon" aria-hidden="true">◎</span>
          <p>Submit a regex or look up a hash to visualise the automata.</p>
        </div>
      )}
    </div>
  );
}
