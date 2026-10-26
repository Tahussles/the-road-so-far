// Shared helpers for the games. No network code here.
import { useEffect, useRef, useState } from 'react';
import type { ScreenProps } from './types';
import './games.css';

export function buzz() {
  try { navigator.vibrate?.(15); } catch { /* not supported */ }
}

// Broadcast payload on change and re-send every second, so phones that join late
// (or a shell that clears payload on mount) still get the current state.
export function useBroadcast(setPayload: ScreenProps['setPayload'], payload: unknown) {
  const ref = useRef(payload);
  ref.current = payload;
  const json = JSON.stringify(payload);
  useEffect(() => { setPayload(ref.current); }, [json]);
  useEffect(() => {
    const iv = setInterval(() => setPayload(ref.current), 1000);
    return () => clearInterval(iv);
  }, []);
}

// Calls onWin at most once, always with the latest callback.
export function useWinOnce(onWin: ScreenProps['onWin']) {
  const cb = useRef(onWin);
  cb.current = onWin;
  const done = useRef(false);
  return (s: Parameters<ScreenProps['onWin']>[0]) => {
    if (done.current) return;
    done.current = true;
    cb.current(s);
  };
}

export function useLatest<T>(v: T) {
  const r = useRef(v);
  r.current = v;
  return r;
}

// Ticks every 100 ms so countdown bars animate.
export function useNow(active = true) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const iv = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(iv);
  }, [active]);
  return now;
}

export function tally(votes: Record<string, number>, n: number) {
  const counts = Array.from({ length: n }, () => 0);
  Object.values(votes).forEach((v) => { if (v >= 0 && v < n) counts[v]++; });
  return counts;
}

export function plurality(counts: number[], fallback: number) {
  let best = -1, bi = fallback;
  counts.forEach((c, i) => { if (c > best && c > 0) { best = c; bi = i; } });
  return bi;
}

export function sumTaps(taps: Record<string, number>) {
  return Object.values(taps).reduce((a, b) => a + b, 0);
}

export function nameOf(players: { id: string; name: string; emoji: string }[], id: string) {
  const p = players.find((x) => x.id === id);
  return p ? `${p.emoji} ${p.name}` : id === 'me' ? '😎 You' : 'Someone';
}

export function Timer({ start, ms, accent }: { start: number; ms: number; accent: string }) {
  const now = useNow();
  const left = Math.max(0, 1 - (now - start) / ms);
  return <div className="g-timer"><div style={{ width: `${left * 100}%`, background: accent }} /></div>;
}

// Vote payload shared by stack and priya.
export type VotePayload = {
  phase: 'vote' | 'wait';
  round: number;
  question: string;
  options: string[];
  glow: number | null;
  note?: string;
};

export function VoteController({ payload, send }: { payload: unknown; send: (v: number) => void }) {
  const p = payload as VotePayload | null;
  const [picked, setPicked] = useState<{ round: number; i: number } | null>(null);
  if (!p) return <p className="g-note">Look up at the screen</p>;
  const mine = picked && picked.round === p.round ? picked.i : null;
  if (p.phase !== 'vote') {
    return (
      <div className="g-phone">
        <h3>{p.note ?? 'Look up at the screen'}</h3>
        {mine !== null && <p className="g-note">You picked: {p.options[mine]}</p>}
      </div>
    );
  }
  return (
    <div className="g-phone">
      <h3>{p.question}</h3>
      {p.options.map((o, i) => (
        <button
          key={o + i}
          className={`btn-sunset g-opt ${mine === i ? 'picked' : ''} ${mine !== null && mine !== i ? 'dim' : ''} ${p.glow === i ? 'g-glow' : ''}`}
          onClick={() => { buzz(); setPicked({ round: p.round, i }); send(i); }}
        >
          {p.glow === i ? '⭐ ' : ''}{o}
        </button>
      ))}
      {p.glow !== null && <p className="g-note">The mentors point at the glowing one</p>}
    </div>
  );
}

export function VoteStrips({ options, counts, accent, glow, winner }: {
  options: string[]; counts: number[]; accent: string; glow?: number | null; winner?: number | null;
}) {
  const total = counts.reduce((a, b) => a + b, 0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1cqw' }}>
      {options.map((o, i) => (
        <div key={o + i} className={`g-strip ${glow === i ? 'g-glow' : ''}`} style={winner === i ? { outline: `.35cqw solid ${accent}` } : undefined}>
          <div className="g-strip-fill" style={{ width: `${total ? (counts[i] / total) * 100 : 0}%`, background: accent }} />
          <div className="g-strip-label"><span>{glow === i ? '⭐ ' : ''}{o}</span><span>{counts[i]}</span></div>
        </div>
      ))}
    </div>
  );
}
