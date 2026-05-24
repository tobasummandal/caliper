'use client';

import { useEffect, useMemo, useState } from 'react';
import CodeEditor from '@/components/CodeEditor';
import DiffView from '@/components/DiffView';
import IssueList from '@/components/IssueList';
import Reveal from '@/components/Reveal';
import AgentActivityPanel from '@/components/demo/AgentActivityPanel';
import BadFixSideBySide from '@/components/demo/BadFixSideBySide';
import ClosingCard from '@/components/demo/ClosingCard';
import IntroOverlay from '@/components/demo/IntroOverlay';
import QuestionCard from '@/components/demo/QuestionCard';
import ReasoningTracePanel from '@/components/demo/ReasoningTracePanel';
import RefactorAnnotations from '@/components/demo/RefactorAnnotations';
import RouteThreeColumn from '@/components/demo/RouteThreeColumn';
import VerifyStream from '@/components/demo/VerifyStream';
import { demoApi } from '@/lib/demo';
import type {
  DemoFix,
  DemoIssue,
  DemoQuestion,
  DemoRoute,
  DemoSession,
  DemoTrace,
} from '@/lib/demo';
import type { Issue } from '@/lib/types';

type Act = 'audit' | 'trace' | 'refactor' | 'verify' | 'question' | 'route';

const ACTS: { key: Act; n: string; label: string; subtitle: string }[] = [
  { key: 'audit',    n: '01', label: 'Audit',           subtitle: 'silent bugs, twelve seconds' },
  { key: 'trace',    n: '02', label: 'Reasoning trace', subtitle: 'the moat, made tangible' },
  { key: 'refactor', n: '03', label: 'Refactor + fix',  subtitle: 'research → production' },
  { key: 'route',    n: '04', label: 'Route',           subtitle: 'GPU today, quantum tomorrow' },
  { key: 'verify',   n: '05', label: 'Verify',          subtitle: 'rejects bad fix, regenerates, agrees 12/12' },
  { key: 'question', n: '06', label: 'Researcher loop', subtitle: 'Helios has a question' },
];

function toIssue(d: DemoIssue): Issue {
  return d as unknown as Issue;
}

