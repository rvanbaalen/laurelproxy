import { useState, useCallback, useEffect } from 'react';
import { replayRequest } from '../client.ts';
import type { ReplayResponse } from '../client.ts';

export interface OriginalResponseData {
  status: number | null;
  body: string | null;
  contentType: string | null;
}

export interface RepeaterTabData {
  id: string;
  name: string;
  request: { url: string; method: string; headers: string; body: string };
  originalResponse: OriginalResponseData | null;
  response: ReplayResponse | null;
  error: string | null;
  loading: boolean;
}

interface RepeaterProps {
  tabs: RepeaterTabData[];
  activeTabId: string | null;
  onTabsChange: (tabs: RepeaterTabData[]) => void;
  onActiveTabChange: (id: string | null) => void;
}

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

let tabCounter = 0;

export function createTab(init?: {
  url: string;
  method: string;
  headers: string;
  body: string;
  originalResponse?: OriginalResponseData;
}): RepeaterTabData {
  tabCounter++;
  let name = `New Request ${tabCounter}`;
  if (init) {
    try { name = new URL(init.url).hostname || name; } catch {}
  }
  return {
    id: crypto.randomUUID(),
    name,
    request: init ? { url: init.url, method: init.method, headers: init.headers, body: init.body } : { url: '', method: 'GET', headers: '', body: '' },
    originalResponse: init?.originalResponse ?? null,
    response: null,
    error: null,
    loading: false,
  };
}

function parseHeadersText(text: string): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx <= 0) continue;
    const key = trimmed.slice(0, colonIdx).trim();
    const value = trimmed.slice(colonIdx + 1).trim();
    headers[key] = value;
  }
  return headers;
}

