'use client';

import { useEffect, useState } from 'react';
import { demoApi, type DemoIntro } from '@/lib/demo';

const DISMISSED_KEY = 'helios.demo.introDismissed';

export default function IntroOverlay() {
  const [intro, setIntro] = useState<DemoIntro | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = typeof window !== 'undefined' && window.sessionStorage.getItem(DISMISSED_KEY) === '1';
    if (dismissed) return;
    demoApi.intro().then((data) => {
      setIntro(data);
      setVisible(true);
    });
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!visible) return;
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        dismiss();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible]);

  function dismiss() {
    setVisible(false);
    try {
      window.sessionStorage.setItem(DISMISSED_KEY, '1');
    } catch {}
  }

  if (!visible || !intro) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="intro-hook"
      onClick={dismiss}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(5, 7, 11, 0.92)',
        backdropFilter: 'blur(14px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        animation: 'fade-in 280ms ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 760,
          width: '100%',
          padding: '3.5rem 3rem',
          border: '1px solid #1a2230',
          background: 'linear-gradient(180deg, #0b1018 0%, #07090d 100%)',
          borderRadius: 10,
          position: 'relative',
          fontFamily: 'var(--prose)',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 10,
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: '#E8A33D',
            marginBottom: '1.5rem',
          }}
        >
          Helios · live demo
        </div>

        <h2
          id="intro-hook"
          style={{
            fontFamily: 'var(--serif)',
            fontWeight: 300,
            fontSize: 'clamp(1.75rem, 3.4vw, 2.6rem)',
            lineHeight: 1.15,
            color: '#f3ece0',
            marginBottom: '1.75rem',
            letterSpacing: '-0.01em',
          }}
        >
          {intro.hook}
        </h2>

        <p
          style={{
            color: '#cfd5df',
            fontSize: 15,
            lineHeight: 1.65,
            marginBottom: '2rem',
            maxWidth: 580,
          }}
        >
          {intro.reference}
        </p>

        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 11,
            color: '#6e7787',
            letterSpacing: '0.1em',
            padding: '0.75rem 1rem',
            borderLeft: '2px solid #E8A33D',
            marginBottom: '2.5rem',
          }}
        >
          {intro.stat_line}
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button
            onClick={dismiss}
            style={{
              background: '#E8A33D',
              color: '#07090d',
              border: 'none',
              padding: '0.85rem 1.5rem',
              borderRadius: 4,
              cursor: 'pointer',
              fontFamily: 'var(--mono)',
              fontSize: 12,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              fontWeight: 500,
            }}
          >
            Begin walkthrough
          </button>
          <button
            onClick={dismiss}
            style={{
              background: 'transparent',
              color: '#6e7787',
              border: '1px solid #1a2230',
              padding: '0.85rem 1.25rem',
              borderRadius: 4,
              cursor: 'pointer',
              fontFamily: 'var(--mono)',
              fontSize: 11,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            {intro.skip_label}
          </button>
          <span style={{ marginLeft: 'auto', fontSize: 10, color: '#3a4452', fontFamily: 'var(--mono)' }}>
            esc / enter to dismiss
          </span>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
