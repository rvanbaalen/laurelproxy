import { useState, useCallback } from 'react';
import { Controls } from './components/Controls.tsx';
import { FilterBar } from './components/FilterBar.tsx';
import { TrafficList } from './components/TrafficList.tsx';
import { RequestDetail } from './components/RequestDetail.tsx';
import { useSSE, fetchRequests } from './api.ts';
import type { RequestRecord } from './api.ts';

export function App() {
  const liveRequests = useSSE(500);
  const [filteredRequests, setFilteredRequests] = useState<RequestRecord[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleFilter = useCallback(async (filters: Record<string, string>) => {
    if (Object.keys(filters).length === 0) { setFilteredRequests(null); return; }
    const result = await fetchRequests(filters);
    setFilteredRequests(result.data);
  }, []);

  const handleClear = useCallback(() => { setFilteredRequests(null); setSelectedId(null); }, []);

  const displayRequests = filteredRequests ?? liveRequests;

  return (
    <div className="flex flex-col h-screen">
      <Controls onClear={handleClear} />
      <FilterBar onFilter={handleFilter} />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-col flex-1">
          <TrafficList requests={displayRequests} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
        {selectedId && (
          <div className="w-[500px] flex-shrink-0">
            <RequestDetail requestId={selectedId} onClose={() => setSelectedId(null)} />
          </div>
        )}
      </div>
    </div>
  );
}