export function Repeater({ tabs, activeTabId, onTabsChange, onActiveTabChange }: RepeaterProps) {
  const activeTab = tabs.find((t) => t.id === activeTabId) || null;

  const updateTab = useCallback((id: string, updates: Partial<RepeaterTabData>) => {
    onTabsChange(tabs.map((t) => t.id === id ? { ...t, ...updates } : t));
  }, [tabs, onTabsChange]);

  const updateRequest = useCallback((id: string, field: string, value: string) => {
    onTabsChange(tabs.map((t) =>
      t.id === id ? { ...t, request: { ...t.request, [field]: value } } : t
    ));
  }, [tabs, onTabsChange]);

  const closeTab = useCallback((id: string) => {
    const newTabs = tabs.filter((t) => t.id !== id);
    onTabsChange(newTabs);
    if (activeTabId === id) {
      onActiveTabChange(newTabs.length > 0 ? newTabs[0].id : null);
    }
  }, [tabs, activeTabId, onTabsChange, onActiveTabChange]);

  const addTab = useCallback(() => {
    const tab = createTab();
    onTabsChange([...tabs, tab]);
    onActiveTabChange(tab.id);
  }, [tabs, onTabsChange, onActiveTabChange]);

  const sendRequest = useCallback(async () => {
    if (!activeTab || activeTab.loading) return;
    updateTab(activeTab.id, { loading: true, error: null });
    try {
      const headers = parseHeadersText(activeTab.request.headers);
      const body = activeTab.request.body
        ? btoa(activeTab.request.body)
        : undefined;
      const result = await replayRequest({
        url: activeTab.request.url,
        method: activeTab.request.method,
        headers,
        body,
      });
      updateTab(activeTab.id, { response: result, loading: false });
    } catch (err) {
      updateTab(activeTab.id, { error: (err as Error).message, loading: false });
    }
  }, [activeTab, updateTab]);

  // Cmd/Ctrl+Enter to send
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        sendRequest();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [sendRequest]);

  if (tabs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-text-muted">
        <p className="mb-4 text-sm">No repeater tabs open</p>
        <button onClick={addTab} className="px-4 py-2 rounded-md border border-accent/30 bg-accent/10 text-accent hover:bg-accent/20 text-sm transition-all duration-200 ease-bounce">
          New Request
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center border-b border-border-subtle bg-bg-primary overflow-x-auto">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`flex items-center gap-1 px-3 py-2 text-xs cursor-pointer border-r border-border-subtle shrink-0 transition-all duration-200 ease-bounce ${
              tab.id === activeTabId
                ? 'bg-bg-secondary text-text-primary border-b-2 border-b-accent'
                : 'text-text-muted hover:text-text-secondary'
            }`}
            onClick={() => onActiveTabChange(tab.id)}
          >
            <span className="truncate max-w-32">{tab.name}</span>
            <button
              onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
              className="text-text-muted hover:text-text-secondary ml-1 transition-all duration-200 ease-bounce"
            >&times;</button>
          </div>
        ))}
        <button onClick={addTab} className="px-3 py-2 text-text-muted hover:text-text-secondary text-xs shrink-0 transition-all duration-200 ease-bounce">+</button>
      </div>

      {/* Split pane */}
      {activeTab && (
        <div className="flex flex-1 overflow-hidden">
          {/* Request editor */}
          <div className="flex flex-col w-1/2 border-r border-border-subtle overflow-auto">
            <div className="flex gap-2 p-3 border-b border-border-subtle">
              <select
                value={activeTab.request.method}
                onChange={(e) => updateRequest(activeTab.id, 'method', e.target.value)}
                className="bg-bg-secondary text-text-primary px-2 py-1.5 rounded-md text-xs border border-border font-mono"
              >
                {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <input
                type="text"
                value={activeTab.request.url}
                onChange={(e) => updateRequest(activeTab.id, 'url', e.target.value)}
                placeholder="https://example.com/api/endpoint"
                className="flex-1 bg-bg-secondary text-text-primary px-3 py-1.5 rounded-md text-xs border border-border font-mono min-w-0"
              />
              <button
                onClick={sendRequest}
                disabled={activeTab.loading || !activeTab.request.url}
                className="px-4 py-1.5 rounded-md border border-accent/30 bg-accent/10 text-accent hover:bg-accent/20 disabled:border-border disabled:bg-bg-secondary disabled:text-text-muted text-xs font-medium shrink-0 transition-all duration-200 ease-bounce"
              >
                {activeTab.loading ? 'Sending...' : 'Send'}
              </button>
            </div>
            <div className="flex flex-col flex-1 p-3 gap-3">
              <div className="flex flex-col flex-1 min-h-0">
                <label className="text-[10px] font-semibold text-text-muted uppercase tracking-[0.05em] mb-1">Headers</label>
                <textarea
                  value={activeTab.request.headers}
                  onChange={(e) => updateRequest(activeTab.id, 'headers', e.target.value)}
                  placeholder={"Content-Type: application/json\nAuthorization: Bearer token"}
                  className="flex-1 bg-bg-primary text-text-secondary font-mono text-[11px] p-3 rounded-md border border-border-subtle resize-none focus:border-accent/40 focus:outline-none transition-all duration-200 ease-bounce"
                />
              </div>
              <div className="flex flex-col flex-1 min-h-0">
                <label className="text-[10px] font-semibold text-text-muted uppercase tracking-[0.05em] mb-1">Body</label>
                <textarea
                  value={activeTab.request.body}
                  onChange={(e) => updateRequest(activeTab.id, 'body', e.target.value)}
                  placeholder='{"key": "value"}'
                  className="flex-1 bg-bg-primary text-text-secondary font-mono text-[11px] p-3 rounded-md border border-border-subtle resize-none focus:border-accent/40 focus:outline-none transition-all duration-200 ease-bounce"
                />
              </div>
            </div>
          </div>

          {/* Response viewer */}
          <div className="flex flex-col w-1/2 overflow-auto">
            {activeTab.loading && (
              <div className="flex items-center justify-center h-full text-text-muted text-sm">
                Sending request...
              </div>
            )}
            {activeTab.error && !activeTab.loading && (
              <div className="flex items-center justify-center h-full text-red-400 p-4 text-center text-sm">
                {activeTab.error}
              </div>
            )}
            {activeTab.response && !activeTab.loading && (
              <ResponseView response={activeTab.response} originalResponse={activeTab.originalResponse} />
            )}
            {!activeTab.response && !activeTab.loading && !activeTab.error && (
              <div className="flex items-center justify-center h-full text-text-muted text-sm">
                Send a request to see the response
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function classifyDiffResult(origStatus: number | null, replayStatus: number): string {
  if (origStatus === replayStatus) return 'unchanged';
  const origError = origStatus != null && origStatus >= 400;
  const replayError = replayStatus >= 400;
  if (origError && !replayError) return 'improved';
  if (!origError && replayError) return 'regressed';
  return 'changed';
}

const diffResultStyles: Record<string, { label: string; color: string }> = {
  improved: { label: 'IMPROVED', color: 'text-accent' },
  regressed: { label: 'REGRESSED', color: 'text-red-400' },
  changed: { label: 'CHANGED', color: 'text-yellow-400' },
  unchanged: { label: 'UNCHANGED', color: 'text-text-muted' },
};

const statusColorFn = (status: number) => {
  if (status < 300) return 'text-accent';
  if (status < 400) return 'text-blue-400';
  if (status < 500) return 'text-orange-400';
  return 'text-red-400';
};

function ResponseView({ response, originalResponse }: { response: ReplayResponse; originalResponse: OriginalResponseData | null }) {
  const sColor = statusColorFn(response.status);
  const diffResult = originalResponse ? classifyDiffResult(originalResponse.status, response.status) : null;
  const diffStyle = diffResult ? diffResultStyles[diffResult] : null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-4 px-3 py-2 text-[11px] text-text-muted border-b border-border-subtle font-mono">
        <span className={`font-bold ${sColor}`}>{response.status}</span>
        <span>{response.duration}ms</span>
        <span>{response.size}B</span>
        {diffStyle && (
          <span className={`font-bold ${diffStyle.color}`}>{diffStyle.label}</span>
        )}
      </div>

      {/* Diff section */}
      {originalResponse && (
        <div className="px-3 py-2 border-b border-border-subtle bg-bg-secondary">
          <h3 className="text-[10px] font-semibold text-text-muted uppercase tracking-[0.05em] mb-2">Diff vs. Original</h3>
          <div className="font-mono text-[11px] space-y-1">
            <div>
              <span className="text-text-muted">status: </span>
              {originalResponse.status !== response.status ? (
                <>
                  <span className="text-red-400">{originalResponse.status ?? '?'}</span>
                  <span className="text-text-muted"> → </span>
                  <span className={sColor}>{response.status}</span>
                  <span className="text-yellow-400 ml-2">[CHANGED]</span>
                </>
              ) : (
                <>
                  <span className={sColor}>{response.status}</span>
                  <span className="text-text-muted ml-2">[unchanged]</span>
                </>
              )}
            </div>
            <div>
              <span className="text-text-muted">body: </span>
              {(() => {
                const origBody = originalResponse.body ? formatResponseBody(originalResponse.body) : '';
                const replayBody = formatResponseBody(response.body);
                return origBody !== replayBody
                  ? <span className="text-yellow-400">[CHANGED]</span>
                  : <span className="text-text-muted">[unchanged]</span>;
              })()}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto p-3">
        <div className="mb-5">
          <h3 className="text-[10px] font-semibold text-text-muted uppercase tracking-[0.05em] mb-2">Headers</h3>
          <div className="font-mono text-[11px] leading-[1.8]">
            {Object.entries(response.headers).map(([key, value]) => {
              const vals = Array.isArray(value) ? value : [value];
              return vals.map((v, i) => (
                <div key={`${key}-${i}`}>
                  <span className="text-accent">{key}</span>
                  <span className="text-text-muted">: </span>
                  <span className="text-text-secondary">{v}</span>
                </div>
              ));
            })}
          </div>
        </div>
        <div>
          <h3 className="text-[10px] font-semibold text-text-muted uppercase tracking-[0.05em] mb-2">Body</h3>
          <pre className="font-mono text-[11px] text-text-secondary bg-bg-primary rounded-md p-3 overflow-auto whitespace-pre-wrap border border-border-subtle">
            {formatResponseBody(response.body)}
          </pre>
        </div>
      </div>
    </div>
  );
}

function formatResponseBody(base64Body: string): string {
  try {
    const raw = atob(base64Body);
    try { return JSON.stringify(JSON.parse(raw), null, 2); } catch {}
    return raw;
  } catch {
    return base64Body;
  }
}
