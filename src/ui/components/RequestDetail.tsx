import { useState, useEffect, useCallback } from 'react';
import { fetchRequest } from '../client.ts';
import type { RequestRecord } from '../client.ts';

const SKIP_HEADERS = new Set([
  'proxy-connection', 'proxy-authorization', 'connection',
  'keep-alive', 'transfer-encoding', 'upgrade',
]);

function buildCurlCommand(record: RequestRecord): string {
  const parts = ['curl'];
  if (record.method !== 'GET') parts.push(`-X ${record.method}`);
  const headers = parseHeaders(record.request_headers);
  for (const [key, value] of Object.entries(headers)) {
    if (SKIP_HEADERS.has(key.toLowerCase())) continue;
    parts.push(`-H ${shellQuote(`${key}: ${value}`)}`);
  }
  if (record.request_body) {
    const body = decodeBody(record.request_body);
    if (body) parts.push(`-d ${shellQuote(body)}`);
  }
  parts.push(shellQuote(record.url));
  return parts.join(' \\\n  ');
}

function shellQuote(s: string): string {
  if (!/[^a-zA-Z0-9@%_+=:,./-]/.test(s)) return s;
  return "'" + s.replace(/'/g, "'\\''") + "'";
}

const statusColor = (status: number | null) => {
  if (!status) return 'text-text-muted';
  if (status < 300) return 'text-accent';
  if (status < 400) return 'text-blue-400';
  if (status < 500) return 'text-orange-400';
  return 'text-red-400';
};

const methodColor = (method: string) => {
  const colors: Record<string, string> = {
    GET: 'text-blue-400',
    POST: 'text-accent',
    PUT: 'text-yellow-400',
    PATCH: 'text-orange-400',
    DELETE: 'text-red-400',
  };
  return colors[method] || 'text-text-muted';
};

interface RequestDetailProps {
  requestId: string;
  onClose: () => void;
  onSendToRepeater?: (data: { url: string; method: string; headers: string; body: string; originalResponse?: { status: number | null; body: string | null; contentType: string | null } }) => void;
}

export function RequestDetail({ requestId, onClose, onSendToRepeater }: RequestDetailProps) {
  const [record, setRecord] = useState<RequestRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'request' | 'response'>('response');
  const [copied, setCopied] = useState(false);

  useEffect(() => { fetchRequest(requestId).then(setRecord); }, [requestId]);

  const copyCurl = useCallback(() => {
    if (!record) return;
    navigator.clipboard.writeText(buildCurlCommand(record)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [record]);

  const sendToRepeater = useCallback(() => {
    if (!record || !onSendToRepeater) return;
    const headers = parseHeaders(record.request_headers);
    const headersText = Object.entries(headers)
      .filter(([key]) => !SKIP_HEADERS.has(key.toLowerCase()))
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
    const body = record.request_body ? decodeBody(record.request_body) : '';
    onSendToRepeater({
      url: record.url,
      method: record.method,
      headers: headersText,
      body,
      originalResponse: {
        status: record.status,
        body: record.response_body,
        contentType: record.content_type,
      },
    });
  }, [record, onSendToRepeater]);

  if (!record) return <div className="p-4 text-text-muted text-sm">Loading...</div>;

  const requestHeaders = parseHeaders(record.request_headers);
  const responseHeaders = parseHeaders(record.response_headers);

  return (
    <div className="flex flex-col h-full bg-bg-primary md:border-l border-border-subtle">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-subtle">
        <div className="flex items-center gap-2 text-xs font-mono min-w-0">
          <span className={`font-semibold ${methodColor(record.method)}`}>{record.method}</span>
          <span className={`${statusColor(record.status)}`}>{record.status}</span>
          <span className="text-text-secondary truncate">{record.url}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onSendToRepeater && (
            <button onClick={sendToRepeater} className="px-2 py-0.5 text-[11px] rounded-md border border-accent/30 bg-accent/10 text-accent hover:bg-accent/20 transition-colors">
              Repeater
            </button>
          )}
          <button onClick={copyCurl} className="px-2 py-0.5 text-[11px] rounded-md border border-border bg-bg-secondary text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-colors">
            {copied ? 'Copied!' : 'cURL'}
          </button>
          <button onClick={onClose} className="text-text-muted hover:text-text-secondary text-lg px-1.5 transition-colors">&times;</button>
        </div>
      </div>

      {/* Meta */}
      <div className="flex gap-4 px-4 py-1.5 text-[11px] text-text-muted border-b border-border-subtle font-mono">
        <span>{record.duration}ms</span>
        <span>{record.response_size}B</span>
        <span>{record.protocol}</span>
        <span>{new Date(record.timestamp).toLocaleTimeString()}</span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-subtle">
        <button
          onClick={() => setActiveTab('request')}
          className={`px-4 py-2 text-xs transition-all duration-200 ease-bounce ${
            activeTab === 'request'
              ? 'text-text-primary border-b-2 border-accent'
              : 'text-text-muted hover:text-text-secondary border-b-2 border-transparent'
          }`}
        >Request</button>
        <button
          onClick={() => setActiveTab('response')}
          className={`px-4 py-2 text-xs transition-all duration-200 ease-bounce ${
            activeTab === 'response'
              ? 'text-text-primary border-b-2 border-accent'
              : 'text-text-muted hover:text-text-secondary border-b-2 border-transparent'
          }`}
        >Response</button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'request' ? (
          <><HeadersView headers={requestHeaders} /><BodyView body={record.request_body} contentType={null} /></>
        ) : (
          <><HeadersView headers={responseHeaders} /><BodyView body={record.response_body} contentType={record.content_type} /></>
        )}
      </div>
    </div>
  );
}

function HeadersView({ headers }: { headers: Record<string, string> }) {
  return (
    <div className="mb-5">
      <h3 className="text-[10px] font-semibold text-text-muted uppercase tracking-[0.05em] mb-2">Headers</h3>
      <div className="font-mono text-[11px] leading-[1.8]">
        {Object.entries(headers).map(([key, value]) => (
          <div key={key}>
            <span className="text-accent">{key}</span>
            <span className="text-text-muted">: </span>
            <span className="text-text-secondary">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function decodeBody(body: string): string {
  try { return atob(body); } catch { return body; }
}

function BodyView({ body, contentType }: { body: string | null; contentType: string | null }) {
  if (!body) return null;
  let formatted = decodeBody(body);
  if (contentType?.includes('json') || formatted.startsWith('{') || formatted.startsWith('[')) {
    try { formatted = JSON.stringify(JSON.parse(formatted), null, 2); } catch {}
  }
  return (
    <div>
      <h3 className="text-[10px] font-semibold text-text-muted uppercase tracking-[0.05em] mb-2">Body</h3>
      <pre className="font-mono text-[11px] text-text-secondary bg-bg-secondary rounded-md p-3 overflow-auto whitespace-pre-wrap border border-border-subtle">{formatted}</pre>
    </div>
  );
}

function parseHeaders(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}
