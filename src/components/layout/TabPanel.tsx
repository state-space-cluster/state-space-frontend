import type { ReactNode } from 'react';

interface TabPanelProps {
  tabs: string[];
  active: string;
  onSelect: (tab: string) => void;
  children: ReactNode;
}

export function TabPanel({ tabs, active, onSelect, children }: TabPanelProps) {
  return (
    <div className="tabs">
      <div className="tab-bar" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={active === tab}
            className={`tab-bar__btn ${active === tab ? 'tab-bar__btn--active' : ''}`}
            onClick={() => onSelect(tab)}
            id={`tab-${tab.toLowerCase().replace(/\s+/g, '-')}`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div role="tabpanel">{children}</div>
    </div>
  );
}
