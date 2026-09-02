import { useState } from 'react';
import { Navbar } from './Navbar';
import { TabPanel } from './TabPanel';
import { MatrixSection } from '../matrix/MatrixSection.tsx';
import { DfaSection } from '../dfa/DfaSection.tsx';

interface DashboardProps {
  isAuthenticated: boolean;
  matrixCount?: number;
  dfaCount?: number;
  isMatrixLimitReached?: boolean;
  isDfaLimitReached?: boolean;
  onMatrixSuccess?: () => void;
  onDfaSuccess?: () => void;
  onLimitReached?: (type: 'matrix' | 'dfa') => void;
  onShowAuth?: (tab?: 'login' | 'register') => void;
  onLogout?: () => void;
}

const MAIN_TABS = ['⬡ Matrix', '◎ Automata'];

export function Dashboard({
  isAuthenticated,
  matrixCount = 0,
  dfaCount = 0,
  isMatrixLimitReached = false,
  isDfaLimitReached = false,
  onMatrixSuccess,
  onDfaSuccess,
  onLimitReached,
  onShowAuth,
  onLogout,
}: DashboardProps) {
  const [activeTab, setActiveTab] = useState(MAIN_TABS[0]);

  return (
    <>
      <Navbar
        isAuthenticated={isAuthenticated}
        matrixCount={matrixCount}
        dfaCount={dfaCount}
        onLogout={onLogout}
        onShowAuth={onShowAuth}
      />
      <main className="dashboard" aria-label="Dashboard">
        <header style={{ marginBottom: '0.5rem' }}>
          <h1 style={{ fontSize: '1.6rem' }}>
            Algorithmic Engine{' '}
            <span style={{ color: 'var(--clr-text-muted)', fontWeight: 400 }}>Dashboard</span>
          </h1>
          <p>
            Run Strassen matrix multiplication or construct NFA/DFA automata from regular
            expressions.
            {!isAuthenticated && (
              <span style={{ color: 'var(--clr-accent)', marginLeft: '0.5rem', fontSize: '0.85rem' }}>
                — Guest mode: 3 free requests per tool.{' '}
                <button
                  id="btn-dashboard-signup"
                  type="button"
                  onClick={() => onShowAuth?.('register')}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--clr-primary)', fontWeight: 600, fontSize: 'inherit',
                    padding: 0, textDecoration: 'underline',
                  }}
                >
                  Sign up for unlimited access.
                </button>
              </span>
            )}
          </p>
        </header>

        <TabPanel tabs={MAIN_TABS} active={activeTab} onSelect={setActiveTab}>
          {activeTab === MAIN_TABS[0] && (
            <MatrixSection
              isLimitReached={!isAuthenticated && isMatrixLimitReached}
              onLimitReached={() => onLimitReached?.('matrix')}
              onSuccess={onMatrixSuccess}
            />
          )}
          {activeTab === MAIN_TABS[1] && (
            <DfaSection
              isLimitReached={!isAuthenticated && isDfaLimitReached}
              onLimitReached={() => onLimitReached?.('dfa')}
              onSuccess={onDfaSuccess}
            />
          )}
        </TabPanel>
      </main>
    </>
  );
}
