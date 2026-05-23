'use client';

import { useEffect, useState } from 'react';
import DiffView from '@/components/DiffView';
import { demoApi, type DemoFixAttempts } from '@/lib/demo';

type Props = {
  original: string;
};

export default function BadFixSideBySide({ original }: Props) {
  const [attempts, setAttempts] = useState<DemoFixAttempts | null>(null);

  useEffect(() => {
    demoApi.fixAttempts().then(setAttempts);
  }, []);

  if (!attempts) return null;
  const [v1, v2] = attempts.attempts;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div
        style={{
          fontFamily: 'var(--prose)',
          fontSize: 13,
          color: '#cfd5df',
          padding: '0.85rem 1rem',
          borderLeft: '2px solid #E8A33D',
          background: 'rgba(232, 163, 61, 0.05)',
        }}
      >
        <strong style={{ color: '#E8A33D', letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: 10, fontFamily: 'var(--mono)', display: 'block', marginBottom: '0.4rem' }}>
          Verifier summary
        </strong>
        {attempts.verifier_summary}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1rem',
          alignItems: 'start',
        }}
      >
        <AttemptColumn label="Attempt 1" verdict="rejected" detail={v1.verifier_notes ?? ''}>
          <DiffView original={original} fixed={v1.fixed_code} summary={v1.diff_summary} context={2} />
        </AttemptColumn>
        <AttemptColumn label="Attempt 2" verdict="accepted" detail="12/12 cases agree at rtol=1e-9. Verifier accepted.">
          <DiffView original={original} fixed={v2.fixed_code} summary={v2.diff_summary} context={2} />
        </AttemptColumn>
      </div>
    </div>
  );
}

function AttemptColumn({
  label,
  verdict,
  detail,
  children,
}: {
  label: string;
  verdict: 'rejected' | 'accepted';
  detail: string;
  children: React.ReactNode;
}) {
  const rejected = verdict === 'rejected';
  const accent = rejected ? '#9c8378' : '#E8A33D';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.4rem 0.6rem',
          border: `1px solid ${accent}55`,
          background: `${accent}0d`,
          borderRadius: 4,
          fontFamily: 'var(--mono)',
          fontSize: 10,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
        }}
      >
        <span style={{ color: accent }}>{label} · {verdict}</span>
        <span style={{ color: accent }}>{rejected ? '✗' : '✓'}</span>
      </div>
      {children}
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 11,
          color: '#6e7787',
          padding: '0.4rem 0.6rem',
          borderLeft: `2px solid ${accent}`,
        }}
      >
        {detail}
      </div>
    </div>
  );
}
