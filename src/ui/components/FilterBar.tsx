import { useState } from 'react';

interface FilterBarProps {
  onFilter: (filters: Record<string, string>) => void;
}

export function FilterBar({ onFilter }: FilterBarProps) {
  const [host, setHost] = useState('');
  const [status, setStatus] = useState('');
  const [method, setMethod] = useState('');
  const [search, setSearch] = useState('');

  const apply = () => {
    const filters: Record<string, string> = {};
    if (host) filters.host = host;
    if (status) filters.status = status;
    if (method) filters.method = method;
    if (search) filters.search = search;
    onFilter(filters);
  };

  const clear = () => {
    setHost('');
    setStatus('');
    setMethod('');
    setSearch('');
    onFilter({});
  };

  return (
    <div className="flex items-center gap-2 p-3 bg-gray-900 border-b border-gray-800">
      <input type="text" placeholder="Host" value={host} onChange={(e) => setHost(e.target.value)}
        className="bg-gray-800 text-gray-100 px-2 py-1 rounded text-sm border border-gray-700 w-40" />
      <input type="text" placeholder="Status" value={status} onChange={(e) => setStatus(e.target.value)}
        className="bg-gray-800 text-gray-100 px-2 py-1 rounded text-sm border border-gray-700 w-20" />
      <select value={method} onChange={(e) => setMethod(e.target.value)}
        className="bg-gray-800 text-gray-100 px-2 py-1 rounded text-sm border border-gray-700">
        <option value="">All Methods</option>
        <option value="GET">GET</option>
        <option value="POST">POST</option>
        <option value="PUT">PUT</option>
        <option value="PATCH">PATCH</option>
        <option value="DELETE">DELETE</option>
        <option value="OPTIONS">OPTIONS</option>
      </select>
      <input type="text" placeholder="Search URL..." value={search} onChange={(e) => setSearch(e.target.value)}
        className="bg-gray-800 text-gray-100 px-2 py-1 rounded text-sm border border-gray-700 flex-1" />
      <button onClick={apply} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm">Filter</button>
      <button onClick={clear} className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1 rounded text-sm">Clear</button>
    </div>
  );
}