export default function DemoPage() {
  const [act, setAct] = useState<Act>('audit');
  const [session, setSession] = useState<DemoSession | null>(null);
  const [issues, setIssues] = useState<DemoIssue[]>([]);
  const [selected, setSelected] = useState<DemoIssue | null>(null);
  const [trace, setTrace] = useState<DemoTrace | null>(null);
  const [fix, setFix] = useState<DemoFix | null>(null);
  const [question, setQuestion] = useState<DemoQuestion | null>(null);
  const [route, setRoute] = useState<DemoRoute | null>(null);

  // Boot: create session + run audit immediately so the audit pane is full on land.
  useEffect(() => {
    (async () => {
      const s = await demoApi.createSession();
      setSession(s);
      const a = await demoApi.audit();
      setIssues(a);
      setSelected(a[0] ?? null);
    })();
  }, []);

  // Lazy-load remaining acts as user clicks through.
  useEffect(() => {
    if (act === 'trace' && !trace && selected) demoApi.trace(selected.id).then(setTrace);
    if (act === 'refactor' && !fix) demoApi.fix().then(setFix);
    if (act === 'question' && !question) demoApi.question().then(setQuestion);
    if (act === 'route' && !route) demoApi.route().then(setRoute);
  }, [act, selected, trace, fix, question, route]);

  // Keyboard: j/k step through acts, 1-6 jump.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement)?.tagName?.match(/INPUT|TEXTAREA|BUTTON/)) return;
      const idx = ACTS.findIndex((a) => a.key === act);
      if (e.key === 'j' || e.key === 'ArrowRight') setAct(ACTS[Math.min(ACTS.length - 1, idx + 1)].key);
      if (e.key === 'k' || e.key === 'ArrowLeft') setAct(ACTS[Math.max(0, idx - 1)].key);
      if (e.key >= '1' && e.key <= '6') setAct(ACTS[parseInt(e.key, 10) - 1].key);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [act]);

  const highlightLines = useMemo(() => issues.map((i) => i.line_start), [issues]);
  const sourceCode = session?.source_code || '';

  const current = ACTS.find((a) => a.key === act)!;

  return (
    <section className="helios-section" style={{ paddingTop: '6rem', paddingBottom: '4rem' }}>
      <IntroOverlay />

      {/* Editorial header */}
      <Reveal>
        <div className="section-tag" style={{ marginBottom: '1.5rem' }}>— live demo · mc_2deg_thermo_init.py</div>
      </Reveal>
      <Reveal delay={1}>
        <h1
          style={{
            fontFamily: 'var(--prose)',
            fontWeight: 300,
            fontSize: 'clamp(2.5rem, 5vw, 4rem)',
            lineHeight: 1.05,
            letterSpacing: '-0.025em',
            color: 'var(--fg)',
            marginBottom: '1rem',
            maxWidth: 980,
          }}
        >
          Watch the agents work.
        </h1>
      </Reveal>
      <Reveal delay={2}>
        <p
          style={{
            fontFamily: 'var(--prose)',
            fontSize: 15,
            color: 'var(--fg-muted)',
            maxWidth: 620,
            lineHeight: 1.6,
            marginBottom: '0.75rem',
          }}
        >
          A Monte Carlo simulation of a 2D electron gas. Seven silent bugs in
          196 lines. Helios catches them, rewrites the file, and proves the
          fix on synthesized tests.
        </p>
      </Reveal>
      <Reveal delay={2}>
        <p
          style={{
            fontFamily: 'var(--prose)',
            fontStyle: 'italic',
            fontSize: 13,
            color: 'var(--sun)',
            letterSpacing: '0.005em',
            marginBottom: '3rem',
          }}
        >
          This bug would have made it into a published paper.
        </p>
      </Reveal>

      {/* Numbered act selector — litmus-inspired step row */}
      <div
        role="tablist"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          borderTop: '1px solid var(--line)',
          borderBottom: '1px solid var(--line)',
          marginBottom: '3rem',
        }}
      >
        {ACTS.map((a, i) => {
          const active = act === a.key;
          return (
            <button
              key={a.key}
              role="tab"
              aria-selected={active}
              onClick={() => setAct(a.key)}
              title={a.subtitle}
              style={{
                background: active ? 'var(--bg-1)' : 'transparent',
                border: 'none',
                borderLeft: i === 0 ? 'none' : '1px solid var(--line)',
                color: active ? 'var(--fg)' : 'var(--dim)',
                textAlign: 'left',
                padding: '1.25rem 1.25rem',
                cursor: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
                position: 'relative',
                transition: 'background 0.2s ease, color 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (!active) (e.currentTarget as HTMLButtonElement).style.color = 'var(--fg)';
              }}
              onMouseLeave={(e) => {
                if (!active) (e.currentTarget as HTMLButtonElement).style.color = 'var(--dim)';
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 10,
                  letterSpacing: '0.25em',
                  color: active ? 'var(--sun)' : 'var(--dimmer)',
                }}
              >
                {a.n}
              </span>
              <span
                style={{
                  fontFamily: 'var(--prose)',
                  fontSize: 14,
                  fontWeight: 400,
                  letterSpacing: '-0.005em',
                }}
              >
                {a.label}
              </span>
              {active && (
                <span
                  style={{
                    position: 'absolute',
                    top: -1,
                    left: 0,
                    right: 0,
                    height: 1,
                    background: 'var(--sun)',
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Current-act header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 10,
            letterSpacing: '0.28em',
            color: 'var(--sun)',
            marginBottom: '0.5rem',
            textTransform: 'uppercase',
          }}
        >
          {current.n} / 06
        </div>
        <h2
          style={{
            fontFamily: 'var(--prose)',
            fontWeight: 300,
            fontSize: 'clamp(1.75rem, 3.4vw, 2.5rem)',
            letterSpacing: '-0.02em',
            color: 'var(--fg)',
            marginBottom: '0.4rem',
          }}
        >
          {current.label}.
        </h2>
        <p style={{ fontFamily: 'var(--prose)', fontSize: 14, color: 'var(--fg-muted)' }}>
          {current.subtitle}
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 320px',
          gap: '1.5rem',
          alignItems: 'start',
        }}
      >
        <div style={{ minWidth: 0 }}>

      {act === 'audit' && (
        <SplitPane
          left={<CodeEditor value={sourceCode} readOnly height={620} highlightLines={highlightLines} />}
          right={
            <>
              <div className="section-tag" style={{ marginBottom: '0.75rem' }}>Issues found · {issues.length}</div>
              <div style={{ maxHeight: 620, overflowY: 'auto', paddingRight: '0.5rem' }}>
                <IssueList
                  issues={issues.map(toIssue)}
                  selectedId={selected?.id}
                  onSelect={(i) => setSelected(issues.find((x) => x.id === i.id) || null)}
                  onGenerateFix={(i) => {
                    setSelected(issues.find((x) => x.id === i.id) || null);
                    setAct('trace');
                  }}
                />
              </div>
              <div style={{ marginTop: '1rem', fontSize: 12, color: 'var(--dim)', fontStyle: 'italic' }}>
                Two are silent bugs that would have shipped to production. Three are why production
                engineers reject this code on first review. One is a hardware opportunity.
              </div>
            </>
          }
        />
      )}

      {act === 'trace' && (
        <SplitPane
          left={<CodeEditor value={sourceCode} readOnly height={620} highlightLines={selected ? [selected.line_start] : []} />}
          right={
            <>
              <div className="section-tag" style={{ marginBottom: '0.75rem' }}>
                Reasoning trace · {selected?.title ?? '—'}
              </div>
              <ReasoningTracePanel trace={trace} />
              <div style={{ marginTop: '1.25rem' }}>
                <button className="helios-btn primary" onClick={() => setAct('refactor')}>
                  → Generate fix
                </button>
              </div>
            </>
          }
        />
      )}

      {act === 'refactor' && (
        <SplitPane
          left={fix ? <DiffView original={sourceCode} fixed={fix.fixed_code} summary={fix.diff_summary} context={3} /> : <Loading />}
          right={
            <>
              <div className="section-tag" style={{ marginBottom: '0.75rem' }}>Refactor · annotations</div>
              {fix ? <RefactorAnnotations fix={fix} /> : <Loading />}
              <div style={{ marginTop: '1.25rem' }}>
                <button className="helios-btn primary" onClick={() => setAct('route')}>
                  → Hardware routing
                </button>
              </div>
            </>
          }
        />
      )}

      {act === 'verify' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="section-tag">Verify · two attempts, side by side</div>
          <BadFixSideBySide original={sourceCode} />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: '1rem',
              paddingTop: '0.5rem',
              borderTop: '1px solid var(--line)',
            }}
          >
            <div className="section-tag">Sandboxed run · live</div>
            <VerifyStream />
          </div>
          <div>
            <button className="helios-btn primary" onClick={() => setAct('question')}>
              → Researcher loop
            </button>
          </div>
        </div>
      )}

      {act === 'question' && (
        <SplitPane
          left={fix ? <DiffView original={sourceCode} fixed={fix.fixed_code} summary={fix.diff_summary} context={3} /> : <Loading />}
          right={
            <>
              <div className="section-tag" style={{ marginBottom: '0.75rem' }}>Researcher in the loop</div>
              {question ? <QuestionCard question={question} /> : <Loading />}
            </>
          }
        />
      )}

      {act === 'route' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="section-tag">Hardware routing — recommendations</div>
          {route ? <RouteThreeColumn route={route} /> : <Loading />}
          <div>
            <button className="helios-btn primary" onClick={() => setAct('verify')}>
              ✓ Verify
            </button>
          </div>
        </div>
      )}

        </div>
        <AgentActivityPanel />
      </div>

      <ClosingCard />
    </section>
  );
}

function SplitPane({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.05fr) minmax(0, 1fr)', gap: '2rem' }}>
      <div>{left}</div>
      <div>{right}</div>
    </div>
  );
}

function Loading() {
  return (
    <div className="helios-card" style={{ color: 'var(--dim)', fontSize: 13 }}>
      <span className="stage-dot active" /> loading…
    </div>
  );
}
