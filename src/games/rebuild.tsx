// Stop 2: Hackville / Architex. Mash to rebuild the wiped frontend.
import { useEffect, useRef, useState } from 'react';
import type { ControllerProps, GameModule, ScreenProps } from './types';
import { buzz, nameOf, sumTaps, useBroadcast, useWinOnce } from './ui';

const INTRO_MS = 1800;
// final layout (percent of board) and scattered start positions
const NODES = [
  { label: 'Frontend', x: 50, y: 14, sx: 8, sy: 78 },
  { label: 'React Flow', x: 22, y: 42, sx: 82, sy: 84 },
  { label: 'OAuth', x: 78, y: 42, sx: 14, sy: 22 },
  { label: 'FastAPI', x: 50, y: 52, sx: 88, sy: 12 },
  { label: 'GitHub', x: 20, y: 84, sx: 46, sy: 90 },
  { label: 'MongoDB', x: 50, y: 88, sx: 66, sy: 30 },
  { label: 'Gemini', x: 80, y: 84, sx: 30, sy: 56 },
];
const EDGES: [number, number][] = [[0, 1], [0, 2], [0, 3], [3, 4], [3, 5], [3, 6]];
const TILT = [-3, 2, -2, 3, -1, 2, -3];

type Payload = { phase: 'intro' | 'go' | 'done'; boost: boolean; pct: number };

function Screen({ players, taps, setPayload, onWin, accent }: ScreenProps) {
  const [phase, setPhase] = useState<Payload['phase']>('intro');
  const target = Math.max(150, players.length * 18);
  const raw = sumTaps(taps);
  const base = useRef<number | null>(null);
  const boostAt = useRef<number | null>(null);
  const win = useWinOnce(onWin);

  useEffect(() => {
    const t = setTimeout(() => { base.current = sumTaps(tapsRef.current); setPhase('go'); }, INTRO_MS);
    return () => clearTimeout(t);
  }, []);
  const tapsRef = useRef(taps);
  tapsRef.current = taps;

  const counted = phase === 'intro' || base.current === null ? 0 : raw - base.current;
  if (boostAt.current === null && counted >= target / 2) boostAt.current = counted;
  const effective = boostAt.current === null ? counted : boostAt.current + 2 * (counted - boostAt.current);
  const pct = Math.min(1, effective / target);
  const boost = boostAt.current !== null;
  const placed = Math.min(NODES.length, Math.floor(pct * (NODES.length + 0.999)));

  useEffect(() => {
    if (phase === 'go' && pct >= 1) {
      setPhase('done');
      const top = Object.entries(taps).sort((a, b) => b[1] - a[1])[0];
      win({ line: 'Frontend rebuilt.', stats: { taps: raw - (base.current ?? 0), topTaps: top ? top[1] : 0 } });
    }
  }, [pct, phase]);

  useBroadcast(setPayload, { phase, boost, pct: Math.round(pct * 100) } satisfies Payload);

  const top3 = Object.entries(taps).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).slice(0, 3);

  if (phase === 'intro') {
    return (
      <div className="g-wrap">
        <div className="g-panel g-shake" style={{ background: 'var(--teal-ink)', color: 'var(--paper)', justifyContent: 'center', padding: '4cqw' }}>
          <div className="g-mono" style={{ fontSize: '3.4cqw', color: 'var(--lime)' }}>$ git checkout main</div>
          <div className="g-mono" style={{ fontSize: '2.4cqw', color: 'var(--paper-edge)' }}>Your local changes to the frontend have been lost.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="g-wrap">
      <div className="g-panel">
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '2cqw' }}>
          <h2 className="g-title" style={{ color: accent }}>{phase === 'done' ? 'Frontend rebuilt!' : 'Rebuild the frontend. TAP!'}</h2>
          <div className="g-sub">{Math.round(pct * 100)}%</div>
        </div>
        <div className="g-track">
          <div className="g-track-fill" style={{ width: `${pct * 100}%`, backgroundColor: accent }} />
          <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '.3cqw', background: 'var(--paper)' }} />
        </div>
        <div style={{ flex: 1, display: 'flex', gap: '2cqw', minHeight: 0 }}>
          <div style={{ flex: 1, position: 'relative', background: 'var(--paper-warm)', borderRadius: 'var(--radius)', border: '.25cqw dashed var(--paper-edge)' }}>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
              {EDGES.map(([a, b], i) => (a < placed && b < placed ? (
                <line key={i} x1={NODES[a].x} y1={NODES[a].y} x2={NODES[b].x} y2={NODES[b].y}
                  stroke={accent} strokeWidth={0.8} strokeDasharray="2 1.5" vectorEffect="non-scaling-stroke" style={{ strokeWidth: 4 }} />
              ) : null))}
            </svg>
            {NODES.map((n, i) => {
              const on = i < placed;
              return (
                <div key={n.label} style={{
                  position: 'absolute', left: `${on ? n.x : n.sx}%`, top: `${on ? n.y : n.sy}%`,
                  transform: `translate(-50%,-50%) rotate(${on ? 0 : TILT[i] * 4}deg)`,
                  transition: 'left .6s cubic-bezier(.34,1.56,.64,1), top .6s cubic-bezier(.34,1.56,.64,1), transform .6s cubic-bezier(.34,1.56,.64,1), background .3s',
                  background: on ? accent : 'var(--paper-edge)', color: on ? 'var(--white)' : 'var(--muted)',
                  border: '.3cqw solid var(--white)', borderRadius: 'var(--radius)', padding: '.6cqw 1.2cqw',
                  fontWeight: 700, fontSize: '1.7cqw', whiteSpace: 'nowrap',
                  boxShadow: on ? '0 .5cqw 0 rgba(47,22,4,.2)' : 'none', opacity: on ? 1 : 0.75,
                }}>{n.label}</div>
              );
            })}
          </div>
          <div style={{ width: '28%', display: 'flex', flexDirection: 'column', gap: '1cqw' }}>
            {boost && (
              <div className="g-pop paper sticker" style={{ borderRadius: 'var(--radius)', padding: '1cqw', fontWeight: 700, fontSize: '1.8cqw', transform: 'rotate(-2deg)' }}>
                🚀 Alex &amp; Vishnu joined: taps count double
              </div>
            )}
            <div className="g-sub">Top tappers</div>
            {top3.map(([id, n], i) => (
              <div key={id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.9cqw', fontWeight: 700 }}>
                <span>{['🥇', '🥈', '🥉'][i]} {nameOf(players, id)}</span><span>{n}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Controller({ payload, send }: ControllerProps) {
  const p = payload as Payload | null;
  if (!p || p.phase === 'intro') return <div className="g-phone"><h3>Uh oh. Look up.</h3></div>;
  if (p.phase === 'done') return <div className="g-phone"><h3>Frontend rebuilt ✓</h3></div>;
  return (
    <div className="g-phone">
      <h3>{p.boost ? 'Alex & Vishnu joined: 2x!' : 'Mash to rebuild!'}</h3>
      <button className="btn-sunset g-tapbtn" onPointerDown={(e) => { e.preventDefault(); buzz(); send(1); }}>TAP</button>
      <p className="g-note">{p.pct}% rebuilt</p>
    </div>
  );
}

export const rebuild: GameModule = {
  id: 'rebuild',
  inputKind: 'tap',
  Screen,
  Controller,
  simulate: (players, payload) => {
    const p = payload as Payload | null;
    if (!p || p.phase !== 'go') return [];
    return players.filter(() => Math.random() < 0.6).map((pl) => ({ playerId: pl.id, value: 1 + Math.floor(Math.random() * 2) }));
  },
};
