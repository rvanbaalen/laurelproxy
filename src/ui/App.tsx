import { useState, useCallback } from 'react';
import { Controls } from './components/Controls.tsx';
import { FilterBar } from './components/FilterBar.tsx';
import { TrafficList } from './components/TrafficList.tsx';
import { RequestDetail } from './components/RequestDetail.tsx';
import { ResizeHandle } from './components/ResizeHandle.tsx';
import { useSSE, fetchRequests } from './api.ts';
import type { RequestRecord } from './api.ts';

const MIN_PANEL_WIDTH = 300;
const MAX_PANEL_WIDTH = 900;
const DEFAULT_PANEL_WIDTH = 500;

export function App() {
  const liveRequests = useSSE(500);
  const [filteredRequests, setFilteredRequests] = useState<RequestRecord[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH);

  const handleFilter = useCallback(async (filters: Record<string, string>) => {
    if (Object.keys(filters).length === 0) { setFilteredRequests(null); return; }
    const result = await fetchRequests(filters);
    setFilteredRequests(result.data);
  }, []);

  const handleClear = useCallback(() => { setFilteredRequests(null); setSelectedId(null); }, []);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(prev => prev === id ? null : id);
  }, []);

  const handleResize = useCallback((delta: number) => {
    setPanelWidth(prev => Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, prev + delta)));
  }, []);

  const displayRequests = filteredRequests ?? liveRequests;

  return (
    <div className="flex flex-col h-screen">
      <Controls onClear={handleClear} />
      <FilterBar onFilter={handleFilter} />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-col flex-1 min-w-0">
          <TrafficList requests={displayRequests} selectedId={selectedId} onSelect={handleSelect} />
        </div>
        {selectedId && (
          <>
            <ResizeHandle onResize={handleResize} />
            <div className="flex-shrink-0 overflow-hidden" style={{ width: panelWidth }}>
              <RequestDetail requestId={selectedId} onClose={() => setSelectedId(null)} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
