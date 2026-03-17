import type { RequestRecord } from '../api.ts';

interface TrafficListProps {
  requests: RequestRecord[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const statusColor = (status: number | null) => {
  if (!status) return 'text-gray-500';
  if (status < 300) return 'text-green-400';
  if (status < 400) return 'text-yellow-400';
  if (status < 500) return 'text-orange-400';
  return 'text-red-400';
};

const methodColor = (method: string) => {
  const colors: Record<string, string> = { GET: 'text-blue-400', POST: 'text-green-400', PUT: 'text-yellow-400', PATCH: 'text-orange-400', DELETE: 'text-red-400' };
  return colors[method] || 'text-gray-400';
};

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
};

export function TrafficList({ requests, selectedId, onSelect }: TrafficListProps) {
  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-900 sticky top-0">
          <tr className="text-left text-gray-400 border-b border-gray-800">
            <th className="px-3 py-2 w-20">Method</th>
            <th className="px-3 py-2 w-16">Status</th>
            <th className="px-3 py-2 w-48">Host</th>
            <th className="px-3 py-2">Path</th>
            <th className="px-3 py-2 w-20 text-right">Time</th>
            <th className="px-3 py-2 w-20 text-right">Size</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((req) => (
            <tr key={req.id} onClick={() => onSelect(req.id)}
              className={`border-b border-gray-800/50 cursor-pointer hover:bg-gray-800/50 ${selectedId === req.id ? 'bg-gray-800' : ''}`}>
              <td className={`px-3 py-1.5 font-mono ${methodColor(req.method)}`}>{req.method}</td>
              <td className={`px-3 py-1.5 font-mono ${statusColor(req.status)}`}>{req.status ?? '-'}</td>
              <td className="px-3 py-1.5 text-gray-300 truncate max-w-48">{req.host}</td>
              <td className="px-3 py-1.5 text-gray-400 truncate">{req.path}</td>
              <td className="px-3 py-1.5 text-gray-500 text-right">{req.duration ? `${req.duration}ms` : '-'}</td>
              <td className="px-3 py-1.5 text-gray-500 text-right">{formatBytes(req.response_size)}</td>
            </tr>
          ))}
          {requests.length === 0 && (
            <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-600">No requests captured yet. Configure your app to use the proxy.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
