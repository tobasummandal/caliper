'use client';

import { useEffect, useRef, useState } from 'react';

export type AgentName = 'auditor' | 'fixer' | 'verifier' | 'router';
export type ActivityLevel = 'info' | 'ok' | 'warn' | 'fail';

export type AgentEvent = {
  index: number;
  ts: string;
  agent: AgentName;
  level: ActivityLevel;
  message: string;
};

// Monochrome-leaning palette: amber is the only chromatic accent (auditor —
// the entry-point agent). Other agents differentiate via cream / dim grays.
const AGENT_COLOR: Record<AgentName, string> = {
  auditor: '#E8A33D',
  fixer: '#f0ece4',
  verifier: '#b8b3a8',
  router: '#6c6c6c',
};

const LEVEL_GLYPH: Record<ActivityLevel, string> = {
  info: '·',
  ok: '✓',
  warn: '!',
  fail: '✗',
};

const LEVEL_COLOR: Record<ActivityLevel, string> = {
  info: '#6c6c6c',
  ok: '#f0ece4',
  warn: '#E8A33D',
  fail: '#9c8378',
};

export default function AgentActivityPanel({ autoStart = true }: { autoStart?: boolean }) {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [streaming, setStreaming] = useState(false);
  const started = useRef(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  function start() {
    if (started.current) return;
    started.current = true;
    setEvents([]);
    setStreaming(true);
    const es = new EventSource('/api/demo/agent_activity/stream');
    es.addEventListener('activity', (e: MessageEvent) => {
      const d = JSON.parse(e.data) as AgentEvent;
      setEvents((cur) => [...cur, d]);
    });
    es.addEventListener('end', () => {
      es.close();
      setStreaming(false);
    });
    es.onerror = () => {
      es.close();
      setStreaming(false);
    };
  }

  function restart() {
    started.current = false;
    start();
  }

  useEffect(() => {
    if (autoStart) start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  return (
    <aside
      aria-label="Agent activity"
      style={{
        position: 'sticky',
        top: '6rem',
        background: '#05070b',
        border: '1px solid #1a2230',
        borderRadius: 8,
        padding: '0.75rem',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 420,
        maxHeight: 'calc(100vh - 8rem)',
        overflow: 'hidden',
        fontFamily: 'var(--mono)',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.25rem 0.5rem 0.75rem',
          borderBottom: '1px solid #1a2230',
          marginBottom: '0.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: streaming ? '#7FE0E0' : '#6e7787',
              boxShadow: streaming ? '0 0 8px #7FE0E0' : undefined,
              animation: streaming ? 'pulse 1.4s ease-in-out infinite' : undefined,
            }}
          />
          <span
            style={{
              fontSize: 10,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#6e7787',
            }}
          >
            agent activity
          </span>
        </div>
        <button
          onClick={restart}
          style={{
            background: 'transparent',
            border: '1px solid #1a2230',
            color: '#6e7787',
            fontSize: 10,
            letterSpacing: '0.12em',
            padding: '0.2rem 0.55rem',
            borderRadius: 4,
            cursor: 'pointer',
            fontFamily: 'var(--mono)',
            textTransform: 'uppercase',
          }}
          title="Replay agent stream"
        >
          ↻ replay
        </button>
      </header>

      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          fontSize: 11.5,
          lineHeight: 1.55,
          paddingRight: '0.25rem',
        }}
      >
        {events.length === 0 && (
          <div style={{ color: '#6e7787', fontStyle: 'italic', padding: '0.5rem' }}>
            waiting for agents…
          </div>
        )}
        {events.map((ev) => (
          <div
            key={ev.index}
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto auto 1fr',
              gap: '0.5rem',
              padding: '0.18rem 0.4rem',
              borderLeft: `2px solid ${AGENT_COLOR[ev.agent]}`,
              marginBottom: 2,
            }}
          >
            <span style={{ color: '#3a4452', whiteSpace: 'nowrap' }}>[{ev.ts}]</span>
            <span
              style={{
                color: AGENT_COLOR[ev.agent],
                textTransform: 'lowercase',
                fontWeight: 500,
                whiteSpace: 'nowrap',
              }}
            >
              {ev.agent}
            </span>
            <span style={{ color: '#cfd5df' }}>
              <span style={{ color: LEVEL_COLOR[ev.level], marginRight: '0.4rem' }}>
                {LEVEL_GLYPH[ev.level]}
              </span>
              {ev.message}
            </span>
          </div>
        ))}
      </div>

      <footer
        style={{
          display: 'flex',
          gap: '0.75rem',
          fontSize: 9,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: '#6e7787',
          paddingTop: '0.5rem',
          marginTop: '0.5rem',
          borderTop: '1px solid #1a2230',
          flexWrap: 'wrap',
        }}
      >
        {(['auditor', 'fixer', 'verifier', 'router'] as AgentName[]).map((a) => (
          <span key={a} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span
              style={{
                width: 6,
                height: 6,
                background: AGENT_COLOR[a],
                display: 'inline-block',
                borderRadius: 1,
              }}
            />
            {a}
          </span>
        ))}
      </footer>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
      `}</style>
    </aside>
  );
}
