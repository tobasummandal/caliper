'use client';

import { useEffect, useState } from 'react';
import { demoApi, type DemoClosing } from '@/lib/demo';

export default function ClosingCard() {
  const [closing, setClosing] = useState<DemoClosing | null>(null);

  useEffect(() => {
    demoApi.closing().then(setClosing);
  }, []);

  if (!closing) return null;

  return (
    <div
      style={{
        marginTop: '3rem',
        padding: '3rem 2.5rem',
        border: '1px solid #1a2230',
        background: 'linear-gradient(135deg, #0b1018 0%, #07090d 50%, #0c1118 100%)',
        borderRadius: 10,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 240,
          height: 240,
          background: 'radial-gradient(circle, rgba(232, 163, 61, 0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 10,
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          color: '#E8A33D',
          marginBottom: '1.25rem',
        }}
      >
        — closing card
      </div>
      <h3
        style={{
          fontFamily: 'var(--serif)',
          fontWeight: 300,
          fontSize: 'clamp(1.5rem, 2.6vw, 2rem)',
          color: '#f3ece0',
          marginBottom: '1rem',
          letterSpacing: '-0.01em',
        }}
      >
        {closing.headline}
      </h3>
      <p
        style={{
          fontFamily: 'var(--prose)',
          fontSize: 16,
          lineHeight: 1.65,
          color: '#cfd5df',
          maxWidth: 620,
          marginBottom: '2rem',
        }}
      >
        {closing.body}
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        {closing.agents.map((a) => (
          <span
            key={a}
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 10,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              padding: '0.4rem 0.75rem',
              border: '1px solid #1a2230',
              borderRadius: 999,
              color: '#cfd5df',
            }}
          >
            {a}
          </span>
        ))}
      </div>
      <button
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
        {closing.cta}
      </button>
    </div>
  );
}
