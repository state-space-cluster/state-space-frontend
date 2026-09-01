import { useState } from 'react';
import { Navbar } from './Navbar';
import { TabPanel } from './TabPanel';
import { MatrixSection } from '../matrix/MatrixSection.tsx';
import { DfaSection } from '../dfa/DfaSection.tsx';

interface DashboardProps {
  onLogout: () => void;
}

const MAIN_TABS = ['⬡ Matrix', '◎ Automata'];

export function Dashboard({ onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState(MAIN_TABS[0]);

  return (
    <>
      <Navbar onLogout={onLogout} />
      <main className="dashboard" aria-label="Dashboard">
        <header style={{ marginBottom: '0.5rem' }}>
          <h1 style={{ fontSize: '1.6rem' }}>
            Algorithmic Engine{' '}
            <span style={{ color: 'var(--clr-text-muted)', fontWeight: 400 }}>Dashboard</span>
          </h1>
          <p>
            Run Strassen matrix multiplication or construct NFA/DFA automata from regular
            expressions.
          </p>
        </header>

        <TabPanel tabs={MAIN_TABS} active={activeTab} onSelect={setActiveTab}>
          {activeTab === MAIN_TABS[0] && <MatrixSection />}
          {activeTab === MAIN_TABS[1] && <DfaSection />}
        </TabPanel>
      </main>
    </>
  );
}
