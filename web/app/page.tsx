'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import Reveal from '@/components/Reveal';
import { api } from '@/lib/api';

const STEPS = [
  {
    n: '01',
    title: 'Drop in your code.',
    body: 'Paste a Python file or wire up a repo. Helios reads everything in context — imports, call graph, comments, history.',
  },
  {
    n: '02',
    title: 'The Auditor finds silent bugs.',
    body: 'Off-by-one. Unit mismatch. Numerical cancellation. Boundary conditions. The bugs that pass tests and ship to production.',
  },
  {
    n: '03',
    title: 'The Fixer rewrites with intent.',
    body: 'Not just patches — a refactor that names the structure: classes, pure functions, injected dependencies, type hints.',
  },
  {
    n: '04',
    title: 'The Verifier proves the fix.',
    body: 'Synthesizes test inputs from the bug spec, runs original vs. refactor in a sandbox, compares outputs at numerical tolerance.',
  },
  {
    n: '05',
    title: 'The Router suggests hardware.',
    body: 'Hot inner loops get flagged for GPU. Quantum-suitable kernels get marked for the day the hardware exists.',
  },
];

export default function ReviewerHome() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [code, setCode] = useState('');
  const [filename, setFilename] = useState('untitled.py');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startSession(name: string, source: string) {
    if (!source.trim()) {
      setError('source is empty');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const session = await api.createSession(name, source);
      router.push(`/session?id=${encodeURIComponent(session.id)}`);
    } catch (e: any) {
      setError(e?.message || String(e));
      setLoading(false);
    }
  }

  async function onFile(file: File) {
    const text = await file.text();
    setFilename(file.name);
    setCode(text);
    await startSession(file.name, text);
  }

  return (
    <>
      <section className="helios-section" style={{ paddingTop: '8rem', paddingBottom: '4rem', minHeight: 'auto' }}>
        <Reveal>
          <div className="section-tag">— Helios · v0.1</div>
        </Reveal>
        <Reveal delay={1}>
          <h1
            className="helios-h"
            style={{
              marginBottom: '2.5rem',
              fontStyle: 'normal',
              fontWeight: 300,
              maxWidth: 1100,
            }}
          >
            Scientific Python<br />
            is full of <em style={{ fontStyle: 'italic', color: 'var(--sun)' }}>silent bugs</em><br />
            that don&rsquo;t crash.
          </h1>
        </Reveal>
        <Reveal delay={2}>
          <p
            style={{
              fontFamily: 'var(--prose)',
              fontWeight: 300,
              fontSize: 19,
              color: 'var(--fg-muted)',
              maxWidth: 680,
              lineHeight: 1.6,
              letterSpacing: '-0.005em',
              marginBottom: '3rem',
            }}
          >
            A multi-agent system that audits, rewrites, and verifies its own fixes against synthesized tests before showing them to you.
          </p>
        </Reveal>

        <Reveal delay={2}>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link className="helios-btn primary" href="/demo" style={{ textDecoration: 'none' }}>
              ▶ See the demo
            </Link>
            <button className="helios-btn" disabled={loading} onClick={() => fileInputRef.current?.click()}>
              {loading ? '◉ creating session…' : '↑ Drop a .py file'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".py,text/x-python"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
              }}
            />
          </div>
        </Reveal>
      </section>

      <section className="helios-section" style={{ paddingTop: '4rem', paddingBottom: '4rem', minHeight: 'auto' }}>
        <Reveal>
          <div className="section-tag" style={{ marginBottom: '3rem' }}>How it works · five agents</div>
        </Reveal>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={Math.min(3, i + 1) as 1 | 2 | 3}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(80px, 120px) 1fr',
                  gap: '2.5rem',
                  padding: '2.5rem 0',
                  borderTop: i === 0 ? '1px solid var(--line)' : undefined,
                  borderBottom: '1px solid var(--line)',
                  alignItems: 'baseline',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 13,
                    letterSpacing: '0.25em',
                    color: 'var(--dim)',
                  }}
                >
                  {s.n}
                </div>
                <div>
                  <h3
                    style={{
                      fontFamily: 'var(--serif)',
                      fontWeight: 300,
                      fontSize: 'clamp(1.5rem, 3vw, 2.25rem)',
                      lineHeight: 1.15,
                      letterSpacing: '-0.015em',
                      marginBottom: '1rem',
                      color: 'var(--fg)',
                    }}
                  >
                    {s.title}
                  </h3>
                  <p
                    style={{
                      fontFamily: 'var(--prose)',
                      fontSize: 16,
                      lineHeight: 1.65,
                      color: 'var(--fg-muted)',
                      maxWidth: 640,
                    }}
                  >
                    {s.body}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="helios-section" style={{ paddingTop: '4rem', paddingBottom: '8rem', minHeight: 'auto' }}>
        <Reveal>
          <div className="section-tag" style={{ marginBottom: '2rem' }}>— or paste code below</div>
        </Reveal>
        <textarea
          className="code-surface"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="# paste Python here&#10;def your_function(...):&#10;    ..."
          spellCheck={false}
          style={{
            width: '100%',
            maxWidth: 900,
            minHeight: 240,
            padding: '1.25rem 1.5rem',
            color: 'var(--fg)',
            outline: 'none',
            resize: 'vertical',
          }}
        />
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
          <button
            className="helios-btn primary"
            disabled={loading || !code.trim()}
            onClick={() => startSession(filename, code)}
          >
            ▶ Audit pasted code
          </button>
        </div>
        {error && (
          <div className="verdict-banner red" style={{ marginTop: '1.5rem', maxWidth: 900 }}>
            <span>error</span>
            <span className="note">{error}</span>
          </div>
        )}
      </section>
    </>
  );
}
